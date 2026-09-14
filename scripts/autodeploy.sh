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
    echo "[$(ts)] ОШИБКА при сборке/перезапуске контейнеров."
    exit 1
fi
