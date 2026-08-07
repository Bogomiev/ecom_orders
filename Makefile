# ============================================================================
#  Makefile проекта lk_ecom_orders — deploy: docker + nginx + Let's Encrypt
#  Запустите `make` или `make help`, чтобы увидеть список команд.
# ============================================================================

SHELL := /bin/bash

PROJECT_NAME := lk_ecom_orders
ENV_FILE     := .env
NGINX_DIR    := nginx/conf.d
TEMPLATES    := $(NGINX_DIR)/templates
COMPOSE      := sudo docker compose -p $(PROJECT_NAME) --env-file $(ENV_FILE)
REPO_URL     := https://github.com/Bogomiev/ecom_orders

# ---------------------------------------------------------------------------
# Цвета для вывода (ANSI). Отключаются автоматически, если вывод не в терминал.
# ---------------------------------------------------------------------------
BOLD   := \033[1m
DIM    := \033[2m
RESET  := \033[0m
RED    := \033[31m
GREEN  := \033[32m
YELLOW := \033[33m
BLUE   := \033[34m
MAGENTA:= \033[35m
CYAN   := \033[36m

define log
	@printf "$(CYAN)▸ %s$(RESET)\n" "$(1)"
endef
define ok
	@printf "$(GREEN)✔ %s$(RESET)\n" "$(1)"
endef
define warn
	@printf "$(YELLOW)⚠ %s$(RESET)\n" "$(1)"
endef
define err
	@printf "$(RED)✘ %s$(RESET)\n" "$(1)"
endef

.PHONY: help install ssl ssl-request ssl-test https no-https build all \
        status logs logs-app logs-nginx logs-certbot restart down \
        update check-docker ask-domain render-http render-https _render-domain-check up

# Голый `make` (без аргумента) выполняет первую цель в файле — пусть это
# будет безобидный help, а не install, чтобы ничего не запускалось случайно.
.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
# help — самодокументируемый: описания подтягиваются из комментариев "##"
# у каждой цели, поэтому справка никогда не разъезжается с реальным кодом.
# Формат цели:      target: ## Описание для help
# Формат заголовка: ##@ Название раздела
# ---------------------------------------------------------------------------
help:
	@printf "\n$(BOLD)$(MAGENTA)══════════════════════════════════════════════════════════════════$(RESET)\n"
	@printf "$(BOLD)  Makefile проекта $(CYAN)$(PROJECT_NAME)$(RESET)$(BOLD) — Docker + nginx + Let's Encrypt$(RESET)\n"
	@printf "$(BOLD)$(MAGENTA)══════════════════════════════════════════════════════════════════$(RESET)\n"
	@awk 'BEGIN {FS = ":.*##"} \
		/^[a-zA-Z0-9_-]+:.*##/ { printf "  $(GREEN)%-16s$(RESET) %s\n", $$1, $$2 } \
		/^##@/ { printf "\n$(BOLD)$(YELLOW)%s$(RESET)\n", substr($$0, 5) }' \
		$(MAKEFILE_LIST)
	@printf "\n$(BOLD)$(MAGENTA)──────────────────────────────────────────────────────────────────$(RESET)\n"
	@printf "$(BOLD)Первый запуск с нуля:$(RESET)\n"
	@printf "  $(DIM)1)$(RESET) $(GREEN)make install$(RESET)   $(DIM)# спросит домен и email, поднимет http-версию$(RESET)\n"
	@printf "  $(DIM)2)$(RESET) $(GREEN)make ssl-test$(RESET)  $(DIM)# проверка challenge, не тратит лимиты Let's Encrypt$(RESET)\n"
	@printf "  $(DIM)3)$(RESET) $(GREEN)make ssl$(RESET)       $(DIM)# получит боевой сертификат$(RESET)\n"
	@printf "  $(DIM)4)$(RESET) $(GREEN)make https$(RESET)     $(DIM)# включит https и редирект$(RESET)\n"
	@printf "  $(DIM)5)$(RESET) $(GREEN)make build$(RESET)     $(DIM)# при последующих изменениях кода/конфигов$(RESET)\n"
	@printf "$(BOLD)$(MAGENTA)══════════════════════════════════════════════════════════════════$(RESET)\n\n"

##@ 🚀 Установка

install: check-docker ask-domain render-http up ## Установить Docker, спросить домен/email, поднять контейнеры (HTTP)

check-docker:
	$(call log,Проверка и обновление списка пакетов...)
	@sudo apt-get update -y
	@if command -v docker >/dev/null 2>&1; then \
		printf "$(GREEN)Docker уже установлен:$(RESET) %s\n" "$$(docker --version)"; \
		printf "$(CYAN)▸ Обновление Docker до последней версии...$(RESET)\n"; \
		sudo apt-get install --only-upgrade -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null || true; \
	else \
		printf "$(YELLOW)Docker не найден — устанавливаю...$(RESET)\n"; \
		sudo apt-get install -y ca-certificates curl gnupg; \
		sudo install -m 0755 -d /etc/apt/keyrings; \
		curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg; \
		sudo chmod a+r /etc/apt/keyrings/docker.gpg; \
		echo "deb [arch=$$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $$(. /etc/os-release && echo $$VERSION_CODENAME) stable" \
			| sudo tee /etc/apt/sources.list.d/docker.list > /dev/null; \
		sudo apt-get update -y; \
		sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin; \
	fi
	@if ! docker compose version >/dev/null 2>&1; then \
		printf "$(YELLOW)Плагин docker compose не найден — устанавливаю...$(RESET)\n"; \
		sudo apt-get install -y docker-compose-plugin; \
	else \
		printf "$(GREEN)docker compose уже установлен:$(RESET) %s\n" "$$(docker compose version)"; \
	fi
	@sudo systemctl enable docker --now 2>/dev/null || true
	@sudo groupadd docker 2>/dev/null || true
	@if ! id -nG "$$USER" | grep -qw docker; then \
		printf "$(CYAN)▸ Добавляю пользователя %s в группу docker...$(RESET)\n" "$$USER"; \
		sudo usermod -aG docker "$$USER"; \
		printf "\n$(YELLOW)$(BOLD)  ВАЖНО:$(RESET) $(YELLOW)право работать с docker без sudo вступит в силу\n"; \
		printf "  только в НОВОЙ сессии. Прямо сейчас выполните в этом терминале:$(RESET)\n\n"; \
		printf "      $(BOLD)newgrp docker$(RESET)\n\n"; \
		printf "  $(DIM)(или переподключитесь по SSH). Сам Makefile использует sudo и$(RESET)\n"; \
		printf "  $(DIM)в перелогине не нуждается.$(RESET)\n\n"; \
	else \
		printf "$(GREEN)Пользователь %s уже в группе docker.$(RESET)\n" "$$USER"; \
	fi
	$(call ok,Docker готов к работе.)

ask-domain:
	@touch $(ENV_FILE)
	@read -p "$$(printf '$(BOLD)Домен для развёртывания$(RESET) (например example.com): ')" DOMAIN_RAW; \
	read -p "$$(printf '$(BOLD)Email для Let'"'"'s Encrypt$(RESET): ')" EMAIL_RAW; \
	DOMAIN=$$(printf '%s' "$$DOMAIN_RAW" | tr -cd 'A-Za-z0-9.-'); \
	EMAIL=$$(printf '%s' "$$EMAIL_RAW" | tr -cd 'A-Za-z0-9.@+_-'); \
	if [ -z "$$DOMAIN" ] || [ -z "$$EMAIL" ]; then \
		printf "$(RED)✘ Домен и email обязательны.$(RESET)\n"; exit 1; \
	fi; \
	if [ "$$DOMAIN_RAW" != "$$DOMAIN" ] || [ "$$EMAIL_RAW" != "$$EMAIL" ]; then \
		printf "$(YELLOW)⚠ Во введённых значениях были посторонние символы (пробелы/BOM/перенос строки) — очищено.$(RESET)\n"; \
	fi; \
	sed -i "/^DOMAIN=/d;/^EMAIL=/d" $(ENV_FILE); \
	echo "DOMAIN=$$DOMAIN" >> $(ENV_FILE); \
	echo "EMAIL=$$EMAIL" >> $(ENV_FILE); \
	grep -q '^ONE_C_API_URL=' $(ENV_FILE) || echo "ONE_C_API_URL=http://1c.ikorniysrv.ru:85/eshop/hs/PAPI/v1" >> $(ENV_FILE); \
	printf "$(GREEN)✔ Домен %s сохранён в $(ENV_FILE).$(RESET)\n" "$$DOMAIN"

# Читает DOMAIN из .env и генерирует nginx/conf.d/app.conf ЗАНОВО из pristine-шаблона
# (templates/*.template с плейсхолдером __DOMAIN__, который НИКОГДА не изменяется).
# Полностью идемпотентно: сколько раз ни вызови — результат всегда чистый,
# накопления/дублирования домена в файле невозможны в принципе.
render-http: _render-domain-check
	@DOMAIN=$$(grep '^DOMAIN=' $(ENV_FILE) | cut -d '=' -f2-); \
	sed "s/__DOMAIN__/$$DOMAIN/g" $(TEMPLATES)/http.conf.template > $(NGINX_DIR)/app.conf
	$(call ok,nginx/conf.d/app.conf сгенерирован (HTTP) для домена из $(ENV_FILE).)

render-https: _render-domain-check
	@DOMAIN=$$(grep '^DOMAIN=' $(ENV_FILE) | cut -d '=' -f2-); \
	sed "s/__DOMAIN__/$$DOMAIN/g" $(TEMPLATES)/https.conf.template > $(NGINX_DIR)/app.conf
	$(call ok,nginx/conf.d/app.conf сгенерирован (HTTPS) для домена из $(ENV_FILE).)

_render-domain-check:
	@if [ ! -f $(ENV_FILE) ] || ! grep -q '^DOMAIN=' $(ENV_FILE); then \
		printf "$(RED)✘ DOMAIN не задан в $(ENV_FILE) — сначала выполните: make install$(RESET)\n"; exit 1; \
	fi

up:
	$(call log,Запуск контейнеров проекта $(PROJECT_NAME)...)
	@$(COMPOSE) up -d --build app nginx
	$(call ok,Контейнеры запущены:)
	@$(COMPOSE) ps

##@ 🔐 SSL / HTTPS

ssl: ssl-request ## Выпустить боевой SSL-сертификат Let's Encrypt (webroot) + автопродление

ssl-request:
	@if [ ! -f $(ENV_FILE) ]; then printf "$(RED)✘ Нет $(ENV_FILE) — сначала выполните: make install$(RESET)\n"; exit 1; fi
	@DOMAIN=$$(grep '^DOMAIN=' $(ENV_FILE) | cut -d '=' -f2-); \
	EMAIL=$$(grep '^EMAIL=' $(ENV_FILE) | cut -d '=' -f2-); \
	if [ -z "$$DOMAIN" ] || [ -z "$$EMAIL" ]; then \
		printf "$(RED)✘ DOMAIN/EMAIL не заданы в $(ENV_FILE), выполните make install$(RESET)\n"; exit 1; \
	fi; \
	mkdir -p certbot/www certbot/conf; \
	printf "$(CYAN)▸ Запрос сертификата Let's Encrypt для %s...$(RESET)\n" "$$DOMAIN"; \
	$(COMPOSE) run --rm -t -e PYTHONUNBUFFERED=1 --entrypoint certbot --name lk_ecom_orders_certbot_run certbot certonly \
		--webroot -w /var/www/certbot \
		-d $$DOMAIN \
		--email $$EMAIL --agree-tos --no-eff-email --non-interactive -v
	$(call log,Сертификат получен. Запускаю службу автопродления certbot...)
	@$(COMPOSE) up -d certbot
	$(call ok,Готово. Теперь выполните: make https)

ssl-test: ## Тестовый запрос сертификата (--dry-run), не тратит лимиты Let's Encrypt
	@if [ ! -f $(ENV_FILE) ]; then printf "$(RED)✘ Нет $(ENV_FILE) — сначала выполните: make install$(RESET)\n"; exit 1; fi
	@DOMAIN=$$(grep '^DOMAIN=' $(ENV_FILE) | cut -d '=' -f2-); \
	EMAIL=$$(grep '^EMAIL=' $(ENV_FILE) | cut -d '=' -f2-); \
	mkdir -p certbot/www certbot/conf; \
	printf "$(CYAN)▸ Тестовый (dry-run) запрос сертификата для %s...$(RESET)\n" "$$DOMAIN"; \
	$(COMPOSE) run --rm -t -e PYTHONUNBUFFERED=1 --entrypoint certbot --name lk_ecom_orders_certbot_test certbot certonly \
		--webroot -w /var/www/certbot \
		-d $$DOMAIN \
		--email $$EMAIL --agree-tos --no-eff-email --non-interactive -v --dry-run

https: render-https ## Включить HTTPS и редирект http -> https (после make ssl)
	$(call ok,nginx переключён на HTTPS, редирект http->https включён.)
	@$(COMPOSE) exec nginx nginx -s reload 2>/dev/null || $(COMPOSE) restart nginx

no-https: render-http ## Откатить nginx обратно на обычный HTTP (без TLS и редиректа)
	$(call ok,nginx переключён обратно на HTTP, редирект http->https отключён.)
	@$(COMPOSE) exec nginx nginx -s reload 2>/dev/null || $(COMPOSE) restart nginx

##@ 📦 Код проекта

update: ## Обновить код из git (git init+pull на месте, БЕЗ вложенной папки)
	@if [ -d .git ]; then \
		printf "$(CYAN)▸ Обновляю код из %s...$(RESET)\n" "$(REPO_URL)"; \
		BRANCH=$$(git rev-parse --abbrev-ref HEAD 2>/dev/null); \
		git fetch origin --quiet; \
		if ! git pull --ff-only 2>/dev/null; then \
			printf "$(YELLOW)⚠ Быстрая перемотка невозможна (есть локальные правки/расхождение).$(RESET)\n"; \
			printf "$(YELLOW)  Делаю git reset --hard origin/%s — ЛОКАЛЬНЫЕ ИЗМЕНЕНИЯ КОДА ИЗ РЕПОЗИТОРИЯ БУДУТ ПОТЕРЯНЫ$(RESET)\n" "$$BRANCH"; \
			printf "$(YELLOW)  (файлы деплоя — Makefile, docker-compose.yml, nginx/, certbot/, .env — не входят в репозиторий и не тронутся).$(RESET)\n"; \
			read -p "Продолжить? [y/N] " CONFIRM; \
			if [ "$$CONFIRM" = "y" ] || [ "$$CONFIRM" = "Y" ]; then \
				git reset --hard origin/$$BRANCH; \
			else \
				printf "$(RED)✘ Отменено.$(RESET)\n"; exit 1; \
			fi; \
		fi; \
	else \
		printf "$(CYAN)▸ Git ещё не подключён — инициализирую и подтягиваю %s в текущую папку...$(RESET)\n" "$(REPO_URL)"; \
		git init -q; \
		git remote add origin $(REPO_URL); \
		git fetch origin --quiet; \
		git remote set-head origin -a >/dev/null 2>&1 || true; \
		BRANCH=$$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@'); \
		BRANCH=$${BRANCH:-main}; \
		git checkout -f -B $$BRANCH origin/$$BRANCH; \
		git branch --set-upstream-to=origin/$$BRANCH $$BRANCH 2>/dev/null || true; \
	fi
	$(call ok,Код обновлён. Файлы деплоя (Makefile/docker-compose.yml/nginx/certbot/.env) не затронуты.)
	@printf "$(DIM)Что изменилось: git log -1 --stat$(RESET)\n"

##@ 🛠️  Сборка и обслуживание

build: ## Пересобрать образ приложения и перезапустить все контейнеры
	$(call log,Пересборка и перезапуск контейнеров $(PROJECT_NAME)...)
	@$(COMPOSE) up -d --build
	@$(COMPOSE) ps

restart: ## Перезапустить контейнеры без пересборки образа
	$(call log,Перезапуск контейнеров...)
	@$(COMPOSE) restart
	@$(COMPOSE) ps

down: ## Остановить и удалить все контейнеры проекта
	$(call warn,Останавливаю и удаляю контейнеры $(PROJECT_NAME)...)
	@$(COMPOSE) down

all: install ssl https ## Всё сразу: install -> ssl -> https

##@ 🔍 Диагностика

status: ## Показать статус контейнеров проекта
	@$(COMPOSE) ps

logs: ## Логи всех контейнеров (следить в реальном времени)
	@$(COMPOSE) logs -f --tail=100

logs-nginx: ## Логи только nginx
	@$(COMPOSE) logs -f --tail=100 nginx

logs-app: ## Логи только приложения (app)
	@$(COMPOSE) logs -f --tail=100 app

logs-certbot: ## Логи только certbot
	@$(COMPOSE) logs -f --tail=100 certbot
