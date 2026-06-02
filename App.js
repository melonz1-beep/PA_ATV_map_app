const viewport = document.getElementById("viewport");
const mapLayer = document.getElementById("mapLayer");
const map = document.getElementById("map");
const toast = document.getElementById("toast");

let scale = 1;
let x = 0;
let y = 0;
let dragging = false;
let startX = 0;
let startY = 0;

function updateMap() {
  mapLayer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

function fitMap() {
  scale = 1;
  x = 0;
  y = 0;
  updateMap();
}

map.addEventListener("load", fitMap);

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
  scale += e.deltaY * -0.001;
  scale = Math.min(Math.max(scale, 1), 8);
  updateMap();
});

document.querySelectorAll("[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;

    if (view === "full") {
      fitMap();
      showToast("Full map");
    }

    if (view === "gps") {
      showLocation();
    }

    if (view === "susquehannock") zoomTo(-430, -420, 2.4, "Susquehannock ATV Trail");
    if (view === "whiskey") zoomTo(-320, -980, 3, "Whiskey Springs ATV Trail");
    if (view === "haneyville") zoomTo(-1050, -900, 3, "Haneyville ATV Trail");
    if (view === "bloody") zoomTo(-620, -1200, 3, "Bloody Skillet ATV Trail");
  });
});

function zoomTo(nx, ny, ns, label) {
  x = nx;
  y = ny;
  scale = ns;
  updateMap();
  showToast(label);
}

function showLocation() {
  if (!navigator.geolocation) {
    showToast("GPS is not available on this phone");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      showToast("GPS found. Location display is approximate on this image map.");
      console.log(pos.coords.latitude, pos.coords.longitude);
    },
    () => showToast("Allow location permission to use GPS")
  );
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

let deferredPrompt;
const installBtn = document.getElementById("installBtn");

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
