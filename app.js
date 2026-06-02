const viewport = document.getElementById("viewport");
const mapLayer = document.getElementById("mapLayer");
const map = document.getElementById("map");
const toast = document.getElementById("toast");
const installBtn = document.getElementById("installBtn");

let scale = 1;
let minScale = 1;
let x = 0;
let y = 0;
let dragging = false;
let startX = 0;
let startY = 0;
let deferredPrompt = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function updateMap() {
  mapLayer.style.transformOrigin = "0 0";
  mapLayer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

function fitMap() {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const iw = map.naturalWidth;
  const ih = map.naturalHeight;

  if (!vw || !vh || !iw || !ih) return;

  map.style.width = iw + "px";
  map.style.height = ih + "px";
  mapLayer.style.width = iw + "px";
  mapLayer.style.height = ih + "px";

  minScale = Math.min(vw / iw, vh / ih);
  scale = minScale;

  x = (vw - iw * scale) / 2;
  y = (vh - ih * scale) / 2;

  updateMap();
}

function zoomToPercent(px, py, newScale, label) {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const iw = map.naturalWidth;
  const ih = map.naturalHeight;

  scale = Math.max(newScale, minScale);
  x = vw / 2 - iw * px * scale;
  y = vh / 2 - ih * py * scale;

  updateMap();
  showToast(label);
}

map.addEventListener("load", fitMap);
window.addEventListener("resize", fitMap);

if (map.complete) fitMap();

viewport.addEventListener("pointerdown", e => {
  dragging = true;
  startX = e.clientX - x;
  startY = e.clientY - y;
});

viewport.addEventListener("pointermove", e => {
  if (!dragging) return;
  x = e.clientX - startX;
  y = e.clientY - startY;
  updateMap();
});

viewport.addEventListener("pointerup", () => dragging = false);
viewport.addEventListener("pointercancel", () => dragging = false);

viewport.addEventListener("wheel", e => {
  e.preventDefault();

  const oldScale = scale;
  const rect = viewport.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  scale += e.deltaY * -0.001;
  scale = Math.min(Math.max(scale, minScale), 10);

  x = cx - ((cx - x) / oldScale) * scale;
  y = cy - ((cy - y) / oldScale) * scale;

  updateMap();
}, { passive: false });

document.querySelectorAll("[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;

    if (view === "full") {
      fitMap();
      showToast("Full map");
    }

    if (view === "gps") showLocation();

    if (view === "susquehannock") zoomToPercent(0.45, 0.42, 1.2, "Susquehannock ATV Trail");
    if (view === "whiskey") zoomToPercent(0.35, 0.67, 1.5, "Whiskey Springs ATV Trail");
    if (view === "haneyville") zoomToPercent(0.77, 0.66, 1.5, "Haneyville ATV Trail");
    if (view === "bloody") zoomToPercent(0.37, 0.82, 1.5, "Bloody Skillet ATV Trail");
  });
});

document.querySelectorAll("[data-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    showToast(btn.textContent + " markers");
  });
});

function showLocation() {
  if (!navigator.geolocation) {
    showToast("GPS not available");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    () => showToast("GPS found. Location is approximate."),
    () => showToast("Allow location permission"),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  installBtn.hidden = true;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
