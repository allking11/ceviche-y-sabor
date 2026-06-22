document.addEventListener('DOMContentLoaded', () => {
  let lenisInstance = null;
  
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
    const cartTrigger = document.getElementById('cartTrigger');
    
    if (totalItems > 0) {
      cartBadge.textContent = totalItems;
      cartBadge.classList.add('has-items');
      if (cartTrigger) {
        cartTrigger.setAttribute('aria-label', `Abrir Carrito, ${totalItems} artículos agregados`);
      }
    } else {
      cartBadge.classList.remove('has-items');
      cartBadge.textContent = '0';
      if (cartTrigger) {
        cartTrigger.setAttribute('aria-label', 'Abrir Carrito, vacío');
      }
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

    // Speak cart update
    const announcer = document.getElementById('cartLiveAnnouncer');
    if (announcer) {
      announcer.textContent = `${variantName} agregado al carrito.`;
    }
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
            <button type="button" class="qty-btn btn-qty-minus" data-key="${item.cartKey}" aria-label="Disminuir cantidad de ${item.name}">
              <i class="ph ph-minus" style="font-size: 0.8rem;"></i>
            </button>
            <span class="qty-val">${item.qty}</span>
            <button type="button" class="qty-btn btn-qty-plus" data-key="${item.cartKey}" aria-label="Aumentar cantidad de ${item.name}">
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
        <button class="btn-add-to-cart add-to-cart-btn" data-id="${productId}" aria-label="Agregar ${productInfo.name} al carrito">
          <i class="ph ph-plus"></i>
        </button>
      `;
      // Re-add listener
      controlsContainer.querySelector('.add-to-cart-btn').addEventListener('click', handleAddToCartClick);
    } else {
      controlsContainer.innerHTML = `
        <div class="quantity-controls">
          <button class="qty-btn card-qty-minus" data-key="${currentCartKey}" aria-label="Disminuir cantidad de ${productInfo.name}">
            <i class="ph ph-minus" style="font-size: 0.8rem;"></i>
          </button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn card-qty-plus" data-key="${currentCartKey}" aria-label="Aumentar cantidad de ${productInfo.name}">
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
  const checkoutForm = document.getElementById('checkoutForm');

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

  let activeElementBeforeCart = null;

  function openCart() {
    activeElementBeforeCart = document.activeElement;
    cartPanel.removeAttribute('inert');
    cartOverlay.classList.add('open');
    cartPanel.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (lenisInstance) lenisInstance.stop();
    
    setTimeout(() => {
      if (cartCloseBtn) cartCloseBtn.focus();
      cartPanel.addEventListener('keydown', trapCartFocus);
    }, 100);
  }

  function closeCart() {
    cartPanel.removeEventListener('keydown', trapCartFocus);
    cartOverlay.classList.remove('open');
    cartPanel.classList.remove('open');
    cartPanel.setAttribute('inert', '');
    document.body.style.overflow = 'auto';
    if (lenisInstance) lenisInstance.start();
    
    if (activeElementBeforeCart) {
      activeElementBeforeCart.focus();
    }
  }

  function trapCartFocus(e) {
    if (e.key !== 'Tab') return;
    const focusableEls = cartPanel.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
    const visibleEls = Array.from(focusableEls).filter(el => {
      const style = window.getComputedStyle(el);
      return el.offsetWidth > 0 && el.offsetHeight > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    
    if (visibleEls.length === 0) return;
    const firstFocusableEl = visibleEls[0];
    const lastFocusableEl = visibleEls[visibleEls.length - 1];
    
    if (e.shiftKey) { /* Shift + Tab */
      if (document.activeElement === firstFocusableEl) {
        lastFocusableEl.focus();
        e.preventDefault();
      }
    } else { /* Tab */
      if (document.activeElement === lastFocusableEl) {
        firstFocusableEl.focus();
        e.preventDefault();
      }
    }
  }

  cartTrigger.addEventListener('click', openCart);
  cartCloseBtn.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  const cartItemsList = document.getElementById('cartItemsList');
  if (cartItemsList) {
    cartItemsList.addEventListener('click', (e) => {
      const minusBtn = e.target.closest('.btn-qty-minus');
      const plusBtn = e.target.closest('.btn-qty-plus');
      
      if (minusBtn) {
        updateItemQty(minusBtn.dataset.key, -1);
      } else if (plusBtn) {
        updateItemQty(plusBtn.dataset.key, 1);
      }
    });
  }

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
  let activeElementBeforeMobileNav = null;

  menuToggle.addEventListener('click', () => {
    const isOpen = mobileNavOverlay.classList.toggle('open');
    const toggleIcon = menuToggle.querySelector('i');
    
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar Menú' : 'Abrir Menú');
    
    if (isOpen) {
      activeElementBeforeMobileNav = document.activeElement;
      mobileNavOverlay.removeAttribute('inert');
      toggleIcon.className = 'ph ph-x';
      document.body.style.overflow = 'hidden';
      
      mobileNavOverlay.addEventListener('keydown', trapMobileNavFocus);
      setTimeout(() => {
        const firstLink = mobileNavOverlay.querySelector('a');
        if (firstLink) firstLink.focus();
      }, 100);
    } else {
      toggleIcon.className = 'ph ph-list';
      document.body.style.overflow = 'auto';
      mobileNavOverlay.setAttribute('inert', '');
      
      mobileNavOverlay.removeEventListener('keydown', trapMobileNavFocus);
      if (activeElementBeforeMobileNav) {
        activeElementBeforeMobileNav.focus();
      }
    }
  });

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileNavOverlay.classList.remove('open');
      menuToggle.querySelector('i').className = 'ph ph-list';
      document.body.style.overflow = 'auto';
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Abrir Menú');
      mobileNavOverlay.setAttribute('inert', '');
      mobileNavOverlay.removeEventListener('keydown', trapMobileNavFocus);
    });
  });

  function trapMobileNavFocus(e) {
    if (e.key !== 'Tab') return;
    const focusableEls = mobileNavOverlay.querySelectorAll('a, button');
    if (focusableEls.length === 0) return;
    const firstFocusableEl = focusableEls[0];
    const lastFocusableEl = focusableEls[focusableEls.length - 1];
    
    if (e.shiftKey) { /* Shift + Tab */
      if (document.activeElement === firstFocusableEl) {
        lastFocusableEl.focus();
        e.preventDefault();
      }
    } else { /* Tab */
      if (document.activeElement === lastFocusableEl) {
        firstFocusableEl.focus();
        e.preventDefault();
      }
    }
  }

  // Sticky Navbar blur on scroll (Throttled with state checks)
  let hasScrolledPastThreshold = false;
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    const isPastThreshold = window.scrollY > 50;
    
    if (isPastThreshold !== hasScrolledPastThreshold) {
      hasScrolledPastThreshold = isPastThreshold;
      if (hasScrolledPastThreshold) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  }, { passive: true });

  // ==========================================
  // 5. CATALOG FILTERING LOGIC (GSAP-Staggered Transitions)
  // ==========================================
  const tabButtons = document.querySelectorAll('#menuTabs .tab-btn');
  const menuCards = document.querySelectorAll('.catalog-track .menu-card');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active states
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.category;
      const targetCardsToShow = [];
      const targetCardsToHide = [];

      menuCards.forEach(card => {
        const isMatch = filter === 'todos' || card.dataset.category === filter;
        
        if (isMatch) {
          targetCardsToShow.push(card);
        } else {
          targetCardsToHide.push(card);
        }
      });

      // Reset scroll position smoothly
      const track = document.getElementById('catalogTrack');
      if (typeof gsap !== 'undefined') {
        gsap.to(track, { scrollLeft: 0, duration: 0.3, ease: 'power2.out' });
      } else {
        track.scrollLeft = 0;
      }

      // Animate out cards to hide
      if (targetCardsToHide.length > 0) {
        if (typeof gsap !== 'undefined') {
          gsap.to(targetCardsToHide, {
            opacity: 0,
            scale: 0.9,
            duration: 0.2,
            overwrite: 'auto',
            onComplete: () => {
              targetCardsToHide.forEach(c => c.style.display = 'none');
              // Animate in matching cards
              showCards(targetCardsToShow);
            }
          });
        } else {
          targetCardsToHide.forEach(c => {
            c.style.display = 'none';
            c.style.opacity = '0';
          });
          showCards(targetCardsToShow);
        }
      } else {
        showCards(targetCardsToShow);
      }

      function showCards(cards) {
        if (typeof gsap !== 'undefined') {
          // Ensure they have flex display but are invisible
          cards.forEach(c => {
            c.style.display = 'flex';
            // Initialize opacity/scale if not already visible
            if (gsap.getProperty(c, 'opacity') === 1) {
              gsap.set(c, { opacity: 0, scale: 0.9 });
            }
          });
          
          gsap.to(cards, {
            opacity: 1,
            scale: 1,
            duration: 0.4,
            stagger: 0.03,
            ease: 'back.out(1.15)',
            overwrite: 'auto'
          });
        } else {
          cards.forEach(c => {
            c.style.display = 'flex';
            c.style.opacity = '1';
            c.style.transform = 'none';
          });
        }
      }
    });
  });

  // ==========================================
  // 5.5 CATALOG INTERACTIVE NAVIGATION (Desktop & Drag-to-Scroll)
  // ==========================================
  const catalogTrack = document.getElementById('catalogTrack');
  const scrollLeftBtn = document.getElementById('scrollLeftBtn');
  const scrollRightBtn = document.getElementById('scrollRightBtn');
  const progressBarFill = document.getElementById('catalogProgressBarFill');

  if (catalogTrack) {
    // 1. Navigation Button Actions
    const updateNavButtonsState = () => {
      const scrollLeft = catalogTrack.scrollLeft;
      const maxScroll = catalogTrack.scrollWidth - catalogTrack.clientWidth;
      
      // Hide left arrow if at start, show if scrolled
      if (scrollLeft <= 5) {
        scrollLeftBtn.style.opacity = '0';
        scrollLeftBtn.style.pointerEvents = 'none';
      } else {
        scrollLeftBtn.style.opacity = '1';
        scrollLeftBtn.style.pointerEvents = 'all';
      }

      // Hide right arrow if at end, show if not
      if (scrollLeft >= maxScroll - 5) {
        scrollRightBtn.style.opacity = '0';
        scrollRightBtn.style.pointerEvents = 'none';
      } else {
        scrollRightBtn.style.opacity = '1';
        scrollRightBtn.style.pointerEvents = 'all';
      }

      // Update Scroll Progress Bar
      if (progressBarFill) {
        const percentage = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
        progressBarFill.style.width = `${percentage}%`;
      }
    };

    // Initialize buttons states on load
    setTimeout(updateNavButtonsState, 300);

    // Track scroll event to update arrows & progress bar
    catalogTrack.addEventListener('scroll', updateNavButtonsState, { passive: true });

    // Step size: single card width + gap (340px + 28px = 368px)
    const stepSize = 368;

    scrollLeftBtn.addEventListener('click', () => {
      catalogTrack.scrollBy({
        left: -stepSize,
        behavior: 'smooth'
      });
    });

    scrollRightBtn.addEventListener('click', () => {
      catalogTrack.scrollBy({
        left: stepSize,
        behavior: 'smooth'
      });
    });

    // 2. Mouse Drag-to-Scroll (Desktop grab-to-scroll using Pointer Events)
    let isDown = false;
    let startX;
    let scrollLeft;
    let walkDist = 0;
    let trackOffsetLeft = 0;
    
    catalogTrack.addEventListener('pointerdown', (e) => {
      // Only initiate dragging with a mouse and primary click (left-click)
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      
      isDown = true;
      catalogTrack.classList.add('dragging');
      trackOffsetLeft = catalogTrack.offsetLeft; // Cache offsetLeft
      startX = e.pageX - trackOffsetLeft;
      scrollLeft = catalogTrack.scrollLeft;
      walkDist = 0;
      
      // Capture the pointer to receive events even if the pointer leaves the track
      catalogTrack.setPointerCapture(e.pointerId);
    });

    catalogTrack.addEventListener('pointerup', (e) => {
      if (isDown) {
        isDown = false;
        catalogTrack.classList.remove('dragging');
        catalogTrack.releasePointerCapture(e.pointerId);
        
        // Prevent clicking links/buttons if the mouse has moved significantly (dragging)
        if (Math.abs(walkDist) > 8) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    });

    catalogTrack.addEventListener('pointercancel', (e) => {
      if (isDown) {
        isDown = false;
        catalogTrack.classList.remove('dragging');
        catalogTrack.releasePointerCapture(e.pointerId);
      }
    });

    catalogTrack.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      
      const x = e.pageX - trackOffsetLeft; // Consume cached offsetLeft to prevent layout thrash
      const walk = (x - startX) * 1.5;
      walkDist = walk;
      catalogTrack.scrollLeft = scrollLeft - walk;
    });

    // Prevent navigation trigger or click event bubble on cards during drag
    catalogTrack.addEventListener('click', (e) => {
      if (Math.abs(walkDist) > 8) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true); // Use capture phase to intercept card clicks early!
  }

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
  // 7. VIDEO SCROLL TRIGGERS & LAZY LOADING (IntersectionObserver)
  // ==========================================
  const lazyVideos = document.querySelectorAll('video.lazy-video');

  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        const source = video.querySelector('source');
        
        // Dynamically inject src if not yet initialized
        if (video.dataset.src && (!source.src || source.src === window.location.href)) {
          source.src = video.dataset.src;
          video.load();
          video.classList.add('video-initialized');
        }

        // Only autoplay background loop videos, not the influencer video
        if (video !== influencerVideo) {
          video.play().catch(() => {});
        }
      } else {
        video.pause();
      }
    });
  }, { rootMargin: '200px', threshold: 0.1 });

  lazyVideos.forEach(v => videoObserver.observe(v));

  // Play influencer video on click (voluntary stream only, 29MB file)
  if (videoPoster && influencerVideo) {
    videoPoster.addEventListener('click', () => {
      videoPoster.classList.add('playing');
      
      const source = influencerVideo.querySelector('source');
      if (!source.src || source.src === window.location.href) {
        source.src = 'influecers trying food.mp4';
        influencerVideo.load();
      }
      
      influencerVideo.setAttribute('controls', 'true');
      influencerVideo.play().catch((err) => {
        console.error("Fallo de reproducción del video testimonial:", err);
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

    // 1. Initialize Lenis Smooth Scroll
    if (typeof Lenis !== 'undefined') {
      lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
      });

      // Update ScrollTrigger on Lenis scroll
      lenisInstance.on('scroll', ScrollTrigger.update);

      // Connect Lenis animations with GSAP ticker
      gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });

      // Prevent lag smoothing issues between Lenis & GSAP
      gsap.ticker.lagSmoothing(0);
    }

    // 2. Intercept Anchor Link clicks for Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const targetEl = document.querySelector(targetId);
        if (targetEl && lenisInstance) {
          lenisInstance.scrollTo(targetEl, {
            offset: -80, // Offset for sticky header
            duration: 1.5,
            immediate: false
          });
        } else if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // 3. Hero Cinematic Entrance Animations
    const heroTl = gsap.timeline({ defaults: { ease: "power4.out" } });
    heroTl.from(".hero-title", {
      y: 100,
      opacity: 0,
      duration: 1.4,
      delay: 0.2
    })
    .from(".hero-subtext", {
      y: 40,
      opacity: 0,
      duration: 1.2
    }, "-=1.0")
    .from(".hero-actions .btn", {
      y: 30,
      opacity: 0,
      duration: 1.0,
      stagger: 0.15,
      ease: "power3.out"
    }, "-=0.9")
    .fromTo(".hero-media-wrapper", 
      {
        clipPath: "inset(12% 12% 12% 12% rounded 32px)",
        scale: 0.85,
        opacity: 0
      },
      {
        clipPath: "inset(0% 0% 0% 0% rounded 24px)",
        scale: 1,
        opacity: 1,
        duration: 1.6,
        ease: "power4.inOut"
      },
      "-=1.4"
    );

    // 4. Parallax Scroll Animations
    // Parallax Hero Video background
    gsap.to(".hero-video", {
      yPercent: 15,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    // Parallax Bento item large image
    gsap.to(".bento-item-large .bento-img", {
      yPercent: 10,
      scale: 1.1,
      ease: "none",
      scrollTrigger: {
        trigger: ".bento-grid",
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });

    // Parallax Promotional Section video
    gsap.to(".promo-video", {
      yPercent: 12,
      ease: "none",
      scrollTrigger: {
        trigger: ".promotion-section",
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });

    // 5. Section Header Slide Reveals
    const headers = gsap.utils.toArray(".section-header");
    headers.forEach(header => {
      gsap.from(header, {
        opacity: 0,
        y: 40,
        duration: 1.0,
        ease: "power3.out",
        scrollTrigger: {
          trigger: header,
          start: "top 85%",
          toggleActions: "play none none none"
        }
      });
    });

    // 6. Bento Grid Staggered Reveal
    gsap.from(".bento-item", {
      y: 60,
      opacity: 0,
      duration: 1.2,
      stagger: 0.12,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".bento-grid",
        start: "top 85%",
        toggleActions: "play none none none"
      }
    });

    // 7. Word-by-Word Text Scrubbing Reveal for Bento Caption
    const bentoText = document.querySelector('.bento-caption-text');
    if (bentoText) {
      const words = bentoText.textContent.trim().split(/\s+/);
      bentoText.innerHTML = words.map(word => `<span class="scrub-word">${word}</span>`).join(' ');
      
      gsap.fromTo(bentoText.querySelectorAll('.scrub-word'), 
        { opacity: 0.15 },
        { 
          opacity: 1, 
          stagger: 0.05, 
          scrollTrigger: {
            trigger: bentoText,
            start: "top 85%",
            end: "bottom 65%",
            scrub: true,
          }
        }
      );
    }

    // 8. Promo Content Staggered Reveal
    const promoTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".promotion-section",
        start: "top 75%",
        toggleActions: "play none none none"
      }
    });
    promoTl.from(".promo-eyebrow", { opacity: 0, y: 20, duration: 0.6 })
      .from(".promo-title", { opacity: 0, y: 30, duration: 0.8 }, "-=0.4")
      .from(".promo-desc", { opacity: 0, y: 20, duration: 0.8 }, "-=0.6")
      .from(".promo-list li", { opacity: 0, y: 15, stagger: 0.1, duration: 0.6 }, "-=0.4")
      .from(".promotion-section .btn", { opacity: 0, scale: 0.9, duration: 0.6 }, "-=0.3");

    // 9. Menu Cards Staggered Entry
    gsap.from(".catalog-scroll-wrapper", {
      opacity: 0,
      y: 50,
      duration: 1.0,
      ease: "power3.out",
      scrollTrigger: {
        trigger: "#menu-section",
        start: "top 75%",
      }
    });

    // 10. Services Cards Stacking (Desktop Pinning & Scaling)
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

    // 11. SVG Connectors & Steps Scroll Reveal
    const maskPath1 = document.getElementById('mask-path-1');
    const maskPath2 = document.getElementById('mask-path-2');
    
    if (maskPath1 && maskPath2) {
      [maskPath1, maskPath2].forEach((path, index) => {
        const length = path.getTotalLength();
        // Set initial state for path dash
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        
        gsap.to(path, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: ".steps-container",
            start: index === 0 ? "top 70%" : "top 50%",
            end: index === 0 ? "center 50%" : "bottom 70%",
            scrub: true
          }
        });
      });
    }

    gsap.from(".step-card", {
      y: 50,
      opacity: 0,
      duration: 1.0,
      stagger: 0.2,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".steps-container",
        start: "top 70%",
      }
    });

    // 12. Reviews Staggered Reveal
    gsap.from(".review-item", {
      opacity: 0,
      y: 30,
      duration: 0.8,
      stagger: 0.15,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".reviews-wrapper",
        start: "top 80%",
      }
    });
    
    gsap.from(".influencer-video-wrapper", {
      opacity: 0,
      scale: 0.95,
      duration: 1.2,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".influencer-video-wrapper",
        start: "top 80%",
      }
    });

    // 13. Contact Panel & Map Reveal
    const contactTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".contact-grid",
        start: "top 80%",
      }
    });
    contactTl.from(".contact-info-panel .info-group", {
      opacity: 0,
      x: -30,
      stagger: 0.12,
      duration: 0.8,
      ease: "power2.out"
    })
    .from(".contact-info-panel .social-links", {
      opacity: 0,
      y: 20,
      duration: 0.6
    }, "-=0.4")
    .from(".map-wrapper", {
      opacity: 0,
      scale: 0.95,
      duration: 1.0,
      ease: "power2.out"
    }, "-=0.8");
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

  let activeElementBeforeQuoteModal = null;

  function openQuoteModal(titleText, iconClass, defaultService) {
    if (quoteModal && quoteModalOverlay) {
      activeElementBeforeQuoteModal = document.activeElement;
      if (quoteModalTitleText && titleText) {
        quoteModalTitleText.textContent = titleText;
      }
      if (quoteModalIcon && iconClass) {
        quoteModalIcon.className = `ph ${iconClass}`;
      }
      if (quoteServiceType && defaultService) {
        quoteServiceType.value = defaultService;
      }
      
      quoteModal.removeAttribute('inert');
      quoteModal.showModal();
      
      setTimeout(() => {
        quoteModalOverlay.classList.add('open');
        quoteModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (lenisInstance) lenisInstance.stop();
        if (quoteModalCloseBtn) quoteModalCloseBtn.focus();
      }, 10);
    }
  }

  function closeQuoteModal() {
    if (quoteModal && quoteModalOverlay) {
      quoteModalOverlay.classList.remove('open');
      quoteModal.classList.remove('open');
      
      setTimeout(() => {
        quoteModal.close();
        quoteModal.setAttribute('inert', '');
        document.body.style.overflow = 'auto';
        if (lenisInstance) lenisInstance.start();
        if (activeElementBeforeQuoteModal) {
          activeElementBeforeQuoteModal.focus();
        }
      }, 250); // Match CSS transition duration
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

  // Handle ESC key native event sequence for dialog cancel
  if (quoteModal) {
    quoteModal.addEventListener('cancel', (e) => {
      e.preventDefault(); // Stop native immediate close
      closeQuoteModal();  // Trigger structured transition close
    });
  }

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

  // ==========================================
  // Refresh ScrollTrigger on window load to recalculate heights after media finishes rendering
  window.addEventListener('load', () => {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  });
});
