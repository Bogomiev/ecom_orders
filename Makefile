# ============================================================================
#  Makefile проекта lk_ecom_orders — deploy: docker + nginx + Let's Encrypt
#  Запустите `make` или `make help`, чтобы увидеть список команд.
# ============================================================================

SHELL := /bin/bash

PROJECT_NAME := lk_ecom_orders
ENV_FILE     := .env
NGINX_DIR    := nginx/conf.d
TEMPLATES    := $(NGINX_DIR)/templates
# Без sudo: требует, чтобы пользователь был в группе docker (см. check-docker).
# Это принципиально для автодеплоя — cron запускает его от обычного
# пользователя (не от root), и sudo в неинтерактивной сессии cron не спросит
# пароль, а просто зависнет/упадёт.
COMPOSE      := docker compose -p $(PROJECT_NAME) --env-file $(ENV_FILE)
REPO_URL     := https://github.com/Bogomiev/ecom_orders

AUTODEPLOY_SCRIPT := scripts/autodeploy.sh
CRON_SCHEDULE_SCRIPT := scripts/cron-schedule.sh
DEPLOY_LOG         := deploy.log
CRON_MARKER         := lk_ecom_orders autodeploy
# Интервал автодеплоя (в минутах) хранится в .env (AUTODEPLOY_INTERVAL_MIN),
# чтобы `_checkout-branch` / `_cron-sync-comment` могли пересобрать
# cron-строку с тем же интервалом, который выбрали при `make autodeploy`,
# а не откатывали его обратно на дефолтный час.
AUTODEPLOY_INTERVAL_DEFAULT := 60
PROJECT_DIR         := $(abspath .)

# Ветка, с которой сейчас работает репозиторий на этой машине — именно за ней
# следит `make autodeploy` (cron). Переключается через `make branch-dev` /
# `make branch-master` (см. секцию "Ветка деплоя" ниже).
CURRENT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")

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
        update check-docker ask-domain render-http render-https _render-domain-check up \
        autodeploy autodeploy-off check-cron _cron-sync-comment \
        branch branch-dev branch-master _checkout-branch \
        rms

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
	@printf "  $(DIM)Репозиторий:$(RESET) %s\n" "$(REPO_URL)"
	@printf "  $(DIM)Текущая ветка деплоя:$(RESET) $(BOLD)$(GREEN)%s$(RESET)  $(DIM)(cron автодеплоя следит именно за ней)$(RESET)\n" "$(CURRENT_BRANCH)"
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

install: check-docker ask-domain rms render-http up ## Установить Docker, спросить домен/email/RMS, поднять контейнеры (HTTP)

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
		printf "  $(DIM)(или переподключитесь по SSH) — без этого другие команды Makefile$(RESET)\n"; \
		printf "  $(DIM)(make up/build/status/...) не смогут обратиться к docker.$(RESET)\n\n"; \
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

##@ 🔗 Интеграция с RMS

