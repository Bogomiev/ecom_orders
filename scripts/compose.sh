#!/usr/bin/env bash
# Тонкая обёртка над `docker compose`, гарантирующая существование внешней
# сети rms-ecom-shared (rms и ecom_orders — отдельные compose-проекты со
# своими собственными bridge-сетями и не видят друг друга без неё) перед
# любой командой. Используется как $(COMPOSE) в Makefile вместо
# "docker compose" напрямую, чтобы не забывать про сеть в каждом таргете.
set -euo pipefail

SHARED_NETWORK="rms-ecom-shared"

if ! docker network inspect "$SHARED_NETWORK" >/dev/null 2>&1; then
    docker network create "$SHARED_NETWORK" >/dev/null 2>&1 || true
    if ! docker network inspect "$SHARED_NETWORK" >/dev/null 2>&1; then
        echo "Не удалось создать/найти сеть $SHARED_NETWORK (docker network create). Проверьте права docker-группы." >&2
        exit 1
    fi
fi

exec docker compose "$@"
