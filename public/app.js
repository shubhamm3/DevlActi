// State Management
let products = [];
let cart = JSON.parse(localStorage.getItem("devlacti_cart")) || [];
let activeCategory = "All";
let searchQuery = "";
let appliedCoupon = null;

// DOM Elements
const productsGrid = document.getElementById("productsGrid");
const resultsCount = document.getElementById("resultsCount");
const categoryFilters = document.getElementById("categoryFilters");
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");

const cartToggleBtn = document.getElementById("cartToggleBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const cartItemList = document.getElementById("cartItemList");
const cartCountBadge = document.getElementById("cartCountBadge");
const drawerItemCount = document.getElementById("drawerItemCount");
const cartFooter = document.getElementById("cartFooter");

const subtotalAmount = document.getElementById("subtotalAmount");
const discountRow = document.getElementById("discountRow");
const discountLabel = document.getElementById("discountLabel");
const discountAmount = document.getElementById("discountAmount");
const shippingAmount = document.getElementById("shippingAmount");
const taxAmount = document.getElementById("taxAmount");
const grandTotalAmount = document.getElementById("grandTotalAmount");

const couponInput = document.getElementById("couponInput");
const applyCouponBtn = document.getElementById("applyCouponBtn");
const couponFeedback = document.getElementById("couponFeedback");

const openCheckoutBtn = document.getElementById("openCheckoutBtn");
const checkoutModal = document.getElementById("checkoutModal");
const closeCheckoutBtn = document.getElementById("closeCheckoutBtn");
const checkoutForm = document.getElementById("checkoutForm");
const modalSummaryCount = document.getElementById("modalSummaryCount");
const modalSummaryTotal = document.getElementById("modalSummaryTotal");
const submitOrderBtn = document.getElementById("submitOrderBtn");
const checkoutSpinner = document.getElementById("checkoutSpinner");

const confirmationModal = document.getElementById("confirmationModal");
const confirmOrderId = document.getElementById("confirmOrderId");
const confirmDetails = document.getElementById("confirmDetails");
const continueShoppingBtn = document.getElementById("continueShoppingBtn");

const quickViewModal = document.getElementById("quickViewModal");
const quickViewContent = document.getElementById("quickViewContent");
const closeQuickViewBtn = document.getElementById("closeQuickViewBtn");
const toastContainer = document.getElementById("toastContainer");

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();
  updateCartUI();
  setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
  // Category Pill Clicks
  categoryFilters.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-pill");
    if (!btn) return;
    document.querySelectorAll(".filter-pill").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.category;
    renderProducts();
  });

  // Search Input
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    clearSearchBtn.style.display = searchQuery ? "block" : "none";
    renderProducts();
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    clearSearchBtn.style.display = "none";
    renderProducts();
  });

  // Cart Drawer Events
  cartToggleBtn.addEventListener("click", openCart);
  closeCartBtn.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);

  // Apply Coupon
  applyCouponBtn.addEventListener("click", handleApplyCoupon);
  couponInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApplyCoupon();
    }
  });

  // Open Checkout Modal
  openCheckoutBtn.addEventListener("click", () => {
    if (cart.length === 0) return;
    closeCart();
    openCheckoutModal();
  });

  closeCheckoutBtn.addEventListener("click", closeCheckoutModal);

  // Payment Option selection style
  document.querySelectorAll(".payment-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      document.querySelectorAll(".payment-option").forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
    });
  });

  // Checkout Form Submission
  checkoutForm.addEventListener("submit", handleCheckoutSubmit);

  // Close Confirmation
  continueShoppingBtn.addEventListener("click", () => {
    confirmationModal.classList.remove("active");
  });

  // Quick View Close
  closeQuickViewBtn.addEventListener("click", () => {
    quickViewModal.classList.remove("active");
  });

  // Close modals on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCart();
      checkoutModal.classList.remove("active");
      quickViewModal.classList.remove("active");
      confirmationModal.classList.remove("active");
    }
  });
}

// Fetch Products from Express API
async function fetchProducts() {
  try {
    const res = await fetch("/api/products");
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    products = data.products || [];
    renderProducts();
  } catch (err) {
    console.error("Failed to fetch products from /api/products:", err);
    showToast("⚠️ Could not reach products API, check server.");
  }
}

