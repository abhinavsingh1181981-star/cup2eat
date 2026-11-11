const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const toast = document.querySelector(".toast");
let toastTimer;
const packKey = "pack";
const productPrices = new Map([
  ["Chocolate Chip", 109],
  ["Chocolate", 99],
  ["Strawberry", 109],
  ["Elaichi", 99],
  ["Vanilla", 99],
  ["Mango", 75],
  ["Pista", 89]
]);
let pack = readPackFromUrl();

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function closeMenu() {
  if (!menuToggle || !navLinks) return;
  navLinks.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open menu");
  menuToggle.textContent = "☰";
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    menuToggle.textContent = isOpen ? "×" : "☰";
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

function readPackFromUrl() {
  const serializedPack = new URLSearchParams(window.location.search).get(packKey);
  if (!serializedPack) return [];

  try {
    const parsedPack = JSON.parse(serializedPack);
    if (!Array.isArray(parsedPack)) throw new Error("Demo pack data is not a list.");

    return parsedPack.map((item) => {
      if (!item || !productPrices.has(item.name) || !Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new Error("Demo pack contains an invalid item.");
      }

      return { name: item.name, price: productPrices.get(item.name), quantity: item.quantity };
    });
  } catch (error) {
    window.setTimeout(() => showToast("Couldn't load the demo pack. Please add your items again."), 0);
    return [];
  }
}

function itemCount() {
  return pack.reduce((count, item) => count + item.quantity, 0);
}

function savePackToUrl() {
  const params = new URLSearchParams(window.location.search);
  if (pack.length) {
    params.set(packKey, JSON.stringify(pack));
  } else {
    params.delete(packKey);
  }

  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  syncPageLinks();
  updatePackBadge();
  renderPackPage();
}

function syncPageLinks() {
  document.querySelectorAll('a[href$=".html"], a[href*=".html?"]').forEach((link) => {
    const url = new URL(link.getAttribute("href"), window.location.href);
    url.searchParams.delete(packKey);
    if (pack.length) url.searchParams.set(packKey, JSON.stringify(pack));
    link.href = `${url.pathname.split("/").pop()}${url.search}${url.hash}`;
  });
}

function updatePackBadge() {
  const count = itemCount();
  document.querySelectorAll("#demo-order-count").forEach((badge) => {
    badge.textContent = String(count);
    badge.setAttribute("aria-label", `${count} ${count === 1 ? "pack" : "packs"} in demo pack`);
  });
  document.querySelectorAll(".demo-pack").forEach((link) => {
    link.setAttribute("aria-label", `Demo pack, ${count} ${count === 1 ? "pack" : "packs"}`);
  });
}

function addProduct(name) {
  const existingItem = pack.find((item) => item.name === name);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    pack.push({ name, price: productPrices.get(name), quantity: 1 });
  }

  savePackToUrl();
  showToast(`${name} added to your demo pack.`);
}

function changeQuantity(name, adjustment) {
  const item = pack.find((entry) => entry.name === name);
  if (!item) return;

  item.quantity += adjustment;
  if (item.quantity <= 0) pack = pack.filter((entry) => entry.name !== name);
  savePackToUrl();
}

function renderPackPage() {
  const container = document.querySelector("#demo-pack-items");
  if (!container) return;

  container.replaceChildren();
  const total = pack.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalElement = document.querySelector("#demo-pack-total");
  const emptyState = document.querySelector("#demo-pack-empty");
  const content = document.querySelector("#demo-pack-content");

  totalElement.textContent = `₹${total}`;
  emptyState.hidden = pack.length > 0;
  content.hidden = pack.length === 0;

  pack.forEach((item) => {
    const row = document.createElement("article");
    row.className = "pack-item";

    const name = document.createElement("h2");
    name.textContent = item.name;

    const unitPrice = document.createElement("p");
    unitPrice.textContent = `₹${item.price} per menu pack`;

    const quantity = document.createElement("strong");
    quantity.className = "pack-quantity";
    quantity.textContent = String(item.quantity);

    const controls = document.createElement("div");
    controls.className = "pack-controls";
    controls.setAttribute("aria-label", `${item.name} pack quantity`);

    for (const [label, action, adjustment] of [["Decrease", "decrease", -1], ["Increase", "increase", 1]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label === "Increase" ? "+" : "−";
      button.setAttribute("aria-label", `${label} ${item.name}`);
      button.dataset.cartAction = action;
      button.dataset.product = item.name;
      button.dataset.adjustment = String(adjustment);
      controls.append(button);
    }

    const lineTotal = document.createElement("strong");
    lineTotal.textContent = `₹${item.price * item.quantity}`;

    const details = document.createElement("div");
    details.className = "pack-item-details";
    details.append(name, unitPrice);

    row.append(details, controls, quantity, lineTotal);
    container.append(row);
  });
}

document.querySelectorAll("[data-add-product]").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.addProduct;
    if (!productPrices.has(name)) {
      showToast("This flavour isn't available in the demo menu.");
      return;
    }
    addProduct(name);
  });
});

document.querySelector("#demo-pack-items")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (button) changeQuantity(button.dataset.product, Number(button.dataset.adjustment));
});

document.querySelector("#clear-demo-pack")?.addEventListener("click", () => {
  pack = [];
  savePackToUrl();
  showToast("Demo pack cleared.");
});

syncPageLinks();
updatePackBadge();
renderPackPage();
