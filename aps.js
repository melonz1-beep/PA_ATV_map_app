const viewport = document.getElementById("viewport");
const mapLayer = document.getElementById("mapLayer");
const map = document.getElementById("map");
const toast = document.getElementById("toast");

let scale = 1;
let minScale = 1;
let x = 0;
let y = 0;

let pointers = new Map();
let lastDistance = 0;
let lastCenter = null;

function updateMap() {
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

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2000);
}

function getDistance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function getCenter(a, b) {
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2
  };
}

viewport.addEventListener("pointerdown", e => {
  viewport.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, e);

  if (pointers.size === 2) {
    const pts = Array.from(pointers.values());
    lastDistance = getDistance(pts[0], pts[1]);
    lastCenter = getCenter(pts[0], pts[1]);
  }
});

viewport.addEventListener("pointermove", e => {
  if (!pointers.has(e.pointerId)) return;

  const oldPointer = pointers.get(e.pointerId);
  pointers.set(e.pointerId, e);

  if (pointers.size === 1) {
    x += e.clientX - oldPointer.clientX;
    y += e.clientY - oldPointer.clientY;
    updateMap();
  }

  if (pointers.size === 2) {
    const pts = Array.from(pointers.values());
    const newDistance = getDistance(pts[0], pts[1]);
    const newCenter = getCenter(pts[0], pts[1]);

    const rect = viewport.getBoundingClientRect();
    const cx = newCenter.x - rect.left;
    const cy = newCenter.y - rect.top;

    const oldScale = scale;
    scale = scale * (newDistance / lastDistance);
    scale = Math.min(Math.max(scale, minScale), 8);

    x = cx - ((cx - x) / oldScale) * scale;
    y = cy - ((cy - y) / oldScale) * scale;

    x += newCenter.x - lastCenter.x;
    y += newCenter.y - lastCenter.y;

    lastDistance = newDistance;
    lastCenter = newCenter;

    updateMap();
  }
});

viewport.addEventListener("pointerup", e => {
  pointers.delete(e.pointerId);
});

viewport.addEventListener("pointercancel", e => {
  pointers.delete(e.pointerId);
});

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;

    if (view === "full") {
      fitMap();
      showToast("Full map");
    }

    if (view === "gps") {
      showToast("Allow GPS permission if prompted");
      navigator.geolocation?.getCurrentPosition(
        () => showToast("GPS found"),
        () => showToast("GPS permission needed"),
        { enableHighAccuracy: true }
      );
    }

    if (view === "susquehannock") zoomTo(0.45, 0.42, 1.3, "Susquehannock");
    if (view === "whiskey") zoomTo(0.35, 0.67, 1.6, "Whiskey Springs");
    if (view === "haneyville") zoomTo(0.77, 0.66, 1.6, "Haneyville");
    if (view === "bloody") zoomTo(0.37, 0.82, 1.6, "Bloody Skillet");
  });
});

function zoomTo(px, py, newScale, label) {
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

if (map.complete) {
  fitMap();
} else {
  map.addEventListener("load", fitMap);
}

window.addEventListener("resize", fitMap);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
