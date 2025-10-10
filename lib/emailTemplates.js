// lib/emailTemplates.js

function moneyGBP(n) {
  return (n ?? 0).toLocaleString('en-GB', { style:'currency', currency:'GBP' });
}

function lineOptions(it) {
  const bits = [it?.variant?.size, it?.variant?.color].filter(Boolean);
  return bits.length ? ` (${bits.join(' • ')})` : '';
}

export function renderOrderSummaryHTML(order, settings) {
  const { storeName, storeAddress, contactNumber, supportEmail } = settings;
  const orderNo = order.orderNumber ? `#${order.orderNumber}` : order._id;

  const itemsRows = order.items.map(it => {
    const unitEx = it.unitPriceExVatGBP || 0;
    const qty = it.qty || 1;
    const lineEx = unitEx * qty;
    const vat = it.lineVat ?? Math.round((it.vatPercent ?? 0) * lineEx) / 100;
    const lineInc = it.lineTotalIncVatGBP ?? (lineEx + vat);
    return `
      <tr>
        <td style="padding:8px 0;">${it.title}${lineOptions(it)}</td>
        <td style="padding:8px 0; text-align:right;">${qty}</td>
        <td style="padding:8px 0; text-align:right;">${moneyGBP(unitEx)}</td>
        <td style="padding:8px 0; text-align:right;">${moneyGBP(lineEx)}</td>
        <td style="padding:8px 0; text-align:right;">${moneyGBP(vat)}</td>
        <td style="padding:8px 0; text-align:right;">${moneyGBP(lineInc)}</td>
      </tr>
    `;
  }).join('');

  const subtotal = order.totals?.subtotalExVatGBP ?? 0;
  const vatTotal = order.totals?.vatTotalGBP ?? 0;
  const shipping = order.totals?.shippingGBP ?? 0;
  const grandInc = order.totals?.grandTotalGBP ?? (subtotal + vatTotal + shipping);

  const addr = (a) => a ? `
    ${a.fullName || ''}<br/>
    ${a.line1 || ''}${a.line2 ? '<br/>' : ''}${a.line2 || ''}<br/>
    ${[a.city, a.region].filter(Boolean).join(', ')}<br/>
    ${[a.postcode, a.country].filter(Boolean).join(', ')}<br/>
    ${a.phone ? `☎ ${a.phone}` : ''}` : '—';

  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111; line-height:1.5;">
    <h2 style="margin:0 0 8px">${storeName}</h2>
    <div style="color:#666; font-size:12px">${storeAddress || ''}${contactNumber ? ' • ' + contactNumber : ''}${supportEmail ? ' • ' + supportEmail : ''}</div>
    <hr style="margin:16px 0; border:none; border-top:1px solid #eee"/>

    <h3 style="margin:0 0 6px;">Order ${orderNo}</h3>
    <div style="color:#666; font-size:12px; margin-bottom:12px;">
      Placed ${new Date(order.createdAt).toLocaleString()}
    </div>

    <table style="width:100%; border-collapse:collapse; font-size:14px;">
      <thead>
        <tr style="color:#666; text-align:left;">
          <th style="padding:6px 0;">Product</th>
          <th style="padding:6px 0; text-align:right;">Qty</th>
          <th style="padding:6px 0; text-align:right;">Unit (ex)</th>
          <th style="padding:6px 0; text-align:right;">Line (ex)</th>
          <th style="padding:6px 0; text-align:right;">VAT</th>
          <th style="padding:6px 0; text-align:right;">Line (inc)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div style="margin-top:12px; display:flex; gap:24px; font-size:14px;">
      <div>
        <div style="font-weight:600; margin-bottom:4px;">Billing</div>
        <div>${addr(order.billingAddress)}</div>
      </div>
      <div>
        <div style="font-weight:600; margin-bottom:4px;">Shipping</div>
        <div>${addr(order.shippingAddress)}</div>
      </div>
    </div>

    <div style="margin-top:12px; padding-top:12px; border-top:1px solid #eee; font-size:14px;">
      <div>Subtotal (ex): <strong style="float:right;">${moneyGBP(subtotal)}</strong></div>
      <div>VAT: <strong style="float:right;">${moneyGBP(vatTotal)}</strong></div>
      <div>Delivery: <strong style="float:right;">${shipping === 0 ? 'Free' : moneyGBP(shipping)}</strong></div>
      <div style="margin-top:6px; font-size:16px;">Total: <strong style="float:right;">${moneyGBP(grandInc)}</strong></div>
    </div>
  </div>
  `;
}

export function subjectCustomerCreated(order, settings) {
  const no = order.orderNumber ? `#${order.orderNumber}` : order._id;
  return `Thanks for your order ${no} — ${settings.storeName}`;
}

export function subjectCustomerShipped(order, settings) {
  const no = order.orderNumber ? `#${order.orderNumber}` : order._id;
  return `Your order ${no} has shipped — ${settings.storeName}`;
}

export function subjectAdminNew(order, settings) {
  const no = order.orderNumber ? `#${order.orderNumber}` : order._id;
  return `New order ${no} — ${settings.storeName}`;
}

export function subjectPasswordReset(settings) {
  return `Reset your password — ${settings?.storeName || 'My Store'}`;
}

export function renderPasswordResetHTML(link, settings) {
  return `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
      <h2>${settings?.storeName || 'My Store'}</h2>
      <p>We received a request to reset your password. Click the button below to choose a new one.</p>
      <p style="margin:16px 0">
        <a href="${link}" style="background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">
          Reset password
        </a>
      </p>
      <p>Or paste this link in your browser:</p>
      <p><a href="${link}">${link}</a></p>
      <p style="color:#666;font-size:12px">If you didn’t request this, you can safely ignore this email.</p>
    </div>
  `;
}