const viewport = document.getElementById("viewport");
const mapLayer = document.getElementById("mapLayer");
const map = document.getElementById("map");
const toast = document.getElementById("toast");
const gpsDot = document.getElementById("gpsDot");
const installBtn = document.getElementById("installBtn");
const infoPanel = document.getElementById("infoPanel");
const infoTitle = document.getElementById("infoTitle");
const infoText = document.getElementById("infoText");
const navBtn = document.getElementById("navBtn");
const favBtn = document.getElementById("favBtn");
const closeInfo = document.getElementById("closeInfo");

let scale = 1, minScale = 1, x = 0, y = 0;
let pointers = new Map();
let lastDistance = 0, lastCenter = null;
let lastTap = 0;
let followGps = false;
let deferredPrompt = null;
let selectedLocation = null;

// Rough calibration for the DCNR map image. Use for general trail awareness only.
const geoBounds = { west: -78.18, east: -77.30, north: 42.02, south: 40.98 };

const trailInfo = {
  susquehannock: { name: "Susquehannock ATV Trail", px: .45, py: .42, zoom: 1.3, text: "Susquehannock State Forest area. Use posted DCNR signs and current NRAT rules." },
  whiskey: { name: "Whiskey Springs ATV Trail", px: .35, py: .67, zoom: 1.6, text: "Whiskey Springs trail area. Check season, permit, registration, insurance, and helmet requirements." },
  haneyville: { name: "Haneyville ATV Trail", px: .77, py: .66, zoom: 1.6, text: "Haneyville trail area. Watch for legal connector routes and closed roads." },
  bloody: { name: "Bloody Skillet ATV Trail", px: .37, py: .82, zoom: 1.6, text: "Bloody Skillet trail area. Stay on designated ATV routes only." }
};

function updateMap() {
  mapLayer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

function fitMap() {
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const iw = map.naturalWidth, ih = map.naturalHeight;
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
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function getDistance(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
function getCenter(a, b) { return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; }

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
  const now = Date.now();
  if (now - lastTap < 300) doubleTapZoom(e);
  lastTap = now;
});
viewport.addEventListener("pointercancel", e => pointers.delete(e.pointerId));

function doubleTapZoom(e) {
  const rect = viewport.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const oldScale = scale;
  const target = scale < minScale * 3 ? minScale * 3 : minScale;
  scale = target;
  x = cx - ((cx - x) / oldScale) * scale;
  y = cy - ((cy - y) / oldScale) * scale;
  updateMap();
}

function zoomTo(px, py, newScale, label) {
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const iw = map.naturalWidth, ih = map.naturalHeight;
  scale = Math.max(newScale, minScale);
  x = vw / 2 - iw * px * scale;
  y = vh / 2 - ih * py * scale;
  updateMap();
  showToast(label);
}

function showInfo(title, text, lat = null, lon = null) {
  selectedLocation = lat && lon ? { lat, lon } : null;
  infoTitle.textContent = title;
  infoText.textContent = text;
  navBtn.hidden = !selectedLocation;
  infoPanel.hidden = false;
}

closeInfo.addEventListener("click", () => infoPanel.hidden = true);
navBtn.addEventListener("click", () => {
  if (!selectedLocation) return;
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.lat},${selectedLocation.lon}`, "_blank");
});
favBtn.addEventListener("click", () => {
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  favorites.push({ title: infoTitle.textContent, text: infoText.textContent, saved: new Date().toISOString() });
  localStorage.setItem("favorites", JSON.stringify(favorites));
  showToast("Favorite saved");
});

function setFilter(filter) {
  document.querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("active", b.dataset.filter === filter));
  document.querySelectorAll(".marker").forEach(marker => {
    marker.classList.toggle("hidden", filter !== "all" && marker.dataset.marker !== filter);
  });
  showToast(filter === "all" ? "All markers" : `${filter} markers`);
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    if (view === "full") { fitMap(); showToast("Full map"); }
    if (view === "gps") startGps();
    if (trailInfo[view]) {
      const t = trailInfo[view];
      zoomTo(t.px, t.py, t.zoom, t.name);
      showInfo(t.name, t.text);
    }
  });
});

document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => setFilter(button.dataset.filter)));
document.querySelectorAll(".marker").forEach(marker => marker.addEventListener("click", e => {
  e.stopPropagation();
  showInfo(marker.dataset.name || "Map marker", "Approximate marker from the DCNR map. Verify exact location before riding.");
}));

function gpsToPixel(lat, lon) {
  const iw = map.naturalWidth, ih = map.naturalHeight;
  const px = (lon - geoBounds.west) / (geoBounds.east - geoBounds.west);
  const py = (geoBounds.north - lat) / (geoBounds.north - geoBounds.south);
  return { left: px * iw, top: py * ih, px, py };
}

function startGps() {
  if (!navigator.geolocation) { showToast("GPS is not available"); return; }
  followGps = true;
  showToast("Finding GPS...");
  navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude, accuracy } = pos.coords;
    const p = gpsToPixel(latitude, longitude);
    gpsDot.hidden = false;
    gpsDot.style.left = p.left + "px";
    gpsDot.style.top = p.top + "px";
    if (followGps) zoomTo(p.px, p.py, Math.max(scale, minScale * 3), "GPS location");
    showInfo("My GPS Location", `Accuracy about ${Math.round(accuracy)} feet/meters depending on your phone. This blue dot is approximate on the image map.`, latitude, longitude);
  }, () => showToast("Allow location permission"), { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 });
}

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false;
});
if (installBtn) installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  installBtn.hidden = true;
});

if (map.complete) fitMap(); else map.addEventListener("load", fitMap);
setFilter("all");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js?v=400").catch(() => {});
}
