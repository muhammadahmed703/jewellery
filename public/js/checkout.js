function renderCheckoutSummary() { renderSummary(); }

function renderSummary() {
  const cart = getCart();
  const box = document.getElementById('summaryItems');
  if (!box) return;

  if (!cart.length) {
    document.getElementById('checkoutSection').innerHTML =
      '<div class="success-card"><div style="font-size:3rem">🛍</div><h2>Your bag is empty</h2><p>Add products before checkout.</p><a href="/shop.html" class="btn btn-gold" style="margin-top:20px">Shop Now</a></div>';
    return;
  }

  box.innerHTML = cart.map(i => `
    <div class="sum-row"><span>${esc(i.title)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>
  `).join('');
  document.getElementById('summaryTotal').textContent =
    money(cart.reduce((s, i) => s + i.price * i.qty, 0));
}

document.addEventListener('DOMContentLoaded', () => {
  renderSummary();

  document.getElementById('checkoutForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const cart = getCart();

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: f.name.value.trim(),
        phone: f.phone.value.trim(),
        city: f.city.value.trim(),
        address: f.address.value.trim(),
        items: cart.map(i => ({ id: i.id, qty: i.qty }))
      })
    });

    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Order failed'); return; }

    localStorage.removeItem(CART_KEY);
    updateCartUI();
    document.getElementById('checkoutSection').style.display = 'none';
    document.getElementById('successCard').style.display = 'block';
    document.getElementById('successOrderId').textContent = data.order.id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
