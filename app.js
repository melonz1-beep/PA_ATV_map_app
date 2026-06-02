const viewport = document.getElementById("viewport");
const mapLayer = document.getElementById("mapLayer");
const map = document.getElementById("map");
const markersLayer = document.getElementById("markers");
const gpsDot = document.getElementById("gpsDot");
const toast = document.getElementById("toast");
const statusBox = document.getElementById("status");
const installBtn = document.getElementById("installBtn");

// Map calibration from the printed coordinate grid on the PDF image.
// This is close enough for trail awareness, but always follow posted DCNR signs.
const GEO = { west: -78.166667, east: -77.333333, south: 41.0, north: 42.0 };

const markerData = [
  { type:"gas", label:"Fuel near Galeton", lat:41.735, lon:-77.645, icon:"⛽" },
  { type:"gas", label:"Fuel near Cross Fork", lat:41.480, lon:-77.817, icon:"⛽" },
  { type:"gas", label:"Fuel near Haneyville", lat:41.370, lon:-77.510, icon:"⛽" },
  { type:"gas", label:"Fuel near Coudersport area", lat:41.775, lon:-78.020, icon:"⛽" },
  { type:"parking", label:"Susquehannock parking", lat:41.640, lon:-77.820, icon:"🅿️" },
  { type:"parking", label:"Whiskey Springs parking", lat:41.335, lon:-77.865, icon:"🅿️" },
  { type:"parking", label:"Bloody Skillet parking", lat:41.160, lon:-77.735, icon:"🅿️" },
  { type:"parking", label:"Haneyville parking", lat:41.350, lon:-77.460, icon:"🅿️" },
  { type:"camping", label:"Camping near Lyman Run", lat:41.725, lon:-77.775, icon:"⛺" },
  { type:"camping", label:"Camping near Ole Bull / Cross Fork", lat:41.540, lon:-77.800, icon:"⛺" },
  { type:"camping", label:"Camping near Little Pine", lat:41.355, lon:-77.365, icon:"⛺" }
];

const trailViews = {
  susquehannock: { lat:41.640, lon:-77.815, scale:1.55, label:"Susquehannock ATV Trail" },
  whiskey: { lat:41.350, lon:-77.850, scale:1.85, label:"Whiskey Springs ATV Trail" },
  haneyville: { lat:41.355, lon:-77.455, scale:1.85, label:"Haneyville ATV Trail" },
  bloody: { lat:41.155, lon:-77.730, scale:1.85, label:"Bloody Skillet ATV Trail" }
};

let scale = 1, minScale = 1, x = 0, y = 0;
let pointers = new Map();
let lastDistance = 0;
let lastCenter = null;
let watchId = null;
let followGps = false;
let lastGps = null;
let deferredPrompt = null;

function lonLatToPixel(lon, lat) {
  const iw = map.naturalWidth;
  const ih = map.naturalHeight;
  return {
    x: ((lon - GEO.west) / (GEO.east - GEO.west)) * iw,
    y: ((GEO.north - lat) / (GEO.north - GEO.south)) * ih
  };
}

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
  markersLayer.style.width = iw + "px";
  markersLayer.style.height = ih + "px";
  minScale = Math.min(vw / iw, vh / ih);
  scale = minScale;
  x = (vw - iw * scale) / 2;
  y = (vh - ih * scale) / 2;
  updateMap();
  placeMarkers();
  if (lastGps) updateGpsDot(lastGps);
}

function centerOnLatLon(lat, lon, desiredScale, label) {
  const p = lonLatToPixel(lon, lat);
  scale = Math.max(desiredScale, minScale);
  x = viewport.clientWidth / 2 - p.x * scale;
  y = viewport.clientHeight / 2 - p.y * scale;
  updateMap();
  if (label) showToast(label);
}

function placeMarkers() {
  markersLayer.innerHTML = "";
  markerData.forEach(m => {
    const p = lonLatToPixel(m.lon, m.lat);
    const btn = document.createElement("button");
    btn.className = `marker ${m.type}`;
    btn.dataset.type = m.type;
    btn.style.left = `${p.x}px`;
    btn.style.top = `${p.y}px`;
    btn.title = m.label;
    btn.textContent = m.icon;
    btn.addEventListener("click", e => { e.stopPropagation(); showToast(m.label); });
    markersLayer.appendChild(btn);
  });
}

