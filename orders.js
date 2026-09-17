// TODO: update this URL if your API Gateway endpoint changes
const API_URL = "https://10ifzm8562.execute-api.us-east-1.amazonaws.com/prod/orders";

const ordersContainer = document.getElementById("ordersContainer");
const loadingMsg = document.getElementById("loadingMsg");
const errorMsg = document.getElementById("errorMsg");
const refreshBtn = document.getElementById("refreshBtn");

const NEXT_STATUS = {
  received: "preparing",
  preparing: "ready",
  ready: "completed",
  completed: null,
};

const STATUS_LABELS = {
  received: "Mark as Preparing",
  preparing: "Mark as Ready",
  ready: "Mark as Completed",
};

// Escapes any customer-supplied text before it's inserted into the page,
// so an order with something like <script> in the name field can't run
// as actual code in the staff dashboard's browser
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function loadOrders() {
  loadingMsg.style.display = "block";
  errorMsg.style.display = "none";
  ordersContainer.innerHTML = "";

  try {
    const res = await fetch(API_URL, { method: "GET" });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to load orders");
    }

    renderOrders(data.orders);
  } catch (err) {
    errorMsg.textContent = "Could not load orders: " + err.message;
    errorMsg.style.display = "block";
  } finally {
    loadingMsg.style.display = "none";
  }
}

function renderOrders(orders) {
  if (!orders || orders.length === 0) {
    ordersContainer.innerHTML = "<p>No orders yet.</p>";
    return;
  }

  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  ordersContainer.innerHTML = sorted.map(orderCardHTML).join("");

  document.querySelectorAll(".status-update-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { orderId, newStatus } = btn.dataset;
      updateStatus(orderId, newStatus, btn);
    });
  });
}

// Formats one item line depending on whether it's sold by weight or by unit
function formatItemLine(item) {
  const safeName = escapeHTML(item.name);
  if (item.category === "side") {
    return `${item.qty}x ${safeName}`;
  }
  return `${item.weightKg}kg ${safeName}`;
}

function orderCardHTML(order) {
  const safeCustomerName = escapeHTML(order.customerName);
  const safePhone = escapeHTML(order.phone);
  const safeOrderId = escapeHTML(order.orderId);

  const itemsText = (order.items || []).map(formatItemLine).join(", ");

  const time = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const nextStatus = NEXT_STATUS[order.status];
  const buttonLabel = STATUS_LABELS[order.status];

  const actionButton = nextStatus
    ? `<button class="status-update-btn" data-order-id="${safeOrderId}" data-new-status="${nextStatus}">${buttonLabel}</button>`
    : "";

  const orderTypeLabel = order.orderType === "sit-in" ? "Sit-in" : "Takeaway";
  const orderTypeClass = order.orderType === "sit-in" ? "order-type-sitin" : "order-type-takeaway";

  return `
    <div class="order-card status-${order.status}">
      <div class="order-top">
        <span class="order-id">${safeOrderId}</span>
        <span class="order-time">${time}</span>
      </div>
      <div class="order-customer">${safeCustomerName}</div>
      <div class="order-phone">${safePhone}</div>
      <span class="order-type-badge ${orderTypeClass}">${orderTypeLabel}</span>
      <div class="order-items">${itemsText}</div>
      <div class="status-badge status-${order.status}">${order.status}</div>
      <div class="order-actions">${actionButton}</div>
    </div>
  `;
}

async function updateStatus(orderId, newStatus, buttonEl) {
  buttonEl.disabled = true;
  buttonEl.textContent = "Updating...";

  try {
    const res = await fetch(API_URL, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: newStatus }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Update failed");
    }

    loadOrders();
  } catch (err) {
    errorMsg.textContent = "Could not update order: " + err.message;
    errorMsg.style.display = "block";
    buttonEl.disabled = false;
  }
}

refreshBtn.addEventListener("click", loadOrders);

loadOrders();
