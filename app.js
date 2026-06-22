document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 1. DATA DEFINITIONS (Product Catalog)
  // ==========================================
  const productsData = {
    'cev-01': { name: 'Ceviche Tradicional / Delantero', image: 'cev_01_tradicional.webp', isVariable: true },
    'cev-02': { name: 'Ceviche Pasión / Primer Tiempo', image: 'cev_02_pasion.webp', isVariable: true },
    'cev-03': { name: 'Ceviche Trilogía / Segundo Tiempo', image: 'cev_03_trilogia.webp', isVariable: true },
    'cev-04': { name: 'Ceviche Delirio / Medio Tiempo', image: 'cev_04_delirio.webp', isVariable: true },
    'cev-05': { name: 'Ceviche Dinamita / Tiempo Xtra', image: 'cev_05_dinamita.webp', isVariable: true },
    'cev-06': { name: 'Ceviche Explosión / Campeón', image: 'cev_06_explosion.webp', isVariable: true },
    'ban-01': { name: 'Bandeja Exótica', price: 35, image: 'ban_01_exotica.webp', isVariable: false },
    'ban-02': { name: 'Bandeja Erótica', price: 35, image: 'ban_02_erotica.webp', isVariable: false },
    'ban-03': { name: 'Bandeja Amor', price: 42, image: 'ban_03_amor.webp', isVariable: false },
    'bar-01': { name: 'Barco Afrodita (3 Personas)', price: 35, image: 'bar_01_afrodita.webp', isVariable: false },
    'bar-02': { name: 'Barco Atenea (3 Personas)', price: 32, image: 'bar_02_atenea.webp', isVariable: false },
    'ext-01': { name: 'Calamares Rebosados (150g)', price: 6, image: 'ext_01_calamares.webp', isVariable: false },
    'ext-02': { name: 'Camarones Rebosados (150g)', price: 6, image: 'ext_02_camarones.webp', isVariable: false },
    'beb-01': { name: 'Coca-Cola (1 Litro)', price: 2, image: 'beb_01_coke.webp', isVariable: false },
    'beb-02': { name: 'Coca-Cola (Lata 355ml)', price: 1, image: 'beb_01_coke.webp', isVariable: false },
    'beb-03': { name: 'Cerveza Nacional', price: 1.5, image: 'beb_03_beer_nac.webp', isVariable: false },
    'beb-04': { name: 'Cerveza Internacional', price: 2, image: 'beb_04_beer_int.webp', isVariable: false }
  };

  // ==========================================
  // 2. STATE MANAGEMENT (Zustand-like Store)
  // ==========================================
  let cart = [];
  let orderType = 'delivery'; // 'delivery' or 'pickup'

  function updateCartState() {
    // Recalculate badge count
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const cartBadge = document.getElementById('cartBadge');
    
    if (totalItems > 0) {
      cartBadge.textContent = totalItems;
      cartBadge.classList.add('has-items');
    } else {
      cartBadge.classList.remove('has-items');
      cartBadge.textContent = '0';
    }

    // Render cart items inside side panel / bottom sheet
    renderCart();
  }

  function addToCart(productId, size = null, price = null) {
    const productInfo = productsData[productId];
    const finalPrice = productInfo.isVariable ? price : productInfo.price;
    const variantName = size ? `${productInfo.name} (${size})` : productInfo.name;
    const cartKey = size ? `${productId}-${size}` : productId;

    const existingIndex = cart.findIndex(item => item.cartKey === cartKey);
    
    if (existingIndex > -1) {
      cart[existingIndex].qty += 1;
    } else {
      cart.push({
        id: productId,
        cartKey: cartKey,
        name: variantName,
        price: finalPrice,
        image: productInfo.image,
        size: size,
        qty: 1
      });
    }

    updateCartState();
    updateMenuCardControls(productId);
  }

  // ==========================================
  // FLY-TO-CART ANIMATION (Mobile-Optimised)
  // ==========================================
  function flyToCart(originElement) {
    const cartTrigger = document.getElementById('cartTrigger');
    const cartBadge   = document.getElementById('cartBadge');
    if (!cartTrigger || !originElement) return;

    // Use getBoundingClientRect — always viewport-relative (works with scroll & zoom)
    const srcRect  = originElement.getBoundingClientRect();
    const destRect = cartTrigger.getBoundingClientRect();

    // Guard: If cart trigger is fully off-screen (e.g. hidden on mobile), bail gracefully
    // Instead do just the badge bounce for a quick feedback
    const cartIsVisible = destRect.width > 0 && destRect.height > 0
      && destRect.top >= -destRect.height
      && destRect.top <= (window.innerHeight || document.documentElement.clientHeight);

    // Starting position = center of pressed button, using fixed coords
    const startX = srcRect.left + srcRect.width / 2;
    const startY = srcRect.top  + srcRect.height / 2;

    if (!cartIsVisible) {
      // Cart icon not on screen — just animate a small pulse on the button and update badge
      originElement.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.35)', offset: 0.3 },
        { transform: 'scale(1)' },
      ], { duration: 300, easing: 'ease' });
      return;
    }

    const endX = destRect.left + destRect.width / 2;
    const endY = destRect.top  + destRect.height / 2;

    // Create particle anchored at the start position via position:fixed
    const particle = document.createElement('div');
    particle.className = 'fly-to-cart-particle';
    particle.textContent = '+';
    // Place it at the origin using fixed positioning — avoids scroll offset issues
    particle.style.left = `${startX - 9}px`;
    particle.style.top  = `${startY - 9}px`;
    document.body.appendChild(particle);

    // Compute delta from particle's fixed start → cart icon
    const dx = endX - startX;
    const dy = endY - startY;

    // Arc control point: midpoint, shifted upward by 30–40% of travel distance
    // On small screens (short dy) we use a gentler arc so the particle stays visible
    const arcLift = Math.min(Math.abs(dy) * 0.40, 80); // cap at 80px lift
    const arcX = dx * 0.5;
    const arcY = (dy < 0 ? -arcLift : (Math.min(startY, endY) - startY - arcLift));

    // Build keyframes using transform:translate (GPU-composited, no layout thrash)
    const frames = 18;
    const keyframes = [];
    for (let i = 0; i <= frames; i++) {
      const t = i / frames;
      // Quadratic Bézier via translate (origin = startX/startY fixed)
      const tx = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * arcX + t * t * dx;
      const ty = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * arcY + t * t * dy;

      // Scale: shrinks gently during travel, sharp vanish at the end
      const scale   = t < 0.75 ? 1 - t * 0.25 : Math.max(0, 0.75 - (t - 0.75) * 4);
      // Opacity: visible for 85% of trip, fades quickly at the end
      const opacity = t > 0.82 ? Math.max(0, 1 - (t - 0.82) * 5.9) : 1;

      keyframes.push({
        transform: `translate(${tx}px, ${ty}px) scale(${Math.max(0, scale)})`,
        opacity:   `${opacity}`,
      });
    }

    const anim = particle.animate(keyframes, {
      duration: 500,
      easing:   'cubic-bezier(0.2, 0.8, 0.4, 1)',
      fill:     'forwards',
    });

    anim.onfinish = () => {
      particle.remove();

      // Badge bounce
      cartBadge.classList.remove('bounce');
      void cartBadge.offsetWidth; // force reflow
      cartBadge.classList.add('bounce');
      cartBadge.addEventListener('animationend', () => cartBadge.classList.remove('bounce'), { once: true });

      // Cart icon jiggle
      cartTrigger.classList.remove('jiggle');
      void cartTrigger.offsetWidth;
      cartTrigger.classList.add('jiggle');
      cartTrigger.addEventListener('animationend', () => cartTrigger.classList.remove('jiggle'), { once: true });
    };
  }

  function updateItemQty(cartKey, change) {
    const index = cart.findIndex(item => item.cartKey === cartKey);
    if (index > -1) {
      cart[index].qty += change;
      const productId = cart[index].id;
      
      if (cart[index].qty <= 0) {
        cart.splice(index, 1);
        updateMenuCardControls(productId); // Reset to "+" button
      } else {
        updateMenuCardControls(productId);
      }
    }
    updateCartState();
  }

  // ==========================================
  // 3. UI RENDERING & COMPONENT REFRESH
  // ==========================================
  function renderCart() {
    const emptyView = document.getElementById('emptyCartView');
    const itemsList = document.getElementById('cartItemsList');
    const checkoutForm = document.getElementById('checkoutForm');
    const cartFooter = document.getElementById('cartFooter');
    const btnClearCart = document.getElementById('btnClearCart');
    
    if (cart.length === 0) {
      emptyView.style.display = 'flex';
      itemsList.style.display = 'none';
      checkoutForm.style.display = 'none';
      cartFooter.style.display = 'none';
      if (btnClearCart) btnClearCart.style.display = 'none';
      return;
    }

    emptyView.style.display = 'none';
    itemsList.style.display = 'flex';
    checkoutForm.style.display = 'flex';
    cartFooter.style.display = 'block';
    if (btnClearCart) btnClearCart.style.display = 'block';

    // Clear and populate items
    itemsList.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
      const itemSubtotal = item.price * item.qty;
      subtotal += itemSubtotal;

      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-option">${item.size ? 'Porción: ' + item.size : 'Tradicional'}</span>
        </div>
        <div class="cart-item-controls">
          <span class="cart-item-price">$${itemSubtotal.toFixed(2)}</span>
          <div class="quantity-controls">
            <button type="button" class="qty-btn btn-qty-minus" data-key="${item.cartKey}">
              <i class="ph ph-minus" style="font-size: 0.8rem;"></i>
            </button>
            <span class="qty-val">${item.qty}</span>
            <button type="button" class="qty-btn btn-qty-plus" data-key="${item.cartKey}">
              <i class="ph ph-plus" style="font-size: 0.8rem;"></i>
            </button>
          </div>
        </div>
      `;
      itemsList.appendChild(itemEl);
    });

    // Update prices
    document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cartTotal').textContent = `$${subtotal.toFixed(2)}`;

    // Add event listeners to the new +/- buttons
    itemsList.querySelectorAll('.btn-qty-minus').forEach(btn => {
      btn.addEventListener('click', () => updateItemQty(btn.dataset.key, -1));
    });
    itemsList.querySelectorAll('.btn-qty-plus').forEach(btn => {
      btn.addEventListener('click', () => updateItemQty(btn.dataset.key, 1));
    });
  }

  function updateMenuCardControls(productId) {
    const controlsContainer = document.getElementById(`controls-${productId}`);
    if (!controlsContainer) return;

    const productInfo = productsData[productId];
    let currentCartKey = productId;
    
    if (productInfo.isVariable) {
      const select = document.getElementById(`size-${productId}`);
      if (select) {
        currentCartKey = `${productId}-${select.value}`;
      }
    }

    const item = cart.find(i => i.cartKey === currentCartKey);

    if (!item) {
      controlsContainer.innerHTML = `
        <button class="btn-add-to-cart add-to-cart-btn" data-id="${productId}" aria-label="Agregar al carrito">
          <i class="ph ph-plus"></i>
        </button>
      `;
      // Re-add listener
      controlsContainer.querySelector('.add-to-cart-btn').addEventListener('click', handleAddToCartClick);
    } else {
      controlsContainer.innerHTML = `
        <div class="quantity-controls">
          <button class="qty-btn card-qty-minus" data-key="${currentCartKey}">
            <i class="ph ph-minus" style="font-size: 0.8rem;"></i>
          </button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn card-qty-plus" data-key="${currentCartKey}">
            <i class="ph ph-plus" style="font-size: 0.8rem;"></i>
          </button>
        </div>
      `;

      // Add click events for menu card controls
      controlsContainer.querySelector('.card-qty-minus').addEventListener('click', () => updateItemQty(currentCartKey, -1));
      controlsContainer.querySelector('.card-qty-plus').addEventListener('click', (e) => {
        flyToCart(e.currentTarget);
        updateItemQty(currentCartKey, 1);
      });
    }
  }

  function handleAddToCartClick(e) {
    const btn = e.currentTarget;
    const productId = btn.dataset.id;
    const productInfo = productsData[productId];
    
    let size = null;
    let price = null;

    if (productInfo.isVariable) {
      const select = document.getElementById(`size-${productId}`);
      const selectedOption = select.options[select.selectedIndex];
      size = select.value;
      price = parseFloat(selectedOption.dataset.price);
    }

    flyToCart(btn);
    addToCart(productId, size, price);
  }

  // ==========================================
  // 4. ACTION HANDLERS & LISTENERS
  // ==========================================
  
  // Size Select Changes listener
  document.querySelectorAll('.size-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const productId = select.dataset.productId;
      const priceDisplay = document.getElementById(`price-${productId}`);
      const selectedOption = select.options[select.selectedIndex];
      const price = selectedOption.dataset.price;
      
      // Update price label on card
      priceDisplay.textContent = `$${price}`;
      
      // Update quantity controls if the variant is in the cart
      updateMenuCardControls(productId);
    });
  });

  // Add to cart buttons listeners
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', handleAddToCartClick);
  });

  // Delivery / Pick Up toggles
  const deliveryBtn = document.getElementById('deliveryBtn');
  const pickupBtn = document.getElementById('pickupBtn');
  const addressGroup = document.getElementById('addressGroup');
  const clientAddress = document.getElementById('clientAddress');

  deliveryBtn.addEventListener('click', () => {
    orderType = 'delivery';
    deliveryBtn.classList.add('active');
    pickupBtn.classList.remove('active');
    addressGroup.classList.add('active');
    clientAddress.setAttribute('required', 'true');
  });

  pickupBtn.addEventListener('click', () => {
    orderType = 'pickup';
    pickupBtn.classList.add('active');
    deliveryBtn.classList.remove('active');
    addressGroup.classList.remove('active');
    clientAddress.removeAttribute('required');
  });

  // Open & Close Cart
  const cartTrigger = document.getElementById('cartTrigger');
  const cartCloseBtn = document.getElementById('cartCloseBtn');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartPanel = document.getElementById('cartPanel');
  const cartBrowseBtn = document.getElementById('cartBrowseBtn');

  function openCart() {
    cartOverlay.classList.add('open');
    cartPanel.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartOverlay.classList.remove('open');
    cartPanel.classList.remove('open');
    document.body.style.overflow = 'auto';
  }

  cartTrigger.addEventListener('click', openCart);
  cartCloseBtn.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  const btnClearCart = document.getElementById('btnClearCart');
  if (btnClearCart) {
    btnClearCart.addEventListener('click', () => {
      if (confirm('¿Estás seguro de que deseas vaciar tu carrito?')) {
        cart = [];
        updateCartState();
        document.querySelectorAll('.quantity-controls-wrapper').forEach(wrapper => {
          const productId = wrapper.id.replace('controls-', '');
          updateMenuCardControls(productId);
        });
      }
    });
  }
  cartBrowseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeCart();
    // Wait for panel close transition to finish before scrolling
    setTimeout(() => {
      const menuSection = document.getElementById('menu-section');
      if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 350);
  });

  // Mobile Swipe Bottom Sheet Closing (Mobile Enhancement)
  let touchStartY = 0;
  let touchEndY = 0;
  
  cartPanel.addEventListener('touchstart', (e) => {
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  cartPanel.addEventListener('touchend', (e) => {
    touchEndY = e.changedTouches[0].screenY;
    // If swiped down from the top handle area
    if (window.innerWidth <= 576 && touchEndY - touchStartY > 100 && e.target.closest('.bottom-sheet-handle')) {
      closeCart();
    }
  }, { passive: true });

  // Navbar hamburger toggle
  const menuToggle = document.getElementById('menuToggle');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  menuToggle.addEventListener('click', () => {
    const isOpen = mobileNavOverlay.classList.toggle('open');
    const toggleIcon = menuToggle.querySelector('i');
    
    if (isOpen) {
      toggleIcon.className = 'ph ph-x';
      document.body.style.overflow = 'hidden';
    } else {
      toggleIcon.className = 'ph ph-list';
      document.body.style.overflow = 'auto';
    }
  });

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileNavOverlay.classList.remove('open');
      menuToggle.querySelector('i').className = 'ph ph-list';
      document.body.style.overflow = 'auto';
    });
  });

  // Sticky Navbar blur on scroll
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });

  // ==========================================
  // 5. CATALOG FILTERING LOGIC
  // ==========================================
  const tabButtons = document.querySelectorAll('#menuTabs .tab-btn');
  const menuCards = document.querySelectorAll('.catalog-track .menu-card');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active states
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.category;
      
      menuCards.forEach(card => {
        if (filter === 'todos' || card.dataset.category === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });

      // Scroll catalog back to start
      document.getElementById('catalogTrack').scrollLeft = 0;
    });
  });

  // ==========================================
  // 6. WHATSAPP CHECKOUT FORM SUBMISSION
  // ==========================================
  const btnCheckout = document.getElementById('btnCheckout');
  const toastNotification = document.getElementById('toastNotification');

  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const clientNameInput = document.getElementById('clientName');

    const clientName = clientNameInput.value.trim();
    const address = clientAddress.value.trim();
    const note = document.getElementById('clientNote').value.trim();

    // 1. Compose items list text
    let itemsText = '';
    let totalUSD = 0;
    
    cart.forEach(item => {
      const itemTotal = item.price * item.qty;
      totalUSD += itemTotal;
      itemsText += `• ${item.qty}x ${item.name} — $${itemTotal.toFixed(2)}\n`;
    });

    // 2. Compose full message
    let message = `🦐 *PEDIDO - Ceviche y Sabor*\n\n`;
    message += `👤 *Cliente:* ${clientName}\n`;
    message += `📍 *Tipo:* ${orderType === 'delivery' ? 'Delivery' : 'Pick Up'}\n`;
    if (orderType === 'delivery') {
      message += `📍 *Dirección:* ${address}\n`;
    }
    message += `\n🧾 *Detalle del pedido:*\n${itemsText}\n`;
    message += `💰 *Subtotal:* $${totalUSD.toFixed(2)}\n`;
    message += `💬 _Costo de delivery a coordinar en el chat_\n`;
    if (note) {
      message += `\n💬 *Notas:* ${note}\n`;
    }
    message += `\n📱 Enviado desde: cevicheysabor.com`;

    // Encode URL
    const whatsappUrl = `https://wa.me/584122102463?text=${encodeURIComponent(message)}`;

    // Fallback clipboard copying for insecure/older contexts
    function fallbackCopyText(text, success, error) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          success();
        } else {
          error();
        }
      } catch (err) {
        error(err);
      }
      document.body.removeChild(textArea);
    }

    const handleCopySuccess = () => {
      toastNotification.textContent = 'Pedido copiado al portapapeles. ¡Pégalo en WhatsApp!';
      toastNotification.classList.add('active');
      btnCheckout.textContent = '¡Copiado! Pégalo en WhatsApp';
      btnCheckout.style.backgroundColor = 'var(--teal-vivid)';
      btnCheckout.style.color = 'var(--text-on-teal)';
      
      setTimeout(() => {
        toastNotification.classList.remove('active');
        btnCheckout.innerHTML = `<i class="ph ph-whatsapp-logo" style="font-size: 1.25rem;"></i> Enviar Pedido a WhatsApp`;
        btnCheckout.style.backgroundColor = 'var(--whatsapp)';
        btnCheckout.style.color = 'var(--text-on-gold)';
      }, 5000);
    };

    const handleCopyError = () => {
      alert('No pudimos abrir WhatsApp ni copiar el pedido. Por favor, cópialo manualmente.');
    };

    // Attempt to open WhatsApp window
    const newWindow = window.open(whatsappUrl, '_blank');
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
      // Popup blocked or deep-linking failed, use clipboard fallback
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message)
          .then(handleCopySuccess)
          .catch(() => fallbackCopyText(message, handleCopySuccess, handleCopyError));
      } else {
        fallbackCopyText(message, handleCopySuccess, handleCopyError);
      }
    } else {
      // Success opening window (redirecting)
      toastNotification.textContent = 'Redirigiendo a WhatsApp... ¡Tu pedido se mantendrá guardado!';
      toastNotification.classList.add('active');
      setTimeout(() => {
        toastNotification.classList.remove('active');
      }, 5000);
      closeCart();
    }
  });

  // ==========================================
  // 7. VIDEO SCROLL TRIGGERS (IntersectionObserver)
  // ==========================================
  const bentoVideo = document.getElementById('bentoVideo');
  const servicesVideo = document.getElementById('servicesVideo');
  const influencerVideo = document.getElementById('influencerVideo');
  const videoPoster = document.getElementById('videoPoster');

  // Lazy play/pause of videos in viewport to save mobile battery and network
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        // Only autoplay background loop videos, not the influencer video
        if (video !== influencerVideo) {
          video.play().catch(() => {});
        }
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.3 });

  if (bentoVideo) videoObserver.observe(bentoVideo);
  if (servicesVideo) videoObserver.observe(servicesVideo);
  if (influencerVideo) videoObserver.observe(influencerVideo);

  // Play influencer video on click (voluntary stream only, 29MB file)
  if (videoPoster && influencerVideo) {
    videoPoster.addEventListener('click', () => {
      videoPoster.classList.add('playing');
      influencerVideo.setAttribute('controls', 'true');
      influencerVideo.play().catch(() => {
        alert('Hubo un error cargando el video. Inténtalo de nuevo.');
        videoPoster.classList.remove('playing');
      });
    });
  }

  // ==========================================
  // 8. GSAP STICKY-STACK SCROLLING (Desktop)
  // ==========================================
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Run GSAP sticky stack only on Desktop viewports (> 768px)
    let mm = gsap.matchMedia();

    mm.add("(min-width: 768.1px)", () => {
      const cards = gsap.utils.toArray(".stack-card");
      
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return; // Leave last card un-pinned
        
        ScrollTrigger.create({
          trigger: card,
          start: "top top",
          endTrigger: cards[cards.length - 1],
          end: "top top",
          pin: true,
          pinSpacing: false,
          id: `card-pin-${i}`
        });

        // Scale and dim the card as the next one scrolls over it
        gsap.to(card.querySelector('.service-card-inner'), {
          scale: 0.92,
          opacity: 0.55,
          ease: "none",
          scrollTrigger: {
            trigger: cards[i + 1],
            start: "top bottom",
            end: "top top",
            scrub: true,
            id: `card-scale-${i}`
          }
        });
      });
    });
  }



  // ==========================================
  // 10. EVENT QUOTE MODAL LOGIC (DYNAMIC POP-UP)
  // ==========================================
  const openPromoQuoteBtn = document.getElementById('openPromoQuoteBtn');
  const openBarQuoteBtn = document.getElementById('openBarQuoteBtn');
  const openCateringQuoteBtn = document.getElementById('openCateringQuoteBtn');
  
  const quoteModal = document.getElementById('quoteModal');
  const quoteModalOverlay = document.getElementById('quoteModalOverlay');
  const quoteModalCloseBtn = document.getElementById('quoteModalCloseBtn');
  const quoteForm = document.getElementById('quoteForm');
  
  const quoteModalTitleText = document.getElementById('quoteModalTitleText');
  const quoteModalIcon = document.getElementById('quoteModalIcon');
  const quoteServiceType = document.getElementById('quoteServiceType');

  function openQuoteModal(titleText, iconClass, defaultService) {
    if (quoteModal && quoteModalOverlay) {
      if (quoteModalTitleText && titleText) {
        quoteModalTitleText.textContent = titleText;
      }
      if (quoteModalIcon && iconClass) {
        quoteModalIcon.className = `ph ${iconClass}`;
      }
      if (quoteServiceType && defaultService) {
        quoteServiceType.value = defaultService;
      }
      
      quoteModalOverlay.classList.add('open');
      quoteModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeQuoteModal() {
    if (quoteModal && quoteModalOverlay) {
      quoteModalOverlay.classList.remove('open');
      quoteModal.classList.remove('open');
      document.body.style.overflow = 'auto';
    }
  }

  if (openPromoQuoteBtn) {
    openPromoQuoteBtn.addEventListener('click', () => {
      openQuoteModal('Cotizar Barra Móvil', 'ph-martini', 'Barra Móvil Completa');
    });
  }

  if (openBarQuoteBtn) {
    openBarQuoteBtn.addEventListener('click', () => {
      openQuoteModal('Cotizar Barra en Vivo', 'ph-martini', 'Barra Móvil Completa');
    });
  }

  if (openCateringQuoteBtn) {
    openCateringQuoteBtn.addEventListener('click', () => {
      openQuoteModal('Cotizar Catering Completo', 'ph-cooking-pot', 'Servicio Mixto Personalizado');
    });
  }

  if (quoteModalCloseBtn) {
    quoteModalCloseBtn.addEventListener('click', closeQuoteModal);
  }

  if (quoteModalOverlay) {
    quoteModalOverlay.addEventListener('click', closeQuoteModal);
  }

  // Handle escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && quoteModal && quoteModal.classList.contains('open')) {
      closeQuoteModal();
    }
  });

  // Handle form submission
  if (quoteForm) {
    quoteForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('quoteName').value.trim();
      const phone = document.getElementById('quotePhone').value.trim();
      const dateVal = document.getElementById('quoteDate').value;
      const guests = document.getElementById('quoteGuests').value;
      const service = document.getElementById('quoteServiceType').value;
      const comments = document.getElementById('quoteComments').value.trim();

      // Format date for display (DD/MM/YYYY)
      let formattedDate = dateVal;
      if (dateVal) {
        const parts = dateVal.split('-');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }

      // Build WhatsApp message
      const text = `¡Hola! Quisiera cotizar un servicio especial. Aquí tienes los detalles:\n\n` +
                   `*Nombre:* ${name}\n` +
                   `*WhatsApp:* ${phone}\n` +
                   `*Fecha del Evento:* ${formattedDate}\n` +
                   `*Cantidad de Invitados:* ${guests} personas\n` +
                   `*Servicio/Menú:* ${service}\n` +
                   `*Comentarios:* ${comments || 'Ninguno'}`;

      const whatsappNumber = '584122102463'; // Same contact number as in footer
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;

      // Open WhatsApp window
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      // Close modal and reset form
      closeQuoteModal();
      quoteForm.reset();
    });
  }

  // Refresh ScrollTrigger on window load to recalculate heights after media finishes rendering
  window.addEventListener('load', () => {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  });
});
