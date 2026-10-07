import Link from "next/link";
import { Guide, Screenshot } from "./instruction-layout";

const sections = [
  ["general-login", "Вход и выбор магазина"],
  ["general-seller", "Продавец и смена"],
  ["general-settings", "Настройки и уведомления"],
  ["general-navigation", "Навигация и справка"]
] as const;

export function GeneralInstructions() {
  return <div className="mx-auto w-full max-w-6xl py-4">
    <section className="widget-panel overflow-hidden">
      <div className="border-l-4 border-blue-600 px-5 py-5 sm:px-7">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Справка</p>
        <h1 className="mt-1 text-2xl font-black app-text sm:text-3xl">Общие инструкции</h1>
        <p className="mt-2 text-sm leading-6 app-muted">Начало работы, общие настройки и навигация. Этот раздел открывается по значку книги с «i» слева от кнопки настроек.</p>
      </div>
    </section>
    <nav aria-label="Оглавление общей инструкции" className="mt-4 grid gap-3 sm:grid-cols-2">
      {sections.map(([id, title]) => <a key={id} className="widget-panel p-4 text-sm font-bold app-text hover:text-blue-600" href={`#${id}`}>{title}</a>)}
    </nav>
    <div className="mt-6 space-y-4">
      <Guide id="general-login" title="Вход и выбор магазина">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Откройте сервис по своей ссылке для входа.</li>
          <li>Выберите магазин: его можно найти по названию или коду.</li>
          <li>Введите личный пятизначный PIN и нажмите <strong>«Выбрать»</strong>.</li>
        </ol>
        <p>Для смены торговой точки откройте <strong>«Настройки»</strong>, нажмите на магазин, выберите новую точку и выполните вход.</p>
      </Guide>
      <Guide id="general-seller" title="Продавец и смена">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Нажмите на блок продавца в верхней панели и выберите <strong>«Отсканировать бейдж»</strong>.</li>
          <li>Отсканируйте штрихкод сотрудника. Можно также ввести его в поле и нажать Enter.</li>
          <li>После успешного входа проверьте имя продавца и состояние смены в верхней панели.</li>
        </ol>
        <p>В меню продавца можно открыть <strong>личный кабинет</strong>. При смене сотрудника выйдите из текущего профиля и отсканируйте бейдж нового продавца.</p>
      </Guide>
      <Guide id="general-settings" title="Настройки и уведомления">
        <p>Кнопка с шестерёнкой в верхней панели открывает <strong>«Настройки»</strong>. Здесь можно выбрать магазин, переключить светлую или тёмную тему и задать период истории интернет-заказов.</p>
        <p>Нажмите <strong>«Проверка уведомлений»</strong>, чтобы проверить звуковой сигнал и уведомления. Если браузер предлагает включить оповещения, подтвердите разрешение. При наличии заказов, требующих подтверждения или сборки, сервис напоминает о них раз в минуту.</p>
      </Guide>
      <Guide id="general-navigation" title="Навигация и справка">
        <p>На широком экране сервисы расположены рядом. На смартфоне и узком экране переключайте видимые сервисы кнопками с иконками над рабочими блоками.</p>
        <p>Счётчик в заголовке показывает количество заданий сервиса. Значок книги с <strong>«i»</strong> рядом с ним открывает инструкции этого сервиса, разделённые по подсервисам. Кнопка есть у сервисов, для которых подготовлена инструкция.</p>
        <Screenshot alt="Главный экран: общая инструкция у настроек и инструкции доступных сервисов рядом со счётчиками." src="/instructions/orders/services-current.png" />
        <p className="text-xs app-muted">На скриншоте показаны демонстрационные данные магазина 1116.</p>
        <Link href="/instructions" className="font-semibold text-blue-600 underline">Перейти к инструкциям сервисов</Link>
      </Guide>
    </div>
  </div>;
}