# Спрашивает по очереди RMS_API_URL / APP_ORIGIN / RMS_SIGNING_KEY: показывает
# текущее значение из .env (или дефолт, если переменной ещё нет) и предлагает
# его подтвердить Enter'ом либо ввести новое. Меняет .env только для тех
# переменных, значение которых реально отличается от того, что там уже было.
rms: ## Настроить интеграцию с RMS (RMS_API_URL, APP_ORIGIN, RMS_SIGNING_KEY) в .env
	@touch $(ENV_FILE)
	@ask_var() { \
		VAR_NAME="$$1"; DEFAULT_VAL="$$2"; LABEL="$$3"; \
		CURRENT=$$(grep "^$$VAR_NAME=" $(ENV_FILE) 2>/dev/null | head -n1 | cut -d '=' -f2-); \
		if [ -z "$$CURRENT" ] && ! grep -q "^$$VAR_NAME=" $(ENV_FILE) 2>/dev/null; then \
			CURRENT="$$DEFAULT_VAL"; \
		fi; \
		read -p "$$(printf '$(BOLD)%s$(RESET) $(DIM)[%s]$(RESET): ' "$$LABEL" "$$CURRENT")" INPUT; \
		if [ -z "$$INPUT" ]; then VALUE="$$CURRENT"; else VALUE="$$INPUT"; fi; \
		if [ "$$VALUE" != "$$CURRENT" ]; then \
			sed -i "/^$$VAR_NAME=/d" $(ENV_FILE); \
			echo "$$VAR_NAME=$$VALUE" >> $(ENV_FILE); \
			printf "$(GREEN)  ✔ %s=%s (обновлено)$(RESET)\n" "$$VAR_NAME" "$$VALUE"; \
		else \
			grep -q "^$$VAR_NAME=" $(ENV_FILE) 2>/dev/null || echo "$$VAR_NAME=$$VALUE" >> $(ENV_FILE); \
			printf "$(DIM)  = %s=%s (без изменений)$(RESET)\n" "$$VAR_NAME" "$$VALUE"; \
		fi; \
	}; \
	ask_var RMS_API_URL "http://localhost:8082" "RMS_API_URL (адрес API RMS)"; \
	ask_var APP_ORIGIN "http://localhost:3000" "APP_ORIGIN (адрес этого приложения)"; \
	ask_var RMS_SIGNING_KEY "" "RMS_SIGNING_KEY (ключ подписи запросов к RMS)"
	$(call ok,Интеграция с RMS сохранена в $(ENV_FILE).)

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
		SENSITIVE=$$(git diff --name-only HEAD "origin/$$BRANCH" 2>/dev/null | grep -E '^(Makefile|Dockerfile|docker-compose\.yml|nginx/|scripts/)' || true); \
		if [ -n "$$SENSITIVE" ]; then \
			printf "$(YELLOW)⚠ origin/%s меняет файлы деплоя — они выполняются на хосте (в т.ч. от root через cron-автодеплой):$(RESET)\n" "$$BRANCH"; \
			echo "$$SENSITIVE" | sed 's/^/$(YELLOW)    /'; \
			printf "$(RESET)$(YELLOW)  Убедитесь, что это действительно ваши изменения, прежде чем продолжать.$(RESET)\n"; \
		fi; \
		if ! git pull --ff-only 2>/dev/null; then \
			printf "$(YELLOW)⚠ Быстрая перемотка невозможна (есть локальные правки/расхождение).$(RESET)\n"; \
			printf "$(YELLOW)  Делаю git reset --hard origin/%s — ЛОКАЛЬНЫЕ ИЗМЕНЕНИЯ (включая Makefile/docker-compose.yml/nginx/scripts — они тоже в репозитории) БУДУТ ПОТЕРЯНЫ$(RESET)\n" "$$BRANCH"; \
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
	$(call ok,Код обновлён.)
	@printf "$(DIM)Что изменилось: git log -1 --stat$(RESET)\n"

##@ 🌿 Ветка деплоя (dev / master)

branch: ## Показать текущую ветку деплоя и её статус относительно GitHub
	@printf "$(BOLD)Репозиторий:$(RESET) %s\n" "$(REPO_URL)"
	@printf "$(BOLD)Текущая ветка:$(RESET) $(GREEN)%s$(RESET)\n" "$(CURRENT_BRANCH)"
	@git fetch origin --quiet 2>/dev/null || true; \
	if git rev-parse --verify "origin/$(CURRENT_BRANCH)" >/dev/null 2>&1; then \
		LOCAL=$$(git rev-parse HEAD); REMOTE=$$(git rev-parse "origin/$(CURRENT_BRANCH)"); \
		if [ "$$LOCAL" = "$$REMOTE" ]; then \
			printf "$(GREEN)✔ синхронизирована с origin/$(CURRENT_BRANCH)$(RESET)\n"; \
		else \
			printf "$(YELLOW)⚠ отличается от origin/$(CURRENT_BRANCH) (подтянется автодеплоем по cron, либо сейчас: make update)$(RESET)\n"; \
		fi; \
	else \
		printf "$(YELLOW)⚠ origin/$(CURRENT_BRANCH) не найдена в %s$(RESET)\n" "$(REPO_URL)"; \
	fi
	@if crontab -l 2>/dev/null | grep -q -F "$(AUTODEPLOY_SCRIPT)"; then \
		MIN=$$(grep '^AUTODEPLOY_INTERVAL_MIN=' $(ENV_FILE) 2>/dev/null | cut -d '=' -f2-); \
		MIN=$${MIN:-$(AUTODEPLOY_INTERVAL_DEFAULT)}; \
		printf "$(DIM)Автодеплой (cron) включён и следит за этой веткой (интервал: %s мин).$(RESET)\n" "$$MIN"; \
	else \
		printf "$(DIM)Автодеплой (cron) выключен — включить: make autodeploy$(RESET)\n"; \
	fi

branch-master: ## Переключить деплой на ветку master (прод) — cron автодеплоя пойдёт за ней
	@$(MAKE) --no-print-directory _checkout-branch BRANCH=master

branch-dev: ## Переключить деплой на ветку dev — cron автодеплоя пойдёт за ней
	@$(MAKE) --no-print-directory _checkout-branch BRANCH=dev

