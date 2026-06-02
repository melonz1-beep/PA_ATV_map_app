const viewport = document.getElementById("viewport");
const mapLayer = document.getElementById("mapLayer");
const map = document.getElementById("map");
const toast = document.getElementById("toast");
const installBtn = document.getElementById("installBtn");

let scale = 1;
let x = 0;
let y = 0;
let dragging = false;
let startX = 0;
let startY = 0;
let deferredPrompt = null;

function updateMap() {
  mapLayer.style.transformOrigin = "0 0";
  mapLayer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

function fitMap() {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const iw = map.naturalWidth;
  const ih = map.naturalHeight;

  if (!iw || !ih) return;

  scale = Math.min(vw / iw, vh / ih);
  x = (vw - iw * scale) / 2;
  y = (vh - ih * scale) / 2;

  updateMap();
}

function zoomTo(nx, ny, ns, label) {
  scale = ns;
  x = nx;
  y = ny;
  updateMap();
  showToast(label);
}

map.addEventListener("load", fitMap);
window.addEventListener("resize", fitMap);

viewport.addEventListener("pointerdown", e => {
  dragging = true;
  startX = e.clientX - x;
  startY = e.clientY - y;
  viewport.setPointerCapture(e.pointerId);
});

viewport.addEventListener("pointermove", e => {
  if (!dragging) return;
  x = e.clientX - startX;
  y = e.clientY - startY;
  updateMap();
});

viewport.addEventListener("pointerup", e => {
  dragging = false;
  viewport.releasePointerCapture(e.pointerId);
});

viewport.addEventListener("pointercancel", () => {
  dragging = false;
});

viewport.addEventListener("wheel", e => {
  e.preventDefault();

  const oldScale = scale;
  const rect = viewport.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  scale += e.deltaY * -0.001;
  scale = Math.min(Math.max(scale, 0.1), 10);

  x = mouseX - ((mouseX - x) / oldScale) * scale;
  y = mouseY - ((mouseY - y) / oldScale) * scale;

  updateMap();
}, { passive: false });

document.querySelectorAll("[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;

    if (view === "full") fitMap();
    if (view === "gps") showLocation();

    if (view === "susquehannock") zoomTo(-430, -420, 2.4, "Susquehannock ATV Trail");
    if (view === "whiskey") zoomTo(-320, -980, 3, "Whiskey Springs ATV Trail");
    if (view === "haneyville") zoomTo(-1050, -900, 3, "Haneyville ATV Trail");
    if (view === "bloody") zoomTo(-620, -1200, 3, "Bloody Skillet ATV Trail");
  });
});

document.querySelectorAll("[data-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    showToast(`${btn.textContent} markers`);
  });
});

function showLocation() {
  if (!navigator.geolocation) {
    showToast("GPS is not available on this phone");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      showToast("GPS found. Location is approximate on this image map.");
      console.log("Latitude:", pos.coords.latitude);
      console.log("Longitude:", pos.coords.longitude);
    },
    () => showToast("Allow location permission to use GPS"),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
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

if (map.complete) {
  fitMap();
        }
