const express = require("express");
const path = require("path");
const products = require("./products");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ECS Target Group & Container Health Check (Preserved)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Application is healthy",
    service: "devlacti-ecommerce",
    timestamp: new Date().toISOString()
  });
});

// Diagnostic / Status API
app.get("/api/status", (req, res) => {
  res.json({
    name: "DevlActi E-Commerce Store",
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Get all products (with optional search and category filters)
app.get("/api/products", (req, res) => {
  let result = [...products];
  const { category, search } = req.query;

  if (category && category !== "All") {
    result = result.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (search) {
    const q = search.toLowerCase().trim();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    total: result.length,
    products: result
  });
});

// Get product by ID
app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === parseInt(req.params.id, 10));
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  res.json({ success: true, product });
});

// Process Checkout
app.post("/api/checkout", (req, res) => {
  const { customer, items, discountCode } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Your shopping cart is empty"
    });
  }

  // Calculate totals
  let subtotal = 0;
  const processedItems = items.map((item) => {
    const matched = products.find((p) => p.id === item.id);
    const price = matched ? matched.price : item.price || 0;
    const name = matched ? matched.name : item.name || "Item";
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const lineTotal = price * quantity;
    subtotal += lineTotal;
    return {
      id: item.id,
      name,
      price,
      quantity,
      lineTotal: Number(lineTotal.toFixed(2))
    };
  });

  // Discount code calculation
  let discountRate = 0;
  if (discountCode) {
    const code = discountCode.trim().toUpperCase();
    if (code === "WELCOME10") discountRate = 0.10;
    else if (code === "DEVL20") discountRate = 0.20;
    else if (code === "CICD50") discountRate = 0.50;
  }

  const discountAmount = Number((subtotal * discountRate).toFixed(2));
  const shipping = subtotal > 100 || subtotal === 0 ? 0 : 9.99;
  const estimatedTax = Number(((subtotal - discountAmount) * 0.08).toFixed(2));
  const total = Number((subtotal - discountAmount + shipping + estimatedTax).toFixed(2));

  const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
  const estimatedDelivery = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  res.status(201).json({
    success: true,
    message: "Order placed successfully!",
    order: {
      orderId,
      customer: customer || { fullName: "Guest Customer", email: "guest@example.com" },
      items: processedItems,
      pricing: {
        subtotal: Number(subtotal.toFixed(2)),
        discountAmount,
        discountCode: discountCode || null,
        shipping,
        estimatedTax,
        total
      },
      estimatedDelivery,
      status: "Confirmed",
      createdAt: new Date().toISOString()
    }
  });
});

// Fallback to home page for any unknown routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`DevlActi E-Commerce Server running on port ${PORT}`);
});
