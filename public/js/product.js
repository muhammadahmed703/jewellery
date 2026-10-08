let product = null;
let qty = 1;

const id = new URLSearchParams(location.search).get('id');

function changeQty(d) {
  qty = Math.max(1, Math.min(qty + d, product?.stock || 99));
  document.getElementById('qtyVal').textContent = qty;
}

async function loadProduct() {
  if (!id) { location.href = '/shop.html'; return; }
  const res = await fetch('/api/products/' + id);
  product = await res.json();

  if (!res.ok || product.error) {
    document.querySelector('.detail-wrap').innerHTML =
      '<div class="empty-state"><div class="big">💔</div><h2>Product not found</h2><a href="/shop.html" class="btn btn-gold">Back to Shop</a></div>';
    return;
  }

  document.title = product.title + ' — House of Sheikh';
  document.getElementById('pCat').textContent = product.category;
  document.getElementById('pTitle').textContent = product.title;
  document.getElementById('pPrice').textContent = money(product.price);
  document.getElementById('pDesc').textContent = product.description || 'No description provided.';
  document.getElementById('specCat').textContent = product.category;
  document.getElementById('specSku').textContent = 'HOS-' + String(product.id).padStart(4, '0');

  const pill = document.getElementById('pStock');
  let pillClass = 'stock-in', pillText = `In Stock — ${product.stock} available`;
  if (product.stock <= 0) { pillClass = 'stock-out'; pillText = 'Out of Stock'; }
  else if (product.stock <= 3) { pillClass = 'stock-low'; pillText = `Only ${product.stock} left — hurry!`; }
  pill.className = 'stock-pill ' + pillClass;
  pill.textContent = pillText;
  document.getElementById('specAvail').textContent = pillText;

  const imgs = product.images.length ? product.images : ['https://picsum.photos/seed/hs' + product.id + '/700/700.jpg'];
  const main = document.getElementById('mainImg');
  main.src = imgs[0];
  document.getElementById('galleryThumbs').innerHTML = imgs.map((src, i) =>
    `<img src="${esc(src)}" class="${i === 0 ? 'active' : ''}" onclick="setGallery(this)"/>`).join('');

  const all = await (await fetch('/api/products')).json();
  const related = all.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  document.getElementById('relatedGrid').innerHTML =
    related.map(renderProductCard).join('') ||
    all.filter(p => p.id !== product.id).slice(0, 4).map(renderProductCard).join('');
  initReveal();
}

function setGallery(thumb) {
  document.getElementById('mainImg').src = thumb.src;
  document.querySelectorAll('.gallery-thumbs img').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

function addDetailToCart() { addToCart(product, qty); }

function buyNow() {
  if (addToCart(product, qty)) location.href = '/checkout.html';
}

loadProduct();
