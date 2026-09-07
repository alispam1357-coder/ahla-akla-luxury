const root = document.querySelector('#app');
let lang = localStorage.getItem('ahla-lang') || 'ar';
const t = (ar, en) => lang === 'ar' ? ar : en;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const money = value => `${Number(value || 0).toLocaleString()} EGP`;
const normalizeLocalLinks = () => document.querySelectorAll('a[href="/"]').forEach(link => link.setAttribute('href', 'index.html'));
const normalizeLocalAssets = () => document.querySelectorAll('img[src="/placeholder-food.svg"]').forEach(image => image.setAttribute('src', 'placeholder-food.svg'));

function login() {
  root.innerHTML = `<div class="admin-login"><div class="login-art"><span>🍽️</span><h1>أحلى أكلة</h1><p>Kitchen, but make it yours.</p></div><form id="loginForm"><p class="eyebrow">CHEF ACCESS</p><h2>${t('دخول الشيف', 'Chef login')}</h2><label>${t('اسم المستخدم', 'Username')}<input name="username" value="chef" required></label><label>${t('كلمة المرور', 'Password')}<input name="password" type="password" required></label><button>${t('دخول', 'Login')} <span>←</span></button><a href="/">← ${t('العودة للموقع', 'Back to website')}</a><button type="button" class="lang-btn" id="adminLang">EN / عربي</button><p id="loginError" class="error-message"></p></form></div>`;
  document.querySelector('#loginForm').onsubmit = async event => {
    event.preventDefault();
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
    if (response.ok) return dashboard();
    document.querySelector('#loginError').textContent = t('بيانات الدخول غير صحيحة', 'Invalid login');
  };
  document.querySelector('#adminLang').onclick = () => { lang = lang === 'ar' ? 'en' : 'ar'; localStorage.setItem('ahla-lang', lang); login(); };
  normalizeLocalLinks();
  normalizeLocalAssets();
}

async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !window.isSecureContext) return;
  try {
    const keyResponse = await fetch('/api/push/public-key');
    if (!keyResponse.ok) return;
    const { publicKey } = await keyResponse.json();
    const registration = await navigator.serviceWorker.register('sw.js');
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted') return;
    const encodedKey = publicKey.replace(/-/g, '+').replace(/_/g, '/');
    const applicationServerKey = Uint8Array.from(atob(encodedKey.padEnd(encodedKey.length + (4 - encodedKey.length % 4) % 4, '=')), character => character.charCodeAt(0));
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(subscription) });
  } catch (error) {
    console.warn('Push registration unavailable', error);
  }
}

async function dashboard() {
  const [productResponse, orderResponse, settingsResponse, buffetResponse] = await Promise.all([fetch('/api/admin/products'), fetch('/api/admin/orders'), fetch('/api/admin/settings'), fetch('/api/admin/buffet-requests')]);
  if (!productResponse.ok || !orderResponse.ok || !settingsResponse.ok || !buffetResponse.ok) return login();
  const data = await productResponse.json();
  const orders = await orderResponse.json();
  const settings = await settingsResponse.json();
  const buffetRequests = await buffetResponse.json();
  window.currentOrders = orders;
  root.innerHTML = `<div class="admin-shell"><aside><a class="admin-brand" href="/">🍽️ <span>أحلى أكلة<small>Chef Soha El Akad</small></span></a><nav><button class="active" data-tab="products">📦 ${t('المنيو', 'Menu')}</button><button data-tab="orders">🧾 ${t('الطلبات', 'Orders')} <b>${orders.filter(order => order.status === 'new').length}</b></button><button data-tab="buffets">🎉 ${t('طلبات البوفيه', 'Buffet requests')} <b>${buffetRequests.filter(request => request.status === 'NEW').length}</b></button></nav><button id="logout">↪ ${t('تسجيل الخروج', 'Log out')}</button></aside><main><header><div><p class="eyebrow">CHEF SOHA EL AKAD</p><h1>${t('إدارة المطبخ', 'Kitchen dashboard')}</h1></div><a href="/" class="view-site">${t('زيارة الموقع', 'View website')} ↗</a></header><div id="panel"></div></main></div>`;
  document.querySelector('#logout').onclick = async () => { await fetch('/api/admin/logout', { method: 'POST' }); login(); };
  document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => { document.querySelectorAll('[data-tab]').forEach(item => item.classList.remove('active')); button.classList.add('active'); if (button.dataset.tab === 'orders') renderOrders(orders); else if (button.dataset.tab === 'buffets') renderBuffetRequests(buffetRequests); else renderProducts(data, settings); });
  renderProducts(data, settings);
  normalizeLocalLinks();
  normalizeLocalAssets();
  registerPush();
}

