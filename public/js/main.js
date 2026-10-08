const money = n => 'Rs ' + Number(n).toLocaleString('en-PK');
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

const CART_KEY = 'hos_cart';
const getCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartUI();
}

function addToCart(p, qty = 1) {
  if (!p || p.stock <= 0) { toast('Sorry, this item is out of stock'); return false; }
  const cart = getCart();
  const existing = cart.find(i => i.id === p.id);
  if (existing) {
    if (existing.qty + qty > p.stock) { toast(`Only ${p.stock} available in stock`); return false; }
    existing.qty += qty;
  } else {
    cart.push({ id: p.id, title: p.title, price: p.price, image: p.images?.[0] || '', stock: p.stock, qty });
  }
  saveCart(cart);
  toast('✓ Added to your bag!');
  return true;
}

function changeCartQty(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty > item.stock) { item.qty = item.stock; toast(`Only ${item.stock} available`); }
  if (item.qty <= 0) cart.splice(cart.indexOf(item), 1);
  saveCart(cart);
  renderCheckoutSummary?.();
}

function removeCartItem(id) {
  saveCart(getCart().filter(i => i.id !== id));
  toast('Item removed');
  renderCheckoutSummary?.();
}

function openCart()  { document.getElementById('cartSidebar').classList.add('open');
                       document.getElementById('cartOverlay').classList.add('open'); }
function closeCart() { document.getElementById('cartSidebar').classList.remove('open');
                       document.getElementById('cartOverlay').classList.remove('open'); }

function updateCartUI() {
  const cart = getCart();
  const badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = cart.reduce((s, i) => s + i.qty, 0);
  renderCartSidebar();
}

function renderCartSidebar() {
  const box = document.getElementById('cartItems');
  if (!box) return;
  const cart = getCart();
  if (!cart.length) {
    box.innerHTML = '<div class="cart-empty"><div style="font-size:2.5rem">🛍</div><p>Your bag is empty.<br>Add some sparkle! ✨</p></div>';
  } else {
    box.innerHTML = cart.map(i => `
      <div class="cart-item">
        <img src="${esc(i.image)}" alt="" onerror="this.src='https://picsum.photos/seed/hs/100/100.jpg'"/>
        <div>
          <h4>${esc(i.title)}</h4>
          <div class="ci-price">${money(i.price)}</div>
          <div class="ci-qty">
            <button onclick="changeCartQty(${i.id},-1)">−</button>
            <strong>${i.qty}</strong>
            <button onclick="changeCartQty(${i.id},1)">+</button>
            <button class="ci-remove" onclick="removeCartItem(${i.id})">🗑</button>
          </div>
        </div>
      </div>`).join('');
  }
  document.getElementById('cartTotal').textContent =
    money(cart.reduce((s, i) => s + i.price * i.qty, 0));
}

function renderProductCard(p) {
  const out = p.stock <= 0;
  return `
  <article class="prod-card reveal">
    <div class="prod-img">
      <span class="prod-badge ${out ? 'out' : ''}">${out ? 'Sold Out' : esc(p.category)}</span>
      <a href="/product.html?id=${p.id}"><img src="${esc(p.images[0] || '')}" alt="${esc(p.title)}"
        onerror="this.src='https://picsum.photos/seed/hs${p.id}/600/600.jpg'"/></a>
      <button class="prod-add" ${out ? 'disabled' : ''} onclick='addToCart(${JSON.stringify(p)})'>
        ${out ? 'Out of Stock' : '+ Add to Cart'}
      </button>
    </div>
    <div class="prod-body">
      <span class="prod-cat">${esc(p.category)}</span>
      <h3 class="prod-title"><a href="/product.html?id=${p.id}">${esc(p.title)}</a></h3>
      <div class="prod-price">${money(p.price)} <small>${p.stock > 0 ? '· In Stock' : ''}</small></div>
    </div>
  </article>`;
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.12 });

function initReveal() { document.querySelectorAll('.reveal').forEach(el => observer.observe(el)); }

document.addEventListener('DOMContentLoaded', () => {
  const ham = document.getElementById('hamburger');
  const links = document.getElementById('navLinks');
  if (ham && links) ham.addEventListener('click', () => links.classList.toggle('open'));
  initReveal();
  updateCartUI();
});
