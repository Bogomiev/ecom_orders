#!/bin/bash
# Автодеплой lk_ecom_orders: сверяет текущий HEAD с origin, и если появились
# новые коммиты — подтягивает их и пересобирает контейнеры.
#
# Запускается из cron (см. `make autodeploy` / `make autodeploy-off` в
# Makefile проекта) от того же пользователя, который выполнил `make
# autodeploy` — НЕ от root, поэтому `make build` внутри вызывает `docker
# compose` без sudo (нужна группа docker, см. check-docker в Makefile).
# Если изменений нет — скрипт молча завершается и ничего не пишет в лог.
# Весь stdout/stderr перенаправляется cron'ом в deploy.log, поэтому здесь
# достаточно обычного echo.
#
# Изменения применяются автоматически без ручного подтверждения, включая
# правки Makefile/Dockerfile/docker-compose.yml/nginx/scripts — сознательно,
# для стабильности автодеплоя (см. историю Makefile/README). Это увеличивает
# доверие к содержимому ветки, за которой следит cron: тот, кто может
# запушить туда коммит, может выполнить произвольный код на этой машине.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

ts() { date '+%Y-%m-%d %H:%M:%S'; }

# Гарантируем, что ЛЮБАЯ ошибка (а не только те, что мы явно проверяем ниже)
# попадёт в deploy.log с таймстампом и кодом возврата, а не потеряется молча.
on_err() {
    local code=$?
    local line=${BASH_LINENO[0]:-?}
    echo "[$(ts)] ОШИБКА: скрипт завершился с кодом $code (строка $line, команда: ${BASH_COMMAND})"
    exit "$code"
}
trap on_err ERR

BRANCH=$(git rev-parse --abbrev-ref HEAD)
git fetch origin "$BRANCH" --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
    # Изменений нет — ничего не делаем и не логируем.
    exit 0
fi

echo "[$(ts)] Обнаружены изменения в origin/$BRANCH: $LOCAL -> $REMOTE"

if ! git pull --ff-only origin "$BRANCH"; then
    echo "[$(ts)] Fast-forward невозможен, делаю git reset --hard origin/$BRANCH"
    git reset --hard "origin/$BRANCH"
fi

echo "[$(ts)] Пересобираю и перезапускаю контейнеры..."
if make -C "$PROJECT_DIR" build; then
    echo "[$(ts)] Деплой завершён успешно ($REMOTE)."
else
    code=$?
    echo "[$(ts)] ОШИБКА при сборке/перезапуске контейнеров (код $code)."
    exit "$code"
fi
