const viewport = document.getElementById("viewport");
const mapLayer = document.getElementById("mapLayer");
const map = document.getElementById("map");
const markerLayer = document.getElementById("markerLayer");
const gpsDot = document.getElementById("gpsDot");
const installBtn = document.getElementById("installBtn");
const trailBanner = document.getElementById("trailBanner");
const infoCard = document.getElementById("infoCard");
const closeCard = document.getElementById("closeCard");

let scale = 1;
let minScale = 1;
let x = 0;
let y = 0;
let pointers = new Map();
let lastDistance = 0;
let lastCenter = null;
let deferredPrompt = null;

const markers = [];

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
  markerLayer.style.width = iw + "px";
  markerLayer.style.height = ih + "px";

  minScale = Math.min(vw / iw, vh / ih);
  scale = minScale;
  x = (vw - iw * scale) / 2;
  y = (vh - ih * scale) / 2;
  updateMap();
}

function showBanner(text) {
  trailBanner.textContent = text;
  trailBanner.style.display = "block";
  clearTimeout(trailBanner.timer);
  trailBanner.timer = setTimeout(() => {
    trailBanner.style.display = "none";
  }, 1800);
}

function zoomToMapPercent(px, py, zoomMultiplier, label) {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const iw = map.naturalWidth;
  const ih = map.naturalHeight;

  scale = minScale * zoomMultiplier;
  x = vw / 2 - iw * px * scale;
  y = vh / 2 - ih * py * scale;

  updateMap();
  showBanner(label);
}

function renderMarkers(filter = "hide") {
  markerLayer.innerHTML = "";
  if (filter === "hide") return;
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
    scale = Math.min(Math.max(scale, minScale), minScale * 8);

    x = cx - ((cx - x) / oldScale) * scale;
    y = cy - ((cy - y) / oldScale) * scale;

    x += newCenter.x - lastCenter.x;
    y += newCenter.y - lastCenter.y;

    lastDistance = newDistance;
    lastCenter = newCenter;

    updateMap();
  }
});

viewport.addEventListener("pointerup", e => pointers.delete(e.pointerId));
viewport.addEventListener("pointercancel", e => pointers.delete(e.pointerId));

let lastTap = 0;

viewport.addEventListener("click", e => {
  const now = Date.now();

  if (now - lastTap < 300) {
    const rect = viewport.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const oldScale = scale;

    scale = Math.min(scale * 1.7, minScale * 8);
    x = cx - ((cx - x) / oldScale) * scale;
    y = cy - ((cy - y) / oldScale) * scale;

    updateMap();
  }

  lastTap = now;
});

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;

    if (view === "full") {
      fitMap();
      showBanner("Full map");
    }

    if (view === "gps") startGPS();
    if (view === "susquehannock") zoomToMapPercent(0.46, 0.42, 2.1, "Susquehannock ATV Trail");
    if (view === "whiskey") zoomToMapPercent(0.35, 0.68, 2.1, "Whiskey Springs ATV Trail");
    if (view === "haneyville") zoomToMapPercent(0.78, 0.65, 2.1, "Haneyville ATV Trail");
    if (view === "bloody") zoomToMapPercent(0.39, 0.83, 2.1, "Bloody Skillet ATV Trail");
  });
});

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    if (infoCard) infoCard.hidden = true;
    renderMarkers(filter);

    if (filter === "all") showBanner("Markers shown");
    if (filter === "hide") showBanner("Markers hidden");
  });
});

function startGPS() {
  if (!navigator.geolocation) {
    showBanner("GPS not available");
    return;
  }

  showBanner("GPS starting");

  navigator.geolocation.watchPosition(
    pos => {
      showBanner("GPS active");
      placeApproxGpsDot(pos.coords.latitude, pos.coords.longitude);
    },
    () => showBanner("Allow GPS permission"),
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 12000
    }
  );
}

function placeApproxGpsDot(lat, lon) {
  const iw = map.naturalWidth;
  const ih = map.naturalHeight;

  const west = -78.25;
  const east = -77.25;
  const north = 42.08;
  const south = 40.95;

  const px = ((lon - west) / (east - west)) * iw;
  const py = ((north - lat) / (north - south)) * ih;

  gpsDot.style.left = px + "px";
  gpsDot.style.top = py + "px";
  gpsDot.hidden = false;
}

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

installBtn?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  installBtn.hidden = true;
});

closeCard?.addEventListener("click", () => {
  infoCard.hidden = true;
});

if (map.complete) {
  fitMap();
} else {
  map.addEventListener("load", fitMap);
}

renderMarkers("hide");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
    }


window.addEventListener("load", () => {

  const splash = document.getElementById("splash");

  if (!splash) return;

  setTimeout(() => {

    splash.style.opacity = "0";

    setTimeout(() => {
      splash.remove();
    }, 500);

  }, 1000);

});
