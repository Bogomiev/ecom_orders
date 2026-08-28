import Image from "next/image";

const contents = [
  ["orders", "Интернет-заказы", "Подтверждение, контроль, сборка и выдача", true],
  ["goods", "Товары", "Товародвижение и заказы", false],
  ["tasks", "Задания", "Текущие поручения", false],
  ["service-desk", "Сервис-деск", "Обращения поддержки", false],
  ["dashboard", "Дашборд", "Показатели работы", false]
] as const;

function Screenshot({ alt, height = 1000, src, width = 1440 }: { alt: string; height?: number; src: string; width?: number }) {
  return (
    <figure className="mt-5 overflow-hidden rounded-xl border app-border app-surface-muted">
      <Image alt={alt} className="h-auto w-full" height={height} src={src} width={width} />
      <figcaption className="border-t app-border px-4 py-2.5 text-xs leading-5 app-muted">{alt}</figcaption>
    </figure>
  );
}

function Step({ children, number, title }: { children: React.ReactNode; number: number; title: string }) {
  return (
    <section className="widget-panel scroll-mt-24 overflow-hidden">
      <div className="flex items-start gap-3 border-b app-border px-5 py-4 sm:px-6">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-sm font-black text-white">{number}</span>
        <h2 className="pt-1.5 text-lg font-black app-text">{title}</h2>
      </div>
      <div className="px-5 py-5 text-sm leading-6 app-text sm:px-6">{children}</div>
    </section>
  );
}