function renderStats(orders) {
  const counts = { new: 0, preparing: 0, ready: 0, completed: 0 };
  orders.forEach(order => { if (order.status === 'delivered') counts.completed++; else if (counts[order.status] !== undefined) counts[order.status]++; });
  return `<div class="stats"><div class="stat-new"><span>${t('طلبات جديدة', 'New orders')}</span><strong>${counts.new}</strong></div><div><span>${t('قيد التحضير', 'Preparing')}</span><strong>${counts.preparing}</strong></div><div><span>${t('جاهزة', 'Ready')}</span><strong>${counts.ready}</strong></div><div><span>${t('مكتملة', 'Completed')}</span><strong>${counts.completed}</strong></div><div><span>${t('إجمالي الطلبات', 'Total orders')}</span><strong>${orders.length}</strong></div><div><span>${t('مبيعات الطلبات', 'Order sales')}</span><strong>${money(orders.filter(order => order.status !== 'cancelled').reduce((sum, order) => sum + Number(order.total || 0), 0))}</strong></div></div>`;
}

function renderProducts(data, settings) {
  document.querySelector('#panel').innerHTML = `${renderStats(window.currentOrders || [])}<section class="admin-panel"><div class="panel-title"><h2>${t('بيانات التواصل', 'Contact settings')}</h2></div><form id="chefSettings" class="inline-form"><label>${t('رقم هاتف الشيف', 'Chef phone number')}<input name="chefPhone" type="tel" value="${escapeHtml(settings.chefPhone)}" placeholder="01XXXXXXXXX" required></label><button class="add">${t('حفظ الرقم', 'Save phone')}</button></form><form id="buffetPriceSettings" class="inline-form"><label>${t('سعر البوفيه للفرد', 'Buffet Price Per Person')}<input name="buffetPricePerPerson" type="number" min="0.01" max="1000000" step="0.01" value="${settings.buffetPricePerPerson || ''}" required></label><span>EGP / ${t('فرد', 'person')}</span><button class="add">${t('حفظ السعر', 'Save Price')}</button></form></section><section class="admin-panel"><div class="panel-title"><h2>${t('قائمة الأكل', 'Menu catalog')}</h2><button class="add" id="addDish">+ ${t('إضافة طبق', 'Add dish')}</button></div><div class="table">${data.products.map(product => `<article class="product-row"><div class="product-name"><img src="${escapeHtml(product.image || '/placeholder-food.svg')}" alt=""><div><strong>${escapeHtml(product.name_ar)}</strong><small>${escapeHtml(product.name_en)}</small></div></div><label class="price-edit"><span>${t('السعر المطبوخ', 'Cooked price')}</span><input type="number" min="0" step="1" value="${product.price_cooked ?? ''}" data-price="${product.id}" data-price-type="cooked"></label><label class="price-edit"><span>${t('سعر التسوية', 'Ready price')}</span><input type="number" min="0" step="1" value="${product.price_ready ?? ''}" data-price="${product.id}" data-price-type="ready"></label><button class="availability ${product.visible ? 'on' : ''}" data-visibility="${product.id}" title="${t('تغيير التوفر', 'Toggle availability')}">${product.visible ? '●' : '○'}</button><button class="edit" data-edit="${product.id}">${t('تعديل', 'Edit')}</button><button class="danger" data-delete="${product.id}">×</button></article>`).join('')}</div></section>`;
  document.querySelector('#chefSettings').onsubmit = async event => { event.preventDefault(); const response = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(event.target))) }); if (!response.ok) return alert(t('اكتبي رقم هاتف مصري صحيح', 'Enter a valid Egyptian phone number')); dashboard(); };
  document.querySelector('#buffetPriceSettings').onsubmit = async event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.target)); const response = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) }); if (!response.ok) return alert(t('اكتبي سعرًا أكبر من صفر', 'Enter a price greater than zero')); dashboard(); };
  document.querySelector('#addDish').onclick = () => showProductForm(data.categories);
  document.querySelectorAll('[data-price]').forEach(input => input.onchange = () => updateProduct(input.dataset.price, { [`price_${input.dataset.priceType}`]: input.value === '' ? null : Number(input.value) }));
  document.querySelectorAll('[data-visibility]').forEach(button => button.onclick = () => updateProduct(button.dataset.visibility, { visible: button.classList.contains('on') ? 0 : 1 }));
  document.querySelectorAll('[data-delete]').forEach(button => button.onclick = async () => { if (!confirm(t('حذف الطبق؟ لا يمكن التراجع.', 'Delete this dish? This cannot be undone.'))) return; await fetch(`/api/admin/products/${button.dataset.delete}`, { method: 'DELETE' }); dashboard(); });
  document.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => showProductForm(data.categories, data.products.find(product => product.id === Number(button.dataset.edit))));
}

