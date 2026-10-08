const adminToken = () => sessionStorage.getItem('hos_admin');

document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: document.getElementById('adminPass').value })
  });
  const data = await res.json();
  if (!res.ok) { document.getElementById('loginErr').textContent = data.error; return; }
  sessionStorage.setItem('hos_admin', data.token);
  showAdmin();
});

function showAdmin() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminShell').style.display = 'block';
  loadStats(); loadAdminProducts(); loadAdminOrders();
}

function logout() { sessionStorage.removeItem('hos_admin'); location.reload(); }

async function loadStats() {
  const [products, orders] = await Promise.all([
    fetch('/api/products').then(r => r.json()),
    fetch('/api/orders', { headers: { 'x-admin-token': adminToken() } }).then(r => r.json())
  ]);
  document.getElementById('statProducts').textContent = products.length;
  document.getElementById('statOrders').textContent = orders.length;
  document.getElementById('statRevenue').textContent =
    money(orders.reduce((s, o) => s + o.total, 0));
}

const imageInput = document.getElementById('imageInput');
imageInput?.addEventListener('change', () => {
  document.getElementById('previewRow').innerHTML =
    [...imageInput.files].map(f =>
      `<img src="${URL.createObjectURL(f)}" alt="preview"/>`).join('');
});

document.getElementById('postForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  const fd = new FormData();
  fd.append('title', f.title.value);
  fd.append('category', f.category.value);
  fd.append('price', f.price.value);
  fd.append('stock', f.stock.value);
  fd.append('description', f.description.value);
  [...imageInput.files].forEach(file => fd.append('images', file));

  const btn = f.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Publishing...';

  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'x-admin-token': adminToken() },
    body: fd
  });
  const data = await res.json();

  btn.disabled = false; btn.textContent = '🚀 Publish Ad — Go Live';

  if (!res.ok) { toast(data.error || 'Failed to publish'); return; }
  toast('🎉 Ad published — live on shop now!');
  f.reset();
  imageInput.value = '';
  document.getElementById('previewRow').innerHTML = '';
  loadStats(); loadAdminProducts();
});

async function loadAdminProducts() {
  const products = await (await fetch('/api/products')).json();
  document.getElementById('productsBody').innerHTML = products.map(p => `
    <tr>
      <td><img src="${esc(p.images[0] || '')}" onerror="this.src='https://picsum.photos/seed/hs${p.id}/100/100.jpg'"/></td>
      <td><strong>${esc(p.title)}</strong></td>
      <td>${esc(p.category)}</td>
      <td>${money(p.price)}</td>
      <td>${p.stock}</td>
      <td><button class="btn-danger" onclick="deleteProduct(${p.id})">Delete</button></td>
    </tr>`).join('');
}

async function deleteProduct(id) {
  if (!confirm('Delete this listing permanently?')) return;
  await fetch('/api/products/' + id, { method: 'DELETE', headers: { 'x-admin-token': adminToken() } });
  toast('Listing deleted');
  loadStats(); loadAdminProducts();
}

async function loadAdminOrders() {
  const orders = await (await fetch('/api/orders', { headers: { 'x-admin-token': adminToken() } })).json();
  document.getElementById('ordersBody').innerHTML = orders.length ? orders.map(o => `
    <tr>
      <td><strong>${esc(o.id)}</strong></td>
      <td>${esc(o.name)}<br><small>${esc(o.phone)}</small></td>
      <td>${esc(o.city)}</td>
      <td>${money(o.total)}</td>
      <td>
        <select class="status-pill status-${esc(o.status)}" onchange="updateOrder('${o.id}', this.value)"
          style="border:none;background:none;font-weight:700;cursor:pointer">
          <option ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
        </select>
      </td>
      <td><button class="btn-danger" onclick="deleteOrder('${o.id}')">Delete</button></td>
    </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:#999;padding:26px">No orders yet</td></tr>';
}

async function updateOrder(id, status) {
  await fetch('/api/orders/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken() },
    body: JSON.stringify({ status })
  });
  toast('Order → ' + status);
  loadStats();
}

async function deleteOrder(id) {
  if (!confirm('Delete this order?')) return;
  await fetch('/api/orders/' + id, { method: 'DELETE', headers: { 'x-admin-token': adminToken() } });
  toast('Order removed');
  loadStats(); loadAdminOrders();
}

if (adminToken()) showAdmin();
