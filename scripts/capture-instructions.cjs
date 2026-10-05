/* Rebuild instruction screenshots using the real UI and isolated demonstration data.
 * Start npm run dev, then run npm run screenshots:instructions.
 * All /api requests are intercepted; no requests or actions reach RMS or 1C.
 */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const baseURL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:3000';
const output = path.resolve(__dirname, '../public/instructions');
const store = { id: 'demo-store-1116', code: '1116', name: 'Магазин 1116', uid_1c: 'demo-store-1116', address: 'Демонстрационный магазин' };
const barcode = (value, ratio = 1) => ({ barcode: value, unit: 'шт', ratio, isBase: ratio === 1 });
const products = [
  { uid: 'demo-caviar', code: '00001297', name: 'Икра КЕТЫ «Орланэко» пл/б 90г', markingType: 'Маркируемый', isWeight: false, isThermalMode: true, barcodes: [barcode('4601234567893'), barcode('4601234567800')] },
  { uid: 'demo-crackers', code: '00002118', name: 'Хлебцы ржаные 100г', markingType: 'БезОсобенностейУчета', isWeight: false, isThermalMode: false, barcodes: [barcode('4609876543210')] },
  { uid: 'demo-salmon', code: '00003825', name: 'Сёмга слабосолёная, весовая', markingType: 'БезОсобенностейУчета', isWeight: true, isThermalMode: true, barcodes: [barcode('2200000038250')] }
];
const line = (i, quantity = 1) => ({ product_id: products[i].uid, product_name: products[i].name, marking_product: products[i].markingType !== 'БезОсобенностейУчета', quantity, price: [890, 120, 2400][i], amount: quantity * [890, 120, 2400][i], canceled: false, quantity_fact: 0, is_weight: products[i].isWeight });
const order = (id, number, source, extended_status, items) => ({
  id, uid_1c: id, number, external_id: source === 'Ozon' ? `1116-${number}` : null, source, deliveryMethod: 'delivery', status: 'Новый', extended_status,
  order_created_at: '2026-10-05T12:00:00', confirmation_date: '2026-10-05T12:05:00', delivery_date: '05.10.2026', delivery_time: '12:00', delivery_time_by: '14:00',
  address: 'Демонстрационный адрес, магазин 1116', order_sum: items.reduce((sum, item) => sum + item.amount, 0), comment: 'Проверить упаковку перед выдачей', shipment_store_name: store.name, store_id: store.id,
  quantityBags: 0, quantityThermalBagsS: 0, quantityThermalBagsM: 0, items, controlledItems: []
});
const orders = [
  order('demo-new', '000101', 'Сайт', 'Ожидает подтверждения', [line(0), line(1, 2), line(2, .5)]),
  order('demo-control', '000102', 'Ozon', 'Ожидает сборку', [line(0), line(1, 2), line(2, .5)]),
  order('demo-ready', '000103', 'Яндекс Еда', 'Готов', [line(1, 2)])
];
const receipt = (id, number, type, items) => ({ id, number, type, created_at: '2026-10-05T10:00:00', sender: type === 'TRANSFER' ? 'Центральный склад' : 'Поставщик морепродуктов', shipment_store_name: store.name, comment: 'Проверить количество и целостность упаковки', amount: items.reduce((sum, item) => sum + item.amount, 0), items });
const receipts = [
  receipt('demo-receipt-1', 'ИКЦБ-000032', 'RECEIPT', [{ product_id: products[0].uid, quantity: 24, price: 650, amount: 15600 }, { product_id: products[2].uid, quantity: 5, price: 1800, amount: 9000 }]),
  receipt('demo-receipt-2', 'ИКЦБ-000033', 'TRANSFER', [{ product_id: products[1].uid, quantity: 12, price: 0, amount: 0 }])
];
const info = {
  ...products[0], id: products[0].uid, images: ['/demo-product-1.svg', '/demo-product-2.svg'], price: 890, stock: 42,
  sold_yesterday_quantity: 8, sold_week_quantity: 36, receipts_yesterday_quantity: 6, receipts_week_quantity: 29, stock_days: 8,
  price_eshop: 890, price_ozon: 920, price_yandex_eats: 920, promo_price_eshop: 0, promo_price_ozon: 0, promo_price_yandex_eats: 0,
  receipts: [{ type: 'Приобретение', number: 'ИКЦБ-000032', date: '2026-10-05T10:00:00', supplier: 'Поставщик морепродуктов', store_id: store.id, product_id: products[0].uid, quantity: 24 }]
};
const paginate = items => ({ page: 1, perPage: items.length, totalPages: items.length ? 1 : 0, totalItems: items.length, items });