function showProductForm(categories, product = {}) {
  const form = document.createElement('form');
  form.className = 'product-form';
  form.innerHTML = `<h2>${product.id ? t('تعديل الطبق', 'Edit dish') : t('إضافة طبق', 'Add dish')}</h2><label>${t('الاسم بالعربي', 'Arabic name')}<input name="name_ar" value="${escapeHtml(product.name_ar)}" required></label><label>${t('الاسم بالإنجليزي', 'English name')}<input name="name_en" value="${escapeHtml(product.name_en)}" required></label><label>${t('التصنيف', 'Category')}<select name="category_id" required>${categories.map(category => `<option value="${category.id}" ${category.id === product.category_id ? 'selected' : ''}>${escapeHtml(category.name_ar)}</option>`).join('')}</select></label><label>${t('الوصف', 'Description')}<textarea name="description_ar">${escapeHtml(product.description_ar)}</textarea></label><label>${t('السعر المطبوخ', 'Cooked price')}<input name="price_cooked" type="number" min="0" step="1" value="${product.price_cooked ?? ''}"></label><label>${t('سعر التسوية', 'Ready price')}<input name="price_ready" type="number" min="0" step="1" value="${product.price_ready ?? ''}"></label><label>${t('الصورة', 'Photo')}<input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><div class="form-actions"><button type="button" class="cancel">${t('إلغاء', 'Cancel')}</button><button>${t('حفظ', 'Save')}</button></div>`;
  document.body.append(form);
  form.querySelector('.cancel').onclick = () => form.remove();
  form.onsubmit = async event => { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); const photo = values.photo; delete values.photo; values.category_id = Number(values.category_id); values.price_cooked = values.price_cooked ? Number(values.price_cooked) : null; values.price_ready = values.price_ready ? Number(values.price_ready) : null; const response = await fetch(product.id ? `/api/admin/products/${product.id}` : '/api/admin/products', { method: product.id ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) }); if (!response.ok) return alert(t('تعذر حفظ الطبق', 'Could not save dish')); const saved = product.id ? product.id : (await response.json()).id; if (photo?.size) { const upload = new FormData(); upload.append('photo', photo); await fetch(`/api/admin/products/${saved}/photo`, { method: 'POST', body: upload }); } form.remove(); dashboard(); };
}
async function updateProduct(id, changes) { await fetch(`/api/admin/products/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(changes) }); dashboard(); }

function renderOrders(orders) {
  window.currentOrders = orders;
  const statuses = [['new', 'New'], ['confirmed', 'Confirmed'], ['preparing', 'Preparing'], ['ready', 'Ready'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];
  document.querySelector('#panel').innerHTML = `${renderStats(orders)}<section class="admin-panel"><div class="panel-title"><h2>${t('الطلبات الواردة', 'Incoming orders')}</h2><span class="order-count">${orders.length} ${t('طلب', 'orders')}</span></div><div class="orders">${orders.length ? orders.map(order => `<article class="order-card ${order.status === 'new' ? 'is-new' : ''}"><div class="order-head"><strong>#${escapeHtml(order.order_number)}</strong><span class="status ${order.status}">${escapeHtml(order.status)}</span><small>${new Date(order.created_at).toLocaleString()}</small></div><div class="customer-details"><b>${escapeHtml(order.customer_name)}</b><a href="tel:${escapeHtml(order.phone)}">☎ ${escapeHtml(order.phone)}</a><span>⌖ ${escapeHtml(order.address)}</span></div><div class="order-items">${order.items.map(item => `<span>${escapeHtml(item.product_name)} · ${item.option_name} × ${item.quantity} · ${money(item.unit_price)}</span>`).join('')}</div><div class="chef-notes"><b>${t('تعليمات الشيف', 'Chef instructions')}</b><p>${order.notes ? escapeHtml(order.notes) : t('لا توجد تعليمات إضافية', 'No extra instructions')}</p></div><div class="order-bottom"><strong>${money(order.total)}</strong><select data-order="${order.id}">${statuses.map(([value, label]) => `<option value="${value}" ${value === order.status || (value === 'completed' && order.status === 'delivered') ? 'selected' : ''}>${t({ new: 'جديد', confirmed: 'مؤكد', preparing: 'قيد التحضير', ready: 'جاهز', completed: 'مكتمل', cancelled: 'ملغي' }[value], label)}</option>`).join('')}</select></div></article>`).join('') : `<p class="empty-state">${t('لا توجد طلبات حتى الآن.', 'No orders yet.')}</p>`}</div></section>`;
  document.querySelectorAll('[data-order]').forEach(select => select.onchange = async () => { await fetch(`/api/admin/orders/${select.dataset.order}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: select.value }) }); dashboard(); });
}