// Render Products Grid
function renderProducts() {
  const filtered = products.filter((item) => {
    const matchCategory =
      activeCategory === "All" ||
      item.category.toLowerCase() === activeCategory.toLowerCase();
    const matchSearch =
      searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  resultsCount.textContent = `Showing ${filtered.length} product${filtered.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div class="no-results">
        <h3>No products found</h3>
        <p>Try refining your search term or select a different category filter.</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered
    .map((product) => {
      const badgeHtml = product.badge
        ? `<span class="card-badge">${product.badge}</span>`
        : "";
      const originalPriceHtml = product.originalPrice
        ? `<span class="original-price">$${product.originalPrice.toFixed(2)}</span>`
        : "";

      return `
        <article class="product-card" data-id="${product.id}">
          <div class="card-image-wrap" onclick="openQuickView(${product.id})">
            ${badgeHtml}
            <img src="${product.image}" alt="${product.name}" loading="lazy" />
            <button class="quickview-trigger">Quick View</button>
          </div>
          <div class="card-body">
            <span class="card-category">${product.category}</span>
            <h3 class="card-title" onclick="openQuickView(${product.id})">${product.name}</h3>
            <div class="card-rating">
              <span class="stars">★</span>
              <span><strong>${product.rating}</strong> (${product.reviewsCount} reviews)</span>
            </div>
            <div class="card-pricing">
              <span class="current-price">$${product.price.toFixed(2)}</span>
              ${originalPriceHtml}
            </div>
            <button class="btn add-to-cart-btn" onclick="addToCart(${product.id})">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
              Add to Cart
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

// Cart Drawer Open/Close
function openCart() {
  cartDrawer.classList.add("active");
  cartOverlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  cartDrawer.classList.remove("active");
  cartOverlay.classList.remove("active");
  document.body.style.overflow = "";
}

// Add Item to Cart
function addToCart(productId, qty = 1) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: qty
    });
  }

  saveCart();
  updateCartUI();
  showToast(`Added "${product.name}" to your cart!`);
}

// Change Quantity
function updateQuantity(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter((i) => i.id !== productId);
  }

  saveCart();
  updateCartUI();
}

// Remove Item from Cart
function removeFromCart(productId) {
  const item = cart.find((i) => i.id === productId);
  cart = cart.filter((i) => i.id !== productId);
  saveCart();
  updateCartUI();
  if (item) {
    showToast(`Removed "${item.name}" from cart`);
  }
}

// Save Cart to LocalStorage
function saveCart() {
  localStorage.setItem("devlacti_cart", JSON.stringify(cart));
}

// Update Cart UI & Totals
function updateCartUI() {
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCountBadge.textContent = totalItemCount;
  drawerItemCount.textContent = `(${totalItemCount} item${totalItemCount === 1 ? "" : "s"})`;

  if (cart.length === 0) {
    cartItemList.innerHTML = `
      <div class="empty-cart-state">
        <div class="empty-icon">🛒</div>
        <h4>Your cart is empty</h4>
        <p>Explore our products and find something you love!</p>
        <button class="btn btn-secondary" onclick="closeCart()">Browse Products</button>
      </div>
    `;
    cartFooter.style.display = "none";
    return;
  }

  cartFooter.style.display = "block";

  cartItemList.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="qty-control">
            <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">&minus;</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">&plus;</button>
          </div>
        </div>
        <button class="remove-item-btn" title="Remove" onclick="removeFromCart(${item.id})">&times;</button>
      </div>
    `
    )
    .join("");

  // Price Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discount = 0;
  if (appliedCoupon === "DEVL20") discount = subtotal * 0.20;
  else if (appliedCoupon === "WELCOME10") discount = subtotal * 0.10;
  else if (appliedCoupon === "CICD50") discount = subtotal * 0.50;

  const shipping = subtotal > 100 || subtotal === 0 ? 0 : 9.99;
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * 0.08;
  const total = taxable + shipping + tax;

  subtotalAmount.textContent = `$${subtotal.toFixed(2)}`;

  if (discount > 0) {
    discountRow.style.display = "flex";
    discountLabel.textContent = `Discount (${appliedCoupon})`;
    discountAmount.textContent = `-$${discount.toFixed(2)}`;
  } else {
    discountRow.style.display = "none";
  }

  shippingAmount.textContent = shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`;
  taxAmount.textContent = `$${tax.toFixed(2)}`;
  grandTotalAmount.textContent = `$${total.toFixed(2)}`;

  // Also update modal summary totals
  modalSummaryCount.textContent = `${totalItemCount} item${totalItemCount === 1 ? "" : "s"}`;
  modalSummaryTotal.textContent = `$${total.toFixed(2)}`;
}

