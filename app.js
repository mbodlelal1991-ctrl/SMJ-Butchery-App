// TODO: update this URL if your API Gateway endpoint changes
const API_URL = "https://10ifzm8562.execute-api.us-east-1.amazonaws.com/prod/orders";

// --- MENU DATA ---
// Edit this list to match SMJ's real menu and prices.
// category "braai" and "raw" are priced by weight (pricePerKg).
// category "side" is priced per unit (price).
const MENU = [
  { id: "wors", name: "Traditional Wors", category: "braai", pricePerKg: 150 },
  { id: "rump", name: "Rump Steak", category: "braai", pricePerKg: 190 },
  { id: "lambchops", name: "Lamb Chops", category: "braai", pricePerKg: 170 },

  { id: "rawwors", name: "Raw Boerewors", category: "raw", pricePerKg: 110 },
  { id: "rawtbone", name: "Raw T-Bone Steak", category: "raw", pricePerKg: 135 },
  { id: "rawchuck", name: "Raw Chuck/Short Rib", category: "raw", pricePerKg: 105 },

  { id: "pap", name: "Pap & Chakalaka", category: "side", price: 25 },
  { id: "garlicroll", name: "Garlic Roll", category: "side", price: 20 },
  { id: "softdrink", name: "Soft Drink (330ml)", category: "side", price: 18 },
];

// The cart holds whatever the customer has added so far
let cart = [];
let orderType = "sit-in";

const braaiMenuEl = document.getElementById("braaiMenu");
const rawMenuEl = document.getElementById("rawMenu");
const sideMenuEl = document.getElementById("sideMenu");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const orderTypeButtons = document.querySelectorAll(".orderTypeBtn");
const orderTypeNote = document.getElementById("orderTypeNote");
const orderForm = document.getElementById("orderForm");
const submitBtn = document.getElementById("submitBtn");
const responseMessage = document.getElementById("responseMessage");

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// Build the menu HTML for one category
function renderMenuSection(container, items) {
  container.innerHTML = items
    .map((item) => {
      if (item.category === "side") {
        return `
          <div class="menu-item">
            <span class="menu-item-name">${escapeHTML(item.name)} - R${item.price.toFixed(2)}</span>
            <button type="button" class="addBtn" data-id="${item.id}" data-mode="qty">+ Add</button>
          </div>
        `;
      }
      // braai and raw items need a weight input
      return `
        <div class="menu-item">
          <span class="menu-item-name">${escapeHTML(item.name)} - R${item.pricePerKg.toFixed(2)}/kg</span>
          <input type="number" class="weightInput" data-id="${item.id}" placeholder="kg" min="0.1" step="0.1" value="0.5">
          <button type="button" class="addBtn" data-id="${item.id}" data-mode="weight">+ Add</button>
        </div>
      `;
    })
    .join("");
}

renderMenuSection(braaiMenuEl, MENU.filter((i) => i.category === "braai"));
renderMenuSection(rawMenuEl, MENU.filter((i) => i.category === "raw"));
renderMenuSection(sideMenuEl, MENU.filter((i) => i.category === "side"));

// Handle "+ Add" clicks across all three menu sections
document.querySelectorAll(".addBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = MENU.find((i) => i.id === btn.dataset.id);
    if (btn.dataset.mode === "weight") {
      const weightInput = document.querySelector(`.weightInput[data-id="${item.id}"]`);
      const weightKg = parseFloat(weightInput.value);
      if (!weightKg || weightKg <= 0) return;
      cart.push({ name: item.name, category: item.category, weightKg, pricePerKg: item.pricePerKg });
    } else {
      // Sides: if it's already in the cart, just bump the quantity instead of adding a duplicate line
      const existing = cart.find((c) => c.name === item.name && c.category === "side");
      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({ name: item.name, category: item.category, price: item.price, qty: 1 });
      }
    }
    enforceOrderTypeRule();
    renderCart();
  });
});

// Removes one line from the cart by its position in the array
function removeCartItem(index) {
  cart.splice(index, 1);
  enforceOrderTypeRule();
  renderCart();
}

// Raw meat is always takeaway - if any raw item is in the cart,
// force the order type to takeaway and lock the sit-in button
function enforceOrderTypeRule() {
  const hasRawMeat = cart.some((item) => item.category === "raw");

  if (hasRawMeat) {
    orderType = "takeaway";
    orderTypeNote.textContent = "Your order includes raw meat, so it must be takeaway.";
  } else {
    orderTypeNote.textContent = "";
  }

  orderTypeButtons.forEach((btn) => {
    const isSitIn = btn.dataset.type === "sit-in";
    btn.disabled = hasRawMeat && isSitIn;
    btn.classList.toggle("active", btn.dataset.type === orderType);
  });
}

orderTypeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    orderType = btn.dataset.type;
    orderTypeButtons.forEach((b) => b.classList.toggle("active", b === btn));
  });
});

// Calculates the price of one cart line, same logic as the backend uses
function calculateItemTotal(item) {
  if (item.category === "side") {
    return item.price * item.qty;
  }
  return item.pricePerKg * item.weightKg;
}

function renderCart() {
  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<p class="empty-cart">No items added yet.</p>`;
    cartTotalEl.textContent = "0.00";
    return;
  }

  cartItemsEl.innerHTML = cart
    .map((item, index) => {
      const lineTotal = calculateItemTotal(item);
      const detail =
        item.category === "side"
          ? `${item.qty} x R${item.price.toFixed(2)}`
          : `${item.weightKg}kg x R${item.pricePerKg.toFixed(2)}/kg`;
      return `
        <div class="cart-item">
          <span>${escapeHTML(item.name)} (${detail}) - R${lineTotal.toFixed(2)}</span>
          <button type="button" class="removeCartBtn" data-index="${index}">✕</button>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".removeCartBtn").forEach((btn) => {
    btn.addEventListener("click", () => removeCartItem(parseInt(btn.dataset.index, 10)));
  });

  const total = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  cartTotalEl.textContent = total.toFixed(2);
}

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (cart.length === 0) {
    responseMessage.className = "error";
    responseMessage.textContent = "Please add at least one item to your order.";
    return;
  }

  const customerName = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("phone").value.trim();

  const orderPayload = { customerName, phone, orderType, items: cart };

  submitBtn.disabled = true;
  submitBtn.textContent = "Placing order...";
  responseMessage.className = "";
  responseMessage.textContent = "";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      responseMessage.className = "success";
      responseMessage.textContent = `${data.message} Order ID: ${data.orderId}. Total: R${data.total.toFixed(2)}`;
      orderForm.reset();
      cart = [];
      orderType = "sit-in";
      enforceOrderTypeRule();
      renderCart();
    } else {
      responseMessage.className = "error";
      responseMessage.textContent = data.message || "Something went wrong. Please try again.";
    }
  } catch (err) {
    responseMessage.className = "error";
    responseMessage.textContent = "Could not reach the server. Check your connection and try again.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Place Order";
  }
});

renderCart();