function renderBuffetRequests(requests) {
  const statuses = ['NEW', 'REVIEWING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  const rows = requests.map(request => `<article class="order-card ${request.status === 'NEW' ? 'is-new' : ''}"><div class="order-head"><strong>#${escapeHtml(request.request_number)}</strong><span class="status ${request.status}">${escapeHtml(request.status)}</span><small>${new Date(request.created_at).toLocaleString()}</small></div><div class="customer-details"><b>${escapeHtml(request.customer_name)}</b><a href="tel:${escapeHtml(request.phone)}">☎ ${escapeHtml(request.phone)}</a><span>${request.guests} ${t('شخص', 'people')} · ${escapeHtml(request.event_date || t('بدون تاريخ', 'No date'))}</span><span>${escapeHtml(request.event_occasion || t('بدون مناسبة محددة', 'No occasion'))}</span><span>⌖ ${escapeHtml(request.address)}</span></div><div class="order-bottom"><strong>${money(request.total)} <small>${money(request.price_per_person)} / ${t('فرد', 'person')}</small></strong><select data-buffet-order="${request.id}">${statuses.map(status => `<option value="${status}" ${status === request.status ? 'selected' : ''}>${status}</option>`).join('')}</select></div><div class="order-items"><b>${t('الأكلات المختارة', 'Selected food')}</b>${(request.selections.meals || []).map(meal => `<span>${escapeHtml(meal)}</span>`).join('')}</div><div class="chef-notes"><b>${t('ماذا يحتاج العميل', 'What the customer needs')}</b><p>${escapeHtml(request.requirements || '-')}</p><b>${t('تعليمات إضافية', 'Extra instructions')}</b><p>${request.notes ? escapeHtml(request.notes) : t('لا توجد تعليمات إضافية', 'No extra instructions')}</p></div></article>`).join('');
  document.querySelector('#panel').innerHTML = `<section class="admin-panel"><div class="panel-title"><h2>${t('طلبات البوفيه', 'Buffet requests')}</h2><span class="order-count">${requests.length} ${t('طلب', 'requests')}</span></div><div class="orders">${rows || `<p class="empty-state">${t('لا توجد طلبات بوفيه.', 'No buffet requests yet.')}</p>`}</div></section>`;
  document.querySelectorAll('[data-buffet-order]').forEach(select => select.onchange = async () => { await fetch(`/api/admin/buffet-requests/${select.dataset.buffetOrder}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: select.value }) }); dashboard(); });
}

window.currentOrders = [];
login();