// Handle Coupon Application
function handleApplyCoupon() {
  const code = couponInput.value.trim().toUpperCase();
  if (!code) return;

  if (code === "DEVL20" || code === "WELCOME10" || code === "CICD50") {
    appliedCoupon = code;
    couponFeedback.className = "coupon-feedback success";
    couponFeedback.textContent = `Coupon "${code}" applied successfully!`;
    updateCartUI();
    showToast(`Promo code "${code}" activated!`);
  } else {
    couponFeedback.className = "coupon-feedback error";
    couponFeedback.textContent = "Invalid promo code. Try DEVL20 or WELCOME10.";
  }
}

// Open Checkout Modal
function openCheckoutModal() {
  checkoutModal.classList.add("active");
}

function closeCheckoutModal() {
  checkoutModal.classList.remove("active");
}

// Handle Checkout Form Submission (Sends to Express Backend)
async function handleCheckoutSubmit(e) {
  e.preventDefault();

  submitOrderBtn.disabled = true;
  checkoutSpinner.style.display = "inline-block";

  const customer = {
    fullName: document.getElementById("fullName").value.trim(),
    email: document.getElementById("email").value.trim(),
    address: document.getElementById("address").value.trim(),
    city: document.getElementById("city").value.trim(),
    postalCode: document.getElementById("postalCode").value.trim()
  };

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer,
        items: cart,
        discountCode: appliedCoupon
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to place order");
    }

    // Success! Show confirmation
    checkoutModal.classList.remove("active");
    showOrderConfirmation(data.order);

    // Clear cart
    cart = [];
    appliedCoupon = null;
    couponInput.value = "";
    couponFeedback.textContent = "";
    saveCart();
    updateCartUI();
  } catch (err) {
    console.error(err);
    alert("Checkout error: " + err.message);
  } finally {
    submitOrderBtn.disabled = false;
    checkoutSpinner.style.display = "none";
  }
}

// Show Order Confirmation Modal
function showOrderConfirmation(order) {
  confirmOrderId.textContent = order.orderId;
  confirmDetails.innerHTML = `
    <div class="detail-row">
      <span>Customer:</span>
      <strong>${order.customer.fullName}</strong>
    </div>
    <div class="detail-row">
      <span>Destination:</span>
      <strong>${order.customer.city}, ${order.customer.postalCode}</strong>
    </div>
    <div class="detail-row">
      <span>Estimated Delivery:</span>
      <strong>${order.estimatedDelivery}</strong>
    </div>
    <div class="detail-row">
      <span>Items Purchased:</span>
      <strong>${order.items.reduce((s, i) => s + i.quantity, 0)} items</strong>
    </div>
    <div class="detail-row" style="font-size: 1rem; font-weight: 800; color: #0f172a; margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
      <span>Total Paid:</span>
      <strong>$${order.pricing.total.toFixed(2)}</strong>
    </div>
  `;
  confirmationModal.classList.add("active");
}

// Quick View Modal
function openQuickView(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const originalPriceHtml = product.originalPrice
    ? `<span class="original-price">$${product.originalPrice.toFixed(2)}</span>`
    : "";

  quickViewContent.innerHTML = `
    <div>
      <img src="${product.image}" alt="${product.name}" class="quickview-img" />
    </div>
    <div>
      <span class="card-category">${product.category}</span>
      <h2 style="font-size: 1.4rem; font-weight: 800; margin: 4px 0 10px;">${product.name}</h2>
      <div class="card-rating" style="margin-bottom: 12px;">
        <span class="stars">★★★★★</span>
        <span><strong>${product.rating}</strong> (${product.reviewsCount} reviews)</span>
      </div>
      <p style="color: #64748b; font-size: 0.9rem; line-height: 1.6; margin-bottom: 20px;">
        ${product.description}
      </p>
      <div class="card-pricing" style="margin-bottom: 20px;">
        <span class="current-price" style="font-size: 1.6rem;">$${product.price.toFixed(2)}</span>
        ${originalPriceHtml}
      </div>
      <button class="btn btn-primary btn-block" onclick="addToCart(${product.id}); quickViewModal.classList.remove('active');">
        Add to Cart
      </button>
    </div>
  `;

  quickViewModal.classList.add("active");
}

// Toast System
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>🛒</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