(async () => {
  await fs.mkdir(path.join(output, 'goods'), { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'ru-RU', timezoneId: 'Asia/Vladivostok', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(({ store }) => {
      localStorage.setItem('ecom-orders-selected-store', JSON.stringify({ id: store.id, name: store.name }));
      localStorage.setItem('ecom-orders-theme', 'light');
    }, { store });
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const pathname = url.pathname;
      let data;
      if (pathname === '/api/auth/session') data = { userToken: 'demo-session', csrfToken: 'demo-csrf' };
      else if (pathname === '/api/entities/stores') data = paginate([store]);
      else if (pathname === '/api/entities/sellers') data = { code: 0, mess: '', data: [{ id: 'demo-seller', userId: 'demo-seller', name: 'Продавец магазина 1116' }] };
      else if (pathname === '/api/entities/product') data = products;
      else if (pathname === '/api/entities/product/info') data = { resultCode: 0, messages: [], data: [info] };
      else if (pathname === '/api/goods-receipts') data = paginate(url.searchParams.get('store') === store.id ? receipts : []);
      else if (pathname === '/api/orders') data = paginate(orders.filter(item => url.searchParams.has('historyDays') || !['Передан курьеру', 'Отменен'].includes(item.extended_status)));
      else if (pathname.startsWith('/api/orders/') && route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const item = orders.find(item => item.uid_1c === body.orderId);
        assert(item, `Unknown demonstration order ${body.orderId}`);
        if (pathname.endsWith('/confirm')) {
          item.extended_status = 'Ожидает сборку';
          for (const change of body.items) item.items.find(line => line.product_id === change.product_id).canceled = change.action === 'CANCELLED';
        } else if (pathname.endsWith('/cancel')) item.extended_status = 'Отменен';
        else if (pathname.endsWith('/complete')) item.extended_status = 'Готов';
        else if (pathname.endsWith('/give-to-courier')) item.extended_status = 'Передан курьеру';
        else throw new Error(`Unmocked action ${pathname}`);
        data = { code: 0, mess: 'Действие выполнено', data: { order: item.uid_1c, status: item.extended_status, seller: 'demo-seller' } };
      } else {
        await route.fulfill({ status: 501, json: { message: `Unmocked demonstration request ${pathname}` } });
        return;
      }
      await route.fulfill({ json: data });
    });
    await context.route('**/demo-product-*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="white"/><ellipse cx="200" cy="305" rx="120" ry="12" fill="#e5e7eb"/><path d="M92 154h216l-14 130q-94 30-188 0Z" fill="#efc6a0" stroke="#a5764d" stroke-width="3"/><path d="M98 178h204l-6 92H104Z" fill="#153d35"/><ellipse cx="200" cy="154" rx="108" ry="26" fill="#bf5830" stroke="#a5764d" stroke-width="5"/><ellipse cx="200" cy="150" rx="98" ry="20" fill="#e89c52"/><text x="200" y="212" text-anchor="middle" fill="#f9e5b0" font-family="sans-serif" font-weight="bold" font-size="22">ОРЛАНЭКО</text><text x="200" y="244" text-anchor="middle" fill="white" font-family="sans-serif" font-size="21">ИКРА КЕТЫ · 90 г</text></svg>` }));
    const screenshot = async (name, target = page) => {
      await page.locator('nextjs-portal').evaluateAll(nodes => nodes.forEach(node => node.style.display = 'none'));
      await page.evaluate(() => document.fonts.ready);
      await target.screenshot({ path: path.join(output, name), animations: 'disabled' });
      console.log(`Saved ${name}`);
    };
    const dialog = name => page.getByRole('dialog', { name, exact: true });
    const goods = page.locator('.goods-widget');
    const ordersWidget = page.locator('.orders-widget');
    const close = async target => {
      await target.getByRole('button', { name: 'Закрыть', exact: true }).click();
      await target.waitFor({ state: 'hidden' });
    };
    await page.goto(baseURL);
    await goods.locator('.widget-count').filter({ hasText: /^2$/ }).waitFor({ timeout: 10000 }).catch(async error => { console.log(await page.locator('body').innerText()); throw error; });
    assert.equal(await goods.locator('.widget-count').innerText(), '2');
    const enableAlerts = page.getByRole('button', { name: 'Включить оповещения', exact: true });
    if (await enableAlerts.isVisible()) await enableAlerts.click();
    await page.getByRole('button', { name: /Продавец не указан/ }).click();
    await page.getByRole('button', { name: 'Отсканировать бейдж' }).click();
    await page.getByPlaceholder('Отсканируйте штрихкод на бейдже').fill('X-NHYU5371942');
    await page.getByPlaceholder('Отсканируйте штрихкод на бейдже').press('Enter');
    await page.getByRole('button', { name: /Продавец магазина 1116/ }).waitFor();
    await page.setViewportSize({ width: 1440, height: 1080 });
    await screenshot('orders/services-current.png');
    await page.setViewportSize({ width: 1440, height: 900 });

    await ordersWidget.getByRole('button', { name: 'Открыть заказ', exact: true }).click();
    let target = page.getByRole('dialog', { name: /^Заказ/ });
    await target.getByRole('button', { name: /Отменить товар Хлебцы/ }).click();
    await target.getByRole('button', { name: 'Да', exact: true }).click();
    await target.getByRole('button', { name: /Вернуть товар Хлебцы/ }).waitFor();
    await screenshot('orders/confirmation-current.png', target);
    await target.getByRole('button', { name: 'Подтвердить', exact: true }).click();
    await target.waitFor({ state: 'hidden' });
    assert(orders[0].items[1].canceled, 'Line cancellation applied on confirmation');

    const controlCard = ordersWidget.locator('.order-mini-card').filter({ hasText: '1116-000102' });
    await controlCard.getByRole('button', { name: 'Собрать', exact: true }).click();
    target = dialog('Сборка заказа');
    await target.getByRole('button', { name: /Увеличить количество Хлебцы/ }).click();
    await target.getByRole('button', { name: /Увеличить количество Хлебцы/ }).click();
    await target.getByLabel('Количество пакетов', { exact: true }).selectOption('2');
    await target.getByLabel('Термопакет S', { exact: true }).selectOption('1');
    await screenshot('orders/control-current.png', target);
    await target.getByRole('button', { name: 'Завершить сборку' }).click();
    await target.getByText('Собраны не все товары. Продолжить?').waitFor();
    await screenshot('orders/incomplete-current.png', target);
    await target.getByRole('button', { name: 'Нет', exact: true }).click();
    await target.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await target.getByRole('button', { name: 'Да', exact: true }).click();
    await target.waitFor({ state: 'hidden' });
    // Reopen to verify that local control values persist.
    await controlCard.getByRole('button', { name: 'Собрать', exact: true }).click();
    target = dialog('Сборка заказа');
    assert.equal(await target.getByLabel('Количество пакетов', { exact: true }).inputValue(), '2');
    assert.equal(await target.getByLabel('Термопакет S', { exact: true }).inputValue(), '1');
    await target.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await target.getByRole('button', { name: 'Да', exact: true }).click();
    await target.waitFor({ state: 'hidden' });

    await ordersWidget.locator('.order-mini-card').filter({ hasText: '000101' }).getByRole('button', { name: 'Отмена', exact: true }).click();
    target = dialog('Отменить заказ?');
    await screenshot('orders/cancel-current.png', target);
    await target.getByRole('button', { name: 'Да', exact: true }).click();
    await target.waitFor({ state: 'hidden' });
    await ordersWidget.locator('.order-mini-card').filter({ hasText: '000103' }).getByRole('button', { name: 'Выдать', exact: true }).click();
    await ordersWidget.getByRole('button', { name: 'Показать историю заказов' }).click();
    await ordersWidget.locator('.order-mini-card').filter({ hasText: 'Передан курьеру' }).waitFor();
    await screenshot('orders/history-current.png', ordersWidget);
    await ordersWidget.locator('.order-mini-card').filter({ hasText: '000103' }).locator('.order-card-header button').click();
    target = page.getByRole('dialog', { name: /^Заказ/ });
    assert.equal(await target.getByRole('button', { name: /Отменить товар/ }).count(), 0);
    await screenshot('orders/view-current.png', target);
    await close(target);

    await goods.getByRole('button', { name: 'Подсчет товара', exact: true }).click();
    target = dialog('Подсчет товара');
    for (const value of ['4601234567893', '4601234567893', '4609876543210']) {
      await target.getByPlaceholder('Отсканируйте или введите штрихкод…').fill(value);
      await target.getByRole('button', { name: 'Найти', exact: true }).click();
    }
    await screenshot('goods/counting-current.png', target);
    await close(target);

    await goods.getByRole('button', { name: 'Информация о товаре', exact: true }).click();
    target = dialog('Информация о товаре');
    assert.equal(await target.locator('.product-info-skeleton-fill').first().evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(229, 231, 235)');
    await screenshot('goods/info-empty-current.png', target);
    await target.getByLabel('Штрихкод, код или наименование товара').fill('00001297');
    await target.getByRole('button', { name: 'Найти', exact: true }).click();
    await target.getByRole('heading', { name: products[0].name }).waitFor();
    await target.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const geometry = await target.evaluate(node => {
      const metrics = node.querySelector('.product-info-metrics').getBoundingClientRect();
      const barcode = node.querySelector('.product-info-barcode').getBoundingClientRect();
      const heading = node.querySelector('h3').getBoundingClientRect();
      const marking = node.querySelector('h3 svg').getBoundingClientRect();
      const arrow = node.querySelector('.product-carousel-arrow').getBoundingClientRect();
      return { bottomDifference: Math.abs(metrics.bottom - barcode.bottom), iconCenterDifference: Math.abs((heading.top + heading.height / 2) - (marking.top + marking.height / 2)), arrowWidth: arrow.width };
    });
    assert(geometry.bottomDifference < 2, 'Metrics extend to bottom of barcode');
    assert(geometry.iconCenterDifference < 2, 'Marking is vertically centered');
    assert.equal(geometry.arrowWidth, 28);
    assert.deepEqual(await target.locator('.product-carousel-arrow svg').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width)), [14, 14, 14, 14]);
    await screenshot('goods/info-current.png', target);
    await target.getByRole('button', { name: 'Следующий снимок' }).click();
    assert.equal(await target.locator('img').getAttribute('src'), '/demo-product-2.svg');
    await target.getByRole('button', { name: 'Следующий штрихкод' }).click();
    await target.getByRole('img', { name: 'Штрихкод 4601234567800', exact: true }).waitFor();
    await close(target);
    await page.getByRole('button', { name: 'Настройки', exact: true }).click();
    target = dialog('Настройки');
    assert.equal(await target.getByRole('link', { name: 'Инструкции' }).count(), 0);
    await target.getByRole('button', { name: 'Тема: Светлая' }).click();
    await close(target);
    await goods.getByRole('button', { name: 'Информация о товаре', exact: true }).click();
    target = dialog('Информация о товаре');
    assert.equal(await target.locator('.product-info-skeleton-fill').first().evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(40, 40, 40)');
    await close(target);
    await page.getByRole('button', { name: 'Настройки', exact: true }).click();
    target = dialog('Настройки');
    await target.getByRole('button', { name: 'Тема: Тёмная' }).click();
    await close(target);

    await goods.getByRole('button', { name: /Приемка/ }).click();
    assert.equal(await goods.locator('#goods-receipts-list article').count(), 2);
    await screenshot('goods/receipts-current.png', goods);
    await goods.getByRole('button', { name: 'Открыть приемку' }).first().click();
    target = dialog('Приемка ИКЦБ-000032');
    await screenshot('goods/receipt-view-current.png', target);
    await close(target);

    const link = goods.getByRole('link', { name: 'Инструкции: Товары', exact: true });
    const headerGeometry = await goods.evaluate(node => ({ link: node.querySelector('a').getBoundingClientRect().right, counter: node.querySelector('.widget-count').getBoundingClientRect().left }));
    assert(headerGeometry.link < headerGeometry.counter && headerGeometry.counter - headerGeometry.link <= 10, 'Instructions link sits immediately left of service count');
    await link.click();
    await page.waitForURL('**/instructions#goods');
    await page.getByRole('heading', { name: 'Товары', exact: true }).waitFor();
    const images = await page.locator('figure img').evaluateAll(nodes => nodes.map(node => node.getAttribute('src')));
    for (const src of images) {
      const original = src.startsWith('/_next/image') ? new URL(src, baseURL).searchParams.get('url') : src;
      const response = await context.request.get(new URL(original, baseURL).href);
      assert.equal(response.status(), 200, `Instruction screenshot exists: ${original}`);
    }
    assert.equal(await page.locator('[id="goods-counting"]').count(), 1);
    assert.equal(await page.locator('[id="goods-info"]').count(), 1);
    assert.equal(await page.locator('[id="goods-receipts"]').count(), 1);

    await page.getByRole('link', { name: 'На главный экран' }).click();
    if (await enableAlerts.isVisible()) await enableAlerts.click();
    await goods.locator('.widget-count').filter({ hasText: /^2$/ }).waitFor();
    // Store switch must not leave the previous store's count on screen.
    await page.evaluate(() => {
      const store = { id: 'demo-empty-store', name: 'Магазин без приемок' };
      localStorage.setItem('ecom-orders-selected-store', JSON.stringify(store));
      window.dispatchEvent(new CustomEvent('ecom-orders-store-selection-change', { detail: store }));
    });
    await goods.locator('.widget-count').filter({ hasText: /^0$/ }).waitFor();
    assert.equal(await goods.getByRole('button', { name: /Приемка/ }).innerText(), '↓\nПриемка\n0\n⌄');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('tab', { name: 'Товары', exact: true }).click();
    await goods.getByRole('button', { name: 'Информация о товаре', exact: true }).click();
    target = dialog('Информация о товаре');
    await target.getByLabel('Штрихкод, код или наименование товара').fill('00001297');
    await target.getByRole('button', { name: 'Найти', exact: true }).click();
    await target.getByRole('heading', { name: products[0].name }).waitFor();
    const overflow = await target.evaluate(node => node.scrollWidth > node.clientWidth);
    assert(!overflow, 'Product dialog fits a narrow screen');
    await target.getByRole('button', { name: 'Фото', exact: true }).click();
    await target.locator('#product-info-photos img').waitFor({ state: 'visible' });
    await close(target);
    assert.deepEqual(errors, [], 'No browser runtime errors');
    console.log('Verified: shared receipt counts, store reset, instruction links/assets, product alignment, themes, carousel sizes, mobile layout, order actions and saved control.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
