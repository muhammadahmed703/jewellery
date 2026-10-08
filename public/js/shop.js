let allProducts = [];

async function initShop() {
  const res = await fetch('/api/products');
  allProducts = await res.json();

  const featured = document.getElementById('featuredGrid');
  if (featured) {
    featured.innerHTML = allProducts.slice(0, 8).map(renderProductCard).join('');
    initReveal();
  }

  const grid = document.getElementById('shopGrid');
  if (grid) {
    // Pre-select category if ?cat= is in URL
    const urlCat = new URLSearchParams(location.search).get('cat');
    if (urlCat) document.getElementById('filterCat').value = urlCat;

    ['searchBox', 'filterCat', 'sortBy'].forEach(id =>
      document.getElementById(id).addEventListener('input', renderShop));
    renderShop();
  }
}

function renderShop() {
  const q = document.getElementById('searchBox').value.toLowerCase().trim();
  const cat = document.getElementById('filterCat').value;
  const sort = document.getElementById('sortBy').value;

  let list = allProducts.filter(p =>
    (!cat || p.category === cat) &&
    (!q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
  );

  if (sort === 'low')  list.sort((a, b) => a.price - b.price);
  if (sort === 'high') list.sort((a, b) => b.price - a.price);
  if (sort === 'az')   list.sort((a, b) => a.title.localeCompare(b.title));

  document.getElementById('resultCount').textContent =
    `${list.length} product${list.length !== 1 ? 's' : ''} found`;

  const grid = document.getElementById('shopGrid');
  grid.innerHTML = list.length
    ? list.map(renderProductCard).join('')
    : `<div class="empty-state"><div class="big">💎</div><h3>No products found</h3><p>Try a different search or category.</p></div>`;
  initReveal();
}

initShop();

if (document.getElementById('hero')) {
  const slides = document.querySelectorAll('.slide');
  const dotsWrap = document.getElementById('heroDots');
  let current = 0, timer;

  slides.forEach((_, i) => {
    const d = document.createElement('span');
    if (i === 0) d.classList.add('active');
    d.onclick = () => goTo(i);
    dotsWrap.appendChild(d);
  });
  const dots = dotsWrap.querySelectorAll('span');

  function show(i) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (i + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }
  function goTo(i) { show(i); restart(); }
  function restart() { clearInterval(timer); timer = setInterval(() => show(current + 1), 5500); }
  window.moveSlide = dir => { show(current + dir); restart(); };
  restart();
}