_checkout-branch:
	@if [ -z "$(BRANCH)" ]; then printf "$(RED)✘ Не указана ветка (BRANCH=...)$(RESET)\n"; exit 1; fi
	@printf "$(CYAN)▸ Переключение на ветку %s...$(RESET)\n" "$(BRANCH)"
	@git fetch origin "$(BRANCH)" --quiet
	@if ! git rev-parse --verify "origin/$(BRANCH)" >/dev/null 2>&1; then \
		printf "$(RED)✘ Ветка origin/%s не найдена в %s$(RESET)\n" "$(BRANCH)" "$(REPO_URL)"; exit 1; \
	fi
	@if [ -n "$$(git status --porcelain)" ]; then \
		printf "$(YELLOW)⚠ Есть незакоммиченные локальные изменения.$(RESET)\n"; \
		read -p "Продолжить и сбросить их (git checkout -B --force)? [y/N] " CONFIRM; \
		if [ "$$CONFIRM" != "y" ] && [ "$$CONFIRM" != "Y" ]; then \
			printf "$(RED)✘ Отменено.$(RESET)\n"; exit 1; \
		fi; \
	fi
	@git checkout -B "$(BRANCH)" "origin/$(BRANCH)" --quiet -f
	@git branch --set-upstream-to="origin/$(BRANCH)" "$(BRANCH)" >/dev/null 2>&1 || true
	$(call ok,Переключено на ветку $(BRANCH). Автодеплой (cron) теперь следит за origin/$(BRANCH).)
	@if crontab -l 2>/dev/null | grep -q -F "$(AUTODEPLOY_SCRIPT)"; then \
		MIN=$$(grep '^AUTODEPLOY_INTERVAL_MIN=' $(ENV_FILE) 2>/dev/null | cut -d '=' -f2-); \
		MIN=$${MIN:-$(AUTODEPLOY_INTERVAL_DEFAULT)}; \
		SCHEDULE=$$("$(CRON_SCHEDULE_SCRIPT)" "$$MIN" 2>/dev/null) || { MIN=$(AUTODEPLOY_INTERVAL_DEFAULT); SCHEDULE=$$("$(CRON_SCHEDULE_SCRIPT)" "$$MIN"); }; \
		( crontab -l 2>/dev/null | grep -v -F "$(AUTODEPLOY_SCRIPT)" | grep -v -F "$(CRON_MARKER)" ; \
		  echo "# $(CRON_MARKER) — ветка: $(BRANCH), интервал: $${MIN} мин" ; \
		  echo "$$SCHEDULE * * \"$(PROJECT_DIR)/$(AUTODEPLOY_SCRIPT)\" >> \"$(PROJECT_DIR)/$(DEPLOY_LOG)\" 2>&1" ) | crontab -; \
		printf "$(DIM)cron автодеплоя обновлён: теперь следит за веткой $(BRANCH) (интервал прежний: %s мин).$(RESET)\n" "$$MIN"; \
	fi
	@printf "$(DIM)Подсказка: выполните make build, чтобы сразу пересобрать контейнеры под эту ветку.$(RESET)\n"

##@ 🔁 Автодеплой

autodeploy: check-cron ## Включить автодеплой: спросить интервал (в минутах) проверки GitHub и применять изменения
	@chmod +x "$(PROJECT_DIR)/$(AUTODEPLOY_SCRIPT)" "$(PROJECT_DIR)/$(CRON_SCHEDULE_SCRIPT)"
	@git config --global --add safe.directory "$(PROJECT_DIR)" >/dev/null 2>&1 || true
