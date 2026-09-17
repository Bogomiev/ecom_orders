#!/bin/bash
# Автодеплой lk_ecom_orders: сверяет текущий HEAD с origin, и если появились
# новые коммиты — подтягивает их и пересобирает контейнеры.
#
# Запускается из cron раз в час (см. `make autodeploy` / `make autodeploy-off`
# в Makefile проекта). Если изменений нет — скрипт молча завершается и ничего
# не пишет в лог. Весь stdout/stderr перенаправляется cron'ом в deploy.log,
# поэтому здесь достаточно обычного echo.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

ts() { date '+%Y-%m-%d %H:%M:%S'; }

# cron запускает этот скрипт от root (см. `make autodeploy` — задача ставится
# в root-crontab), поэтому git создаёт/перезаписывает объекты .git и файлы
# рабочего дерева от имени root. Без этого человек, который потом вручную
# выполняет `make update` / `make branch-dev` / `make branch-master` от своего
# пользователя, упирается в "insufficient permission for adding an object to
# repository database" — новый пользователь не может писать в root-owned
# .git/objects. Запоминаем исходного владельца каталога проекта и возвращаем
# его после каждой git-операции, которая могла что-то записать от root.
OWNER="$(stat -c '%U:%G' "$PROJECT_DIR")"
restore_ownership() {
    if [ "$OWNER" != "root:root" ]; then
        chown -R "$OWNER" "$PROJECT_DIR" 2>/dev/null || true
    fi
}

# Эти пути выполняются/интерпретируются на хосте от root (Makefile и
# Dockerfile — через `make build`, docker-compose.yml — конфиг для docker,
# nginx/ — конфиги, scripts/ — этот же автодеплой). Если недоброжелатель
# протолкнёт в отслеживаемую ветку коммит, меняющий что-то из этого списка,
# автодеплой НЕ должен молча применить и выполнить его от root без участия
# человека — поэтому такие изменения останавливают автодеплой и требуют
# ручной проверки через `make update`.
SENSITIVE_PATHS_RE='^(Makefile|Dockerfile|docker-compose\.yml|nginx/|scripts/)'

BRANCH=$(git rev-parse --abbrev-ref HEAD)
git fetch origin "$BRANCH" --quiet
restore_ownership

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
    # Изменений нет — ничего не делаем и не логируем.
    exit 0
fi

SENSITIVE_CHANGED=$(git diff --name-only "$LOCAL" "$REMOTE" | grep -E "$SENSITIVE_PATHS_RE" || true)
if [ -n "$SENSITIVE_CHANGED" ]; then
    echo "[$(ts)] СТОП: origin/$BRANCH меняет файлы деплоя, которые выполняются от root — автодеплой их не применяет автоматически:"
    echo "$SENSITIVE_CHANGED" | sed 's/^/    /'
    echo "[$(ts)] Проверьте изменения (git log origin/$BRANCH, git diff HEAD..origin/$BRANCH) и, если они безопасны, примените вручную: make update"
    exit 1
fi

echo "[$(ts)] Обнаружены изменения в origin/$BRANCH: $LOCAL -> $REMOTE"

if ! git pull --ff-only origin "$BRANCH"; then
    echo "[$(ts)] Fast-forward невозможен, делаю git reset --hard origin/$BRANCH"
    git reset --hard "origin/$BRANCH"
fi
restore_ownership

echo "[$(ts)] Пересобираю и перезапускаю контейнеры..."
if make -C "$PROJECT_DIR" build; then
    echo "[$(ts)] Деплой завершён успешно ($REMOTE)."
else
    echo "[$(ts)] ОШИБКА при сборке/перезапуске контейнеров."
    exit 1
fi
