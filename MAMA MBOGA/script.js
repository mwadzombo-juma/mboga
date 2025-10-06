// script.js - Mama Mboga Kiosk logic
const STORAGE_KEY = "mama_mboga_products_v1";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

let products = []; // {id,name,buyingPrice,sellingPrice,quantity,soldQuantity,hidden}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    products = raw ? JSON.parse(raw) : [];
  } catch(e) {
    products = [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

// ---------- UI helpers ----------
function el(id) { return document.getElementById(id); }

function formatKsh(v) {
  return Number(v).toFixed(2);
}

// ---------- Rendering ----------
function updateAllUI() {
  renderVisibleList();
  renderHiddenList();
  updateSaleSelect();
  updateProfitDisplay();
}

function renderVisibleList() {
  const tbody = el("visibleList");
  tbody.innerHTML = "";
  products.filter(p => !p.hidden).forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(p.name)}</td>
      <td>${p.quantity}</td>
      <td>${formatKsh(p.sellingPrice)}</td>
      <td>${formatKsh(p.buyingPrice)}</td>
      <td>${p.soldQuantity ?? 0}</td>
      <td>
        <button class="action hide" onclick="hideProduct('${p.id}')">Hide</button>
        <button class="action delete" onclick="deleteProduct('${p.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderHiddenList() {
  const tbody = el("hiddenList");
  tbody.innerHTML = "";
  products.filter(p => p.hidden).forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(p.name)}</td>
      <td>${p.quantity}</td>
      <td>${formatKsh(p.sellingPrice)}</td>
      <td>${formatKsh(p.buyingPrice)}</td>
      <td>
        <button class="action restore" onclick="restoreProduct('${p.id}')">Restore</button>
        <button class="action delete" onclick="deleteProduct('${p.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateSaleSelect() {
  const sel = el("selectSaleProduct");
  sel.innerHTML = "";
  products.filter(p => !p.hidden && p.quantity > 0)
    .forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} (stock: ${p.quantity})`;
      sel.appendChild(opt);
    });
}

function updateProfitDisplay() {
  const profit = products.reduce((sum,p) => {
    const unitProfit = (p.sellingPrice - p.buyingPrice) || 0;
    return sum + (unitProfit * (p.soldQuantity || 0));
  }, 0);
  el("profitDisplay").textContent = formatKsh(profit);
}

// ---------- Actions ----------
function addOrRestockProduct() {
  const name = el("inputName").value.trim();
  const buy = parseFloat(el("inputBuy").value);
  const sell = parseFloat(el("inputSell").value);
  const qty = parseInt(el("inputQty").value, 10);

  if (!name) return alert("Enter product name.");
  if (isNaN(buy) || isNaN(sell) || isNaN(qty) || qty < 0) return alert("Enter valid numbers.");

  // Check existing by name (case-insensitive)
  const existing = products.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    // Update prices and increase qty, un-hide
    existing.buyingPrice = buy;
    existing.sellingPrice = sell;
    existing.quantity = (existing.quantity || 0) + qty;
    existing.hidden = false;
  } else {
    products.push({
      id: generateId(),
      name,
      buyingPrice: buy,
      sellingPrice: sell,
      quantity: qty,
      soldQuantity: 0,
      hidden: false
    });
  }
  saveData();
  updateAllUI();
  // clear inputs
  el("inputName").value = "";
  el("inputBuy").value = "";
  el("inputSell").value = "";
  el("inputQty").value = "";
}

function recordSaleAction() {
  const productId = el("selectSaleProduct").value;
  const qty = parseInt(el("inputSaleQty").value, 10);
  if (!productId) return alert("Select a product to sell.");
  if (isNaN(qty) || qty <= 0) return alert("Enter valid quantity.");

  const p = products.find(x => x.id === productId);
  if (!p) return alert("Product not found.");
  if (p.quantity < qty) return alert("Not enough stock.");

  p.quantity -= qty;
  p.soldQuantity = (p.soldQuantity || 0) + qty;

  // auto-hide if stock becomes 0
  if (p.quantity === 0) {
    p.hidden = true;
  }

  saveData();
  updateAllUI();
  el("inputSaleQty").value = "";
}

function hideProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  p.hidden = true;
  saveData();
  updateAllUI();
}

function restoreProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  p.hidden = false;
  saveData();
  updateAllUI();
}

function deleteProduct(id) {
  if (!confirm("Delete permanently? This cannot be undone.")) return;
  products = products.filter(x => x.id !== id);
  saveData();
  updateAllUI();
}

function startNewDayAction() {
  if (!confirm("Start a new day? This will reset daily sold counts only.")) return;
  products.forEach(p => p.soldQuantity = 0);
  saveData();
  updateAllUI();
}

function downloadBackup() {
  const backup = {
    exportedAt: new Date().toISOString(),
    products
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mama-mboga-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// toggle hidden section display
function toggleHiddenSection() {
  const hiddenSection = document.getElementById("hiddenSection");
  const btn = document.getElementById("toggleHiddenBtn");
  if (hiddenSection.classList.contains("hidden")) {
    hiddenSection.classList.remove("hidden");
    btn.textContent = "Hide Hidden";
  } else {
    hiddenSection.classList.add("hidden");
    btn.textContent = "Show Hidden";
  }
}

// simple HTML escape for product names
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

// ---------- hook up events ----------
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  updateAllUI();

  el("btnAdd").addEventListener("click", addOrRestockProduct);
  el("btnRecordSale").addEventListener("click", recordSaleAction);
  el("btnViewProfit").addEventListener("click", updateProfitDisplay);
  el("btnNewDay").addEventListener("click", startNewDayAction);
  el("btnBackup").addEventListener("click", downloadBackup);
  el("toggleHiddenBtn").addEventListener("click", toggleHiddenSection);
});