# Разовая миграция со старой схемы (задача стояла в root-crontab): убираем
# её оттуда, иначе после переезда на пользовательский crontab деплой будет
# запускаться дважды — от root по старой записи и от пользователя по новой.
	@if sudo -n true 2>/dev/null || [ -t 0 ]; then \
		sudo crontab -l 2>/dev/null | grep -v -F "$(AUTODEPLOY_SCRIPT)" | grep -v -F "$(CRON_MARKER)" | sudo crontab - 2>/dev/null || true; \
	fi
	@touch $(ENV_FILE)
	@CURRENT=$$(grep '^AUTODEPLOY_INTERVAL_MIN=' $(ENV_FILE) 2>/dev/null | cut -d '=' -f2-); \
	CURRENT=$${CURRENT:-$(AUTODEPLOY_INTERVAL_DEFAULT)}; \
	while :; do \
		read -p "$$(printf '$(BOLD)Интервал проверки GitHub, в минутах$(RESET) $(DIM)[%s]$(RESET) (<60 — каждые N минут; кратно 60 — каждые N/60 часов): ' "$$CURRENT")" MIN_INPUT; \
		MIN=$${MIN_INPUT:-$$CURRENT}; \
		if SCHEDULE=$$("$(CRON_SCHEDULE_SCRIPT)" "$$MIN" 2>&1); then break; fi; \
		printf "$(RED)✘ %s$(RESET)\n" "$$SCHEDULE"; \
	done; \
	sed -i '/^AUTODEPLOY_INTERVAL_MIN=/d' $(ENV_FILE); \
	echo "AUTODEPLOY_INTERVAL_MIN=$$MIN" >> $(ENV_FILE); \
	( crontab -l 2>/dev/null | grep -v -F "$(AUTODEPLOY_SCRIPT)" | grep -v -F "$(CRON_MARKER)" ; \
	  echo "# $(CRON_MARKER) — ветка: $(CURRENT_BRANCH), интервал: $${MIN} мин" ; \
	  echo "$$SCHEDULE * * \"$(PROJECT_DIR)/$(AUTODEPLOY_SCRIPT)\" >> \"$(PROJECT_DIR)/$(DEPLOY_LOG)\" 2>&1" ) | crontab -; \
	printf "$(GREEN)✔ Автодеплой включён: проверка ветки $(CURRENT_BRANCH) на GitHub каждые %s мин. Лог изменений: $(DEPLOY_LOG)$(RESET)\n" "$$MIN"

autodeploy-off: ## Отключить автодеплой (удалить cron-задачу)
	@if crontab -l 2>/dev/null | grep -q -F "$(AUTODEPLOY_SCRIPT)"; then \
		( crontab -l 2>/dev/null | grep -v -F "$(AUTODEPLOY_SCRIPT)" | grep -v -F "$(CRON_MARKER)" ) | crontab -; \
		printf "$(GREEN)✔ Автодеплой отключён.$(RESET)\n"; \
	else \
		printf "$(YELLOW)⚠ Автодеплой не был включён — нечего отключать.$(RESET)\n"; \
	fi

# Обновляет только комментарий-метку над cron-задачей автодеплоя, чтобы в
# `crontab -l` сразу было видно, какую ветку он сейчас деплоит — не трогает
# расписание и ничего не делает, если автодеплой выключен.
_cron-sync-comment:
	@if crontab -l 2>/dev/null | grep -q -F "$(AUTODEPLOY_SCRIPT)"; then \
		MIN=$$(grep '^AUTODEPLOY_INTERVAL_MIN=' $(ENV_FILE) 2>/dev/null | cut -d '=' -f2-); \
		MIN=$${MIN:-$(AUTODEPLOY_INTERVAL_DEFAULT)}; \
		SCHEDULE=$$("$(CRON_SCHEDULE_SCRIPT)" "$$MIN" 2>/dev/null) || { MIN=$(AUTODEPLOY_INTERVAL_DEFAULT); SCHEDULE=$$("$(CRON_SCHEDULE_SCRIPT)" "$$MIN"); }; \
		( crontab -l 2>/dev/null | grep -v -F "$(AUTODEPLOY_SCRIPT)" | grep -v -F "$(CRON_MARKER)" ; \
		  echo "# $(CRON_MARKER) — ветка: $(CURRENT_BRANCH), интервал: $${MIN} мин" ; \
		  echo "$$SCHEDULE * * \"$(PROJECT_DIR)/$(AUTODEPLOY_SCRIPT)\" >> \"$(PROJECT_DIR)/$(DEPLOY_LOG)\" 2>&1" ) | crontab -; \
		printf "$(DIM)cron автодеплоя обновлён: теперь следит за веткой $(CURRENT_BRANCH) (интервал прежний: %s мин).$(RESET)\n" "$$MIN"; \
	fi

check-cron:
	@if command -v crontab >/dev/null 2>&1 && { systemctl is-active --quiet cron 2>/dev/null || systemctl is-active --quiet crond 2>/dev/null || pgrep -x cron >/dev/null 2>&1 || pgrep -x crond >/dev/null 2>&1; }; then \
		printf "$(GREEN)cron уже установлен и запущен.$(RESET)\n"; \
	else \
		printf "$(YELLOW)cron не найден — устанавливаю...$(RESET)\n"; \
		sudo apt-get update -y; \
		sudo apt-get install -y cron; \
		sudo systemctl enable cron --now; \
		printf "$(GREEN)✔ cron установлен и запущен.$(RESET)\n"; \
	fi

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
