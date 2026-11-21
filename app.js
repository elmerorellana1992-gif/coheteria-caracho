document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'coheteria_caracho_cart_v1';
  let cart = loadCart();

  const cartDrawer = document.getElementById('cartDrawer');
  const cartBackdrop = document.getElementById('cartBackdrop');
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  const cartSubtotalEl = document.getElementById('cartSubtotal');
  const headerCartCountEl = document.getElementById('headerCartCount');
  const floatingCartCountEl = document.getElementById('floatingCartCount');
  const floatingCartTotalEl = document.getElementById('floatingCartTotal');
  const sendWhatsappBtn = document.getElementById('sendWhatsappBtn');
  const clearCartBtn = document.getElementById('clearCartBtn');
  const customerNameInput = document.getElementById('customerName');
  const whatsappNumberSelect = document.getElementById('whatsappNumberSelect');
  const orderNotesInput = document.getElementById('orderNotes');
  const productGrid = document.getElementById('productGrid');

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignorar si el almacenamiento no está disponible
    }
  }

  function formatLempiras(amount) {
    const num = Number(amount) || 0;
    return `L ${num.toLocaleString('es-HN')}`;
  }

  function openCart() {
    if (!cartDrawer || !cartBackdrop) return;
    cartDrawer.classList.add('open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    cartBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    if (!cartDrawer || !cartBackdrop) return;
    cartDrawer.classList.remove('open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    cartBackdrop.hidden = true;
    document.body.style.overflow = '';
  }

  function parseProductFromCard(card) {
    const titleEl = card.querySelector('h3');
    const priceEl = card.querySelector('.price');

    const name = (card.dataset.name || (titleEl ? titleEl.textContent : '') || 'Producto').trim();
    const rawPrice = card.dataset.price || (priceEl ? priceEl.textContent.replace(/[^\d.]/g, '') : '0');
    const price = Number(rawPrice) || 0;
    const id = (
      card.dataset.id ||
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
    );

    return { id, name, price };
  }

  function addToCart(product, triggerBtn) {
    if (!product || !product.id) return;

    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        qty: 1
      });
    }

    saveCart();
    renderCart();

    if (triggerBtn) {
      const originalText = triggerBtn.dataset.originalText || triggerBtn.textContent;
      triggerBtn.dataset.originalText = originalText;
      triggerBtn.textContent = '✓ Agregado';
      triggerBtn.classList.add('added');

      if (triggerBtn._resetTimer) {
        clearTimeout(triggerBtn._resetTimer);
      }
      triggerBtn._resetTimer = setTimeout(() => {
        triggerBtn.textContent = originalText;
        triggerBtn.classList.remove('added');
      }, 900);
    }
  }

  function changeQty(id, delta) {
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter((entry) => entry.id !== id);
    }

    saveCart();
    renderCart();
  }

  function removeItem(id) {
    cart = cart.filter((entry) => entry.id !== id);
    saveCart();
    renderCart();
  }

  function clearCart() {
    cart = [];
    saveCart();
    renderCart();
  }

  function renderCart() {
    const totalQty = cart.reduce((acc, item) => acc + (Number(item.qty) || 0), 0);
    const totalAmount = cart.reduce(
      (acc, item) => acc + (Number(item.price) || 0) * (Number(item.qty) || 0),
      0
    );

    if (headerCartCountEl) headerCartCountEl.textContent = totalQty;
    if (floatingCartCountEl) floatingCartCountEl.textContent = totalQty;
    if (floatingCartTotalEl) floatingCartTotalEl.textContent = formatLempiras(totalAmount);
    if (cartSubtotalEl) cartSubtotalEl.textContent = formatLempiras(totalAmount);
    if (sendWhatsappBtn) sendWhatsappBtn.disabled = cart.length === 0;

    if (!cartItemsContainer) return;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="cart-empty">
          <span>🎆</span>
          <p>Tu carrito está vacío.<br>Presiona <strong>+ Agregar</strong> en cualquier producto para armar tu pedido.</p>
        </div>
      `;
      return;
    }

    cartItemsContainer.innerHTML = cart
      .map((item) => {
        const unitPrice = Number(item.price) || 0;
        const qty = Number(item.qty) || 1;
        const subtotal = unitPrice * qty;

        return `
          <div class="cart-item" data-id="${escapeHtml(item.id)}">
            <div>
              <p class="cart-item-title">${escapeHtml(item.name)}</p>
              <span class="cart-item-unit">${formatLempiras(unitPrice)} c/u</span>
            </div>
            <div class="cart-item-subtotal">${formatLempiras(subtotal)}</div>
            <div class="qty-controls">
              <button type="button" class="qty-btn" data-action="dec" aria-label="Restar unidad">−</button>
              <span class="qty-value">${qty}</span>
              <button type="button" class="qty-btn" data-action="inc" aria-label="Sumar unidad">+</button>
            </div>
            <button type="button" class="remove-item-btn" data-action="remove">Quitar</button>
          </div>
        `;
      })
      .join('');
  }

  function buildWhatsappMessage() {
    const name = customerNameInput ? customerNameInput.value.trim() : '';
    const notes = orderNotesInput ? orderNotesInput.value.trim() : '';
    const totalAmount = cart.reduce(
      (acc, item) => acc + (Number(item.price) || 0) * (Number(item.qty) || 0),
      0
    );

    const lines = [
      'Hola *Cohetería Caracho*, quiero realizar el siguiente pedido:',
      ''
    ];

    if (name) {
      lines.push(`*Cliente:* ${name}`);
    }

    cart.forEach((item) => {
      const unitPrice = Number(item.price) || 0;
      const qty = Number(item.qty) || 1;
      const subtotal = unitPrice * qty;
      lines.push(`• ${qty}x ${item.name} (${formatLempiras(unitPrice)} c/u) = *${formatLempiras(subtotal)}*`);
    });

    lines.push('');
    lines.push(`*Total estimado:* ${formatLempiras(totalAmount)}`);

    if (notes) {
      lines.push(`*Nota:* ${notes}`);
    }

    lines.push('');
    lines.push('¿Me confirman disponibilidad y total final?');

    return lines.join('\n');
  }

  function sendOrderToWhatsapp() {
    if (cart.length === 0) return;
    const phone = whatsappNumberSelect ? whatsappNumberSelect.value : '50496492432';
    const message = buildWhatsappMessage();
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  // Delegación de eventos para agregar productos
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-to-cart-btn');
    if (addBtn) {
      const card = addBtn.closest('.product-card');
      if (!card) return;
      const product = parseProductFromCard(card);
      addToCart(product, addBtn);
    }
  });

  // Eventos dentro del carrito (sumar, restar, eliminar)
  if (cartItemsContainer) {
    cartItemsContainer.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;

      const itemEl = target.closest('.cart-item');
      if (!itemEl) return;

      const id = itemEl.dataset.id;
      const action = target.dataset.action;

      if (action === 'inc') changeQty(id, 1);
      if (action === 'dec') changeQty(id, -1);
      if (action === 'remove') removeItem(id);
    });
  }

  // Abrir / cerrar carrito
  const openCartHeaderBtn = document.getElementById('openCartHeaderBtn');
  const floatingCartBtn = document.getElementById('floatingCartBtn');
  const openCartCalloutBtn = document.getElementById('openCartCalloutBtn');
  const closeCartBtn = document.getElementById('closeCartBtn');

  if (openCartHeaderBtn) openCartHeaderBtn.addEventListener('click', openCart);
  if (floatingCartBtn) floatingCartBtn.addEventListener('click', openCart);
  if (openCartCalloutBtn) openCartCalloutBtn.addEventListener('click', openCart);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener('click', closeCart);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartDrawer && cartDrawer.classList.contains('open')) {
      closeCart();
    }
  });

  if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);
  if (sendWhatsappBtn) sendWhatsappBtn.addEventListener('click', sendOrderToWhatsapp);

  // Filtros por categoría
  const categoryButtons = document.querySelectorAll('.cat-btn');
  const productCards = productGrid ? productGrid.querySelectorAll('.product-card') : document.querySelectorAll('.product-card');

  categoryButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      categoryButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      productCards.forEach((card) => {
        const match = filter === 'todos' || card.dataset.category === filter;
        card.hidden = !match;
      });
    });
  });

  // Render inicial
  renderCart();
});