export function ServiceInstructions() {
  return (
    <div className="mx-auto w-full max-w-6xl py-4">
      <section className="widget-panel overflow-hidden">
        <div className="border-l-4 border-blue-600 px-5 py-5 sm:px-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Справка</p>
          <h1 className="mt-1 text-2xl font-black app-text sm:text-3xl">Инструкции по сервису</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 app-muted">Выберите нужный подсервис. Доступные инструкции открываются по клику.</p>
        </div>
      </section>

      <nav aria-label="Оглавление инструкций" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {contents.map(([id, title, description, active], index) => active ? (
          <a className="widget-panel group flex min-h-32 flex-col justify-between p-4 transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md" href={`#${id}`} key={id}>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-xs font-black text-white">{index + 1}</span>
            <span><strong className="block text-sm font-black app-text group-hover:text-blue-600">{title}</strong><span className="mt-1 block text-xs leading-4 app-muted">{description}</span></span>
          </a>
        ) : (
          <div aria-disabled="true" className="widget-panel flex min-h-32 flex-col justify-between p-4 opacity-60" key={id}>
            <span className="grid h-8 w-8 place-items-center rounded-lg app-surface-muted text-xs font-black app-muted">{index + 1}</span>
            <span><strong className="block text-sm font-black app-text">{title}</strong><span className="mt-1 block text-xs leading-4 app-muted">{description} · инструкция готовится</span></span>
          </div>
        ))}
      </nav>

      <article className="mt-8 space-y-4" id="orders">
        <header className="px-1">
          <h2 className="mt-1 text-2xl font-black app-text">Работа с интернет-заказами</h2>
        </header>

        <Step number={1} title="Начало работы">
          <p>Нажмите на блок продавца в верхней панели, выберите <strong>«Отсканировать бейдж»</strong> и отсканируйте штрихкод сотрудника. После успешного входа сервис покажет имя продавца и состояние смены.</p>
        </Step>

        <Step number={2} title="Список и статусы заказов">
          <p>В карточке видны номер и источник заказа, способ получения («Самовывоз» или «Доставка»), статус, количество позиций, сумма, срок сборки и комментарий клиента. Действия доступны сразу на мини-карточке; нажмите саму карточку, чтобы открыть её полную версию, или номер заказа, чтобы посмотреть состав.</p>
          <Screenshot alt="Главный экран: мини-карточки заказов с доступными действиями для каждого статуса." height={1024} src="/instructions/orders/order-actions-v4.png" width={1536} />
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
            <strong>Просмотр заказа.</strong> Форма, открытая по номеру заказа, предназначена только для просмотра состава: отменять строки в ней нельзя. Кнопка <strong>«Печать»</strong> доступна в этой форме для заказа в любом статусе.
          </div>
          <Screenshot alt="Форма просмотра заказа: состав нельзя изменить, заказ можно напечатать независимо от его статуса." height={1024} src="/instructions/orders/order-view-print.png" width={1536} />
        </Step>

        <Step number={3} title="Кнопки заказа">
          <ul className="space-y-3">
            <li><strong>«Отмена»</strong> — отменяет весь заказ после дополнительного подтверждения.</li>
            <li><strong>«Подтвердить заказ»</strong> — обязательно открывает форму проверки состава. В ней можно отменить отдельные строки, после чего подтвердить заказ.</li>
            <li><strong>«Собрать»</strong> — открывает контроль товаров для подтверждённого заказа.</li>
            <li><strong>«Выдать»</strong> — передаёт готовый заказ курьеру.</li>
            <li><strong>«Печать»</strong> — находится в форме просмотра заказа и доступна в любом статусе.</li>
          </ul>
          <div className="mt-4 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-blue-950">
            <strong>Отмена строк при подтверждении.</strong> Нажмите красную кнопку <strong>«×»</strong> у ненужной строки и подтвердите отмену кнопкой <strong>«Да»</strong>. Строка будет только помечена на отмену. Изменения применятся после нажатия <strong>«Подтвердить»</strong> внизу формы вместе с подтверждением заказа. Последнюю активную строку отменить нельзя.
          </div>
          <Screenshot alt="Форма подтверждения заказа: строку можно пометить на отмену перед окончательным подтверждением." height={1024} src="/instructions/orders/confirmation-cancel-line.png" width={1536} />
          <Screenshot alt="Подтверждение полной отмены заказа защищает от случайного действия." height={1024} src="/instructions/orders/cancel-confirmation-v2.png" width={1536} />
        </Step>

        <Step number={4} title="Контроль товаров">
          <p>Нажмите <strong>«Собрать»</strong>. Сканируйте штрихкод каждого товара или введите его в поле и нажмите <strong>«Найти»</strong>. В таблице «План» — заказанное количество, «Факт» — уже собранное.</p>
          <Screenshot alt="Окно контроля: поиск по штрихкоду, план и факт по каждой строке, выбор количества пакетов." height={1024} src="/instructions/orders/order-control-v3.png" width={1536} />
          <ul className="mt-4 space-y-3">
            <li><strong>«−»</strong> уменьшает фактическое количество обычного товара. <strong>«+»</strong> добавляет одну штуку; для весовых и маркируемых товаров эта кнопка отключена.</li>
            <li><strong>«×»</strong> очищает просканированные марки маркируемого товара после подтверждения.</li>
            <li>Для штучного товара превышение заказанного количества невозможно.</li>
            <li>Для весового товара маркетплейса действует допустимое отклонение ±20%. Весовая строка в этом диапазоне учитывается счётчиком собранных позиций. Для весового товара в заказе с сайта ограничение на сканирование не применяется.</li>
            <li>Маркируемый товар помечен специальной жёлтой иконкой. Он добавляется сканированием марки; повторно использовать одну марку нельзя.</li>
          </ul>
          <figure className="mt-5 max-w-2xl overflow-hidden rounded-xl border app-border app-surface-muted">
            <Image alt="Специальная жёлтая иконка маркируемого товара в строке контроля." className="h-auto w-full" height={93} src="/instructions/orders/marking-icon.webp" width={720} />
            <figcaption className="border-t app-border px-4 py-2.5 text-xs leading-5 app-muted">Жёлтая иконка слева от названия отмечает маркируемый товар.</figcaption>
          </figure>
          <div className="mt-4 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-blue-950">
            Если собрать часть позиций и закрыть форму контроля, введённый факт, отсканированные марки и количество пакетов сохранятся. При следующем открытии контроля этого заказа работа восстановится с того же места.
          </div>
        </Step>

        <Step number={5} title="Завершение сборки">
          <p><strong>Перед завершением сборки обязательно выберите количество пакетов от 1 до 9.</strong> Поле нельзя редактировать вручную. Без выбранного количества сервис не завершит контроль. Затем проверьте счётчик собранных позиций и нажмите <strong>«Завершить сборку»</strong>.</p>
          <Screenshot alt="Пример частичного контроля: одна строка собрана, вторая оставлена с нулевым фактом." height={1024} src="/instructions/orders/control-completed-lines-v2.png" width={1536} />
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-950">
            <strong>Важно:</strong> если строку полностью пропустить и оставить факт равным нулю, после завершения контроля эта строка будет отменена в 1С. Перед завершением ещё раз сверьте все позиции.
          </div>
        </Step>

        <Step number={6} title="Выдача и печать">
          <p>После успешной сборки нажмите <strong>«Выдать»</strong> при передаче заказа курьеру. Заказ получит статус «Передан курьеру». В карточке выданного заказа кнопки печати нет. Если документ понадобится, откройте заказ по его номеру и нажмите <strong>«Печать»</strong> в форме просмотра.</p>
          <Screenshot alt="Выданные заказы со статусом «Передан курьеру»: кнопка печати в карточках отсутствует." height={1024} src="/instructions/orders/issued-order-no-print.png" width={1536} />
          <Screenshot alt="Печатная форма заказа: документ можно сохранить или отправить на принтер из окна просмотра." height={610} src="/instructions/orders/printed-order.webp" width={1158} />
        </Step>
      </article>
    </div>
  );
}