function filterMarkers(type) {
  document.querySelectorAll(".marker").forEach(m => {
    m.classList.toggle("hidden", !(type === "all" || m.dataset.type === type));
  });
  showToast(type === "off" ? "Markers hidden" : `${type} markers`);
  if (type === "off") document.querySelectorAll(".marker").forEach(m => m.classList.add("hidden"));
}

function updateGpsDot(pos) {
  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;
  lastGps = pos;
  const p = lonLatToPixel(lon, lat);
  gpsDot.style.left = `${p.x}px`;
  gpsDot.style.top = `${p.y}px`;
  gpsDot.hidden = false;
  const acc = Math.round(pos.coords.accuracy || 0);
  statusBox.textContent = `GPS ±${acc} ft/m approx`;
  if (followGps) centerOnLatLon(lat, lon, Math.max(scale, minScale * 3));
}

function startGps() {
  if (!navigator.geolocation) { showToast("GPS is not available on this phone"); return; }
  if (watchId !== null) { showToast("GPS already on"); return; }
  showToast("Starting GPS...");
  watchId = navigator.geolocation.watchPosition(
    updateGpsDot,
    () => { statusBox.textContent = "GPS permission needed"; showToast("Allow location permission"); },
    { enableHighAccuracy:true, maximumAge:2000, timeout:15000 }
  );
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function getDistance(a,b){ return Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY); }
function getCenter(a,b){ return { x:(a.clientX+b.clientX)/2, y:(a.clientY+b.clientY)/2 }; }

viewport.addEventListener("pointerdown", e => {
  e.preventDefault();
  viewport.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, e);
  if (pointers.size === 2) {
    const pts = Array.from(pointers.values());
    lastDistance = getDistance(pts[0], pts[1]);
    lastCenter = getCenter(pts[0], pts[1]);
  }
}, { passive:false });

viewport.addEventListener("pointermove", e => {
  if (!pointers.has(e.pointerId)) return;
  e.preventDefault();
  const oldPointer = pointers.get(e.pointerId);
  pointers.set(e.pointerId, e);
  if (pointers.size === 1) {
    x += e.clientX - oldPointer.clientX;
    y += e.clientY - oldPointer.clientY;
    updateMap();
  } else if (pointers.size === 2) {
    const pts = Array.from(pointers.values());
    const newDistance = getDistance(pts[0], pts[1]);
    const newCenter = getCenter(pts[0], pts[1]);
    const rect = viewport.getBoundingClientRect();
    const cx = newCenter.x - rect.left;
    const cy = newCenter.y - rect.top;
    const oldScale = scale;
    scale = scale * (newDistance / Math.max(lastDistance, 1));
    scale = Math.min(Math.max(scale, minScale), 10);
    x = cx - ((cx - x) / oldScale) * scale;
    y = cy - ((cy - y) / oldScale) * scale;
    x += newCenter.x - lastCenter.x;
    y += newCenter.y - lastCenter.y;
    lastDistance = newDistance;
    lastCenter = newCenter;
    updateMap();
  }
}, { passive:false });

function endPointer(e) { pointers.delete(e.pointerId); }
viewport.addEventListener("pointerup", endPointer);
viewport.addEventListener("pointercancel", endPointer);
viewport.addEventListener("lostpointercapture", endPointer);

viewport.addEventListener("dblclick", e => {
  const oldScale = scale;
  const rect = viewport.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  scale = Math.min(scale * 1.8, 10);
  x = cx - ((cx - x) / oldScale) * scale;
  y = cy - ((cy - y) / oldScale) * scale;
  updateMap();
});

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    if (view === "full") { followGps = false; fitMap(); showToast("Full map"); }
    if (view === "gps") { followGps = false; startGps(); }
    if (view === "follow") { followGps = true; startGps(); if (lastGps) updateGpsDot(lastGps); showToast("Follow mode on"); }
    if (trailViews[view]) {
      followGps = false;
      const t = trailViews[view];
      centerOnLatLon(t.lat, t.lon, t.scale, t.label);
    }
  });
});

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => filterMarkers(button.dataset.filter));
});

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

if (map.complete) fitMap(); else map.addEventListener("load", fitMap);
window.addEventListener("resize", fitMap);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
