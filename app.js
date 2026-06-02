const viewport = document.getElementById("viewport");
const mapLayer = document.getElementById("mapLayer");
const map = document.getElementById("map");
const markersLayer = document.getElementById("markers");
const gpsDot = document.getElementById("gpsDot");
const toast = document.getElementById("toast");
const statusBox = document.getElementById("status");
const installBtn = document.getElementById("installBtn");
const compass = document.getElementById("compass");
const drawer = document.getElementById("drawer");
const drawerTitle = document.getElementById("drawerTitle");
const drawerBody = document.getElementById("drawerBody");
const drawerClose = document.getElementById("drawerClose");

// Approximate calibration using printed coordinate grid on the map image.
// This is for general trail awareness only. Follow posted DCNR signs and official maps.
const GEO = { west: -78.166667, east: -77.333333, south: 41.0, north: 42.0 };

const places = [
  { id:"susq", type:"trailhead", label:"Susquehannock ATV Trail", lat:41.640, lon:-77.815, icon:"🥾", desc:"Large DCNR trail system area near Potter/Tioga counties. Use this button to jump to the Susquehannock trail section." },
  { id:"whiskey", type:"trailhead", label:"Whiskey Springs ATV Trail", lat:41.350, lon:-77.850, icon:"🥾", desc:"Trail section near the southern/western part of the Northcentral ATV region." },
  { id:"haneyville", type:"trailhead", label:"Haneyville ATV Trail", lat:41.355, lon:-77.455, icon:"🥾", desc:"Trail section near Haneyville and Little Pine Creek area." },
  { id:"bloody", type:"trailhead", label:"Bloody Skillet ATV Trail", lat:41.155, lon:-77.730, icon:"🥾", desc:"Trail section near the Sproul State Forest / Snow Shoe region." },

  { id:"gas-galeton", type:"gas", label:"Fuel near Galeton", lat:41.735, lon:-77.645, icon:"⛽", desc:"Fuel stop area near Galeton. Verify hours before riding." },
  { id:"gas-crossfork", type:"gas", label:"Fuel near Cross Fork", lat:41.480, lon:-77.817, icon:"⛽", desc:"Fuel stop area near Cross Fork / Ole Bull region. Verify hours before riding." },
  { id:"gas-haneyville", type:"gas", label:"Fuel near Haneyville", lat:41.370, lon:-77.510, icon:"⛽", desc:"Fuel stop area near Haneyville. Verify access and hours." },
  { id:"gas-coudersport", type:"gas", label:"Fuel near Coudersport", lat:41.775, lon:-78.020, icon:"⛽", desc:"Fuel and supplies area near Coudersport." },

  { id:"park-susq", type:"parking", label:"Susquehannock Parking", lat:41.640, lon:-77.820, icon:"🅿️", desc:"Approximate parking area for the Susquehannock trail section." },
  { id:"park-whiskey", type:"parking", label:"Whiskey Springs Parking", lat:41.335, lon:-77.865, icon:"🅿️", desc:"Approximate parking area for Whiskey Springs." },
  { id:"park-bloody", type:"parking", label:"Bloody Skillet Parking", lat:41.160, lon:-77.735, icon:"🅿️", desc:"Approximate parking area for Bloody Skillet." },
  { id:"park-haneyville", type:"parking", label:"Haneyville Parking", lat:41.350, lon:-77.460, icon:"🅿️", desc:"Approximate parking area for Haneyville." },

  { id:"camp-lyman", type:"camping", label:"Lyman Run Camping Area", lat:41.725, lon:-77.775, icon:"⛺", desc:"Camping area near Lyman Run State Park region. Confirm reservations and ATV rules." },
  { id:"camp-olebull", type:"camping", label:"Ole Bull / Cross Fork Camping", lat:41.540, lon:-77.800, icon:"⛺", desc:"Camping area near Cross Fork and Ole Bull region. Confirm reservations and ATV rules." },
  { id:"camp-littlepine", type:"camping", label:"Little Pine Camping Area", lat:41.355, lon:-77.365, icon:"⛺", desc:"Camping area near Little Pine. Confirm reservations and ATV access." },

  { id:"food-galeton", type:"food", label:"Food near Galeton", lat:41.735, lon:-77.645, icon:"🍔", desc:"Food/supplies area near Galeton." },
  { id:"food-coudersport", type:"food", label:"Food near Coudersport", lat:41.775, lon:-78.020, icon:"🍔", desc:"Food/supplies area near Coudersport." },
  { id:"food-crossfork", type:"food", label:"Food near Cross Fork", lat:41.480, lon:-77.817, icon:"🍔", desc:"Food/supplies area near Cross Fork." }
];

const trailViews = {
  susquehannock: { placeId:"susq", scale:1.55 },
  whiskey: { placeId:"whiskey", scale:1.85 },
  haneyville: { placeId:"haneyville", scale:1.85 },
  bloody: { placeId:"bloody", scale:1.85 }
};

let scale = 1, minScale = 1, x = 0, y = 0;
let pointers = new Map();
let lastDistance = 0;
let lastCenter = null;
let watchId = null;
let followGps = false;
let lastGps = null;
let deferredPrompt = null;
let activeFilter = "all";

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
  places.forEach(m => {
    const p = lonLatToPixel(m.lon, m.lat);
    const btn = document.createElement("button");
    btn.className = `marker ${m.type}`;
    btn.dataset.type = m.type;
    btn.dataset.id = m.id;
    btn.style.left = `${p.x}px`;
    btn.style.top = `${p.y}px`;
    btn.title = m.label;
    btn.textContent = m.icon;
    btn.addEventListener("click", e => { e.stopPropagation(); openPlace(m.id); });
    markersLayer.appendChild(btn);
  });
  applyFilter(activeFilter);
}

function applyFilter(type) {
  activeFilter = type;
  document.querySelectorAll(".marker").forEach(m => {
    const show = type === "all" || m.dataset.type === type || (type === "trailhead" && m.dataset.type === "trailhead");
    m.classList.toggle("hidden", type === "off" || !show);
  });
}

function filterMarkers(type) {
  applyFilter(type);
  showToast(type === "off" ? "Markers hidden" : `${type} markers`);
}

function openDrawer(title, html) {
  drawerTitle.textContent = title;
  drawerBody.innerHTML = html;
  drawer.hidden = false;
}
function closeDrawer() { drawer.hidden = true; }
drawerClose.addEventListener("click", closeDrawer);

function openPlace(id) {
  const p = places.find(item => item.id === id);
  if (!p) return;
  const favs = getFavorites();
  const dist = lastGps ? `${distanceMiles(lastGps.coords.latitude, lastGps.coords.longitude, p.lat, p.lon).toFixed(1)} mi away` : "Turn on GPS for distance";
  openDrawer(p.label, `
    <div class="infoCard">
      <h3>${p.icon} ${p.label}</h3>
      <p>${p.desc}</p>
      <p><strong>Distance:</strong> ${dist}</p>
      <button onclick="window.appActions.zoomPlace('${p.id}')">Show on map</button>
      <button onclick="window.appActions.navigate('${p.id}')">Open Google Maps</button>
      <button class="secondary" onclick="window.appActions.toggleFavorite('${p.id}')">${favs.includes(p.id) ? "Remove Favorite" : "Save Favorite"}</button>
    </div>
  `);
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem("paAtvFavorites") || "[]"); }
  catch { return []; }
}
function saveFavorites(favs) { localStorage.setItem("paAtvFavorites", JSON.stringify(favs)); }
function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1); else favs.push(id);
  saveFavorites(favs);
  showToast(idx >= 0 ? "Removed favorite" : "Favorite saved");
  openPlace(id);
}
function showFavorites() {
  const favIds = getFavorites();
  if (!favIds.length) { openDrawer("Favorites", `<p>No favorites saved yet. Tap a marker and choose <strong>Save Favorite</strong>.</p>`); return; }
  const html = favIds.map(id => places.find(p => p.id === id)).filter(Boolean).map(p => placeLine(p)).join("");
  openDrawer("Favorite Locations", html);
}

function placeLine(p) {
  const dist = lastGps ? `${distanceMiles(lastGps.coords.latitude, lastGps.coords.longitude, p.lat, p.lon).toFixed(1)} mi` : "GPS off";
  return `<div class="infoCard"><h3>${p.icon} ${p.label}</h3><p>${p.desc}</p><p><strong>${dist}</strong></p><button onclick="window.appActions.zoomPlace('${p.id}')">Show</button><button onclick="window.appActions.navigate('${p.id}')">Google Maps</button></div>`;
}

function showNearest() {
  if (!lastGps) { openDrawer("Distance to Trailheads", `<p>Tap <strong>GPS On</strong> first so the app can calculate distances from your current location.</p>`); return; }
  const rows = places
    .filter(p => ["trailhead","gas","parking","camping","food"].includes(p.type))
    .map(p => ({...p, miles: distanceMiles(lastGps.coords.latitude, lastGps.coords.longitude, p.lat, p.lon)}))
    .sort((a,b) => a.miles - b.miles)
    .slice(0, 12)
    .map(p => `<div class="distanceLine"><button class="smallBtn" onclick="window.appActions.openPlace('${p.id}')">${p.icon} ${p.label}</button><span>${p.miles.toFixed(1)} mi</span></div>`)
    .join("");
  openDrawer("Nearest Places", rows);
}

function showTrailInfo() {
  openDrawer("Offline Trail Information", `
    <div class="infoCard"><h3>Trail sections</h3><p>Use the trail buttons to jump to Susquehannock, Whiskey Springs, Haneyville, or Bloody Skillet. Pinch to zoom and drag to pan.</p></div>
    <div class="infoCard"><h3>Camping</h3><p>Camping markers show general camping areas near the route. Confirm reservations, ATV access, and quiet-hour rules before arriving.</p></div>
    <div class="infoCard"><h3>Emergency numbers</h3><p><strong>Emergency:</strong> 911</p><p><strong>PA DCNR:</strong> Use posted forest office numbers on signs or official DCNR pages when service is available.</p><p>Share your planned route with someone before riding.</p></div>
    <div class="infoCard"><h3>DCNR / NRAT regulations shown on the map</h3>
      <ul class="rules">
        <li>DOT-approved helmets are required.</li>
        <li>Operators need a valid PA driver’s license or equivalent out-of-state operator’s license on NRAT routes and designated roads.</li>
        <li>Headlights and taillights must be functional and visible for at least 500 feet.</li>
        <li>Unless posted otherwise, NRAT speed limit is 25 mph.</li>
        <li>Daylight operation only: sunrise to sunset.</li>
        <li>Valid ATV/UTV registration and insurance are required.</li>
        <li>Required DCNR NRAT tag/decal must be displayed, and operators must carry the NRAT permit form.</li>
        <li>Only ride designated NRAT routes, designated ATV-permitted roads, or ATV trails.</li>
      </ul>
    </div>
    <div class="infoCard"><h3>Nearby fuel and food</h3><p>Use the Gas and Food filter buttons. Tap a marker for distance and a Google Maps navigation button. Verify hours before riding because rural stops may close early.</p></div>
  `);
}

function navigatePlace(id) {
  const p = places.find(item => item.id === id);
  if (!p) return;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=driving`;
  window.open(url, "_blank");
}
function zoomPlace(id) {
  const p = places.find(item => item.id === id);
  if (!p) return;
  closeDrawer();
  centerOnLatLon(p.lat, p.lon, Math.max(minScale * 4, 1.8), p.label);
}

window.appActions = { openPlace, navigate: navigatePlace, zoomPlace, toggleFavorite };

function updateGpsDot(pos) {
  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;
  lastGps = pos;
  const p = lonLatToPixel(lon, lat);
  gpsDot.style.left = `${p.x}px`;
  gpsDot.style.top = `${p.y}px`;
  gpsDot.hidden = false;
  const accMeters = Math.round(pos.coords.accuracy || 0);
  statusBox.textContent = `GPS ±${accMeters} m`;
  if (followGps) centerOnLatLon(lat, lon, Math.max(scale, minScale * 4));
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

function startCompass() {
  const update = heading => {
    if (typeof heading !== "number" || isNaN(heading)) return;
    const h = Math.round(heading);
    compass.textContent = `🧭 ${h}°`;
    compass.style.transform = `rotate(${0}deg)`;
  };

  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
    compass.addEventListener("click", () => {
      DeviceOrientationEvent.requestPermission().then(state => {
        if (state === "granted") window.addEventListener("deviceorientation", e => update(e.webkitCompassHeading || (360 - e.alpha)));
      }).catch(() => showToast("Compass permission unavailable"));
    }, { once:true });
  } else if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientationabsolute", e => update(e.alpha));
    window.addEventListener("deviceorientation", e => update(e.webkitCompassHeading || (360 - e.alpha)));
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function getDistance(a,b){ return Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY); }
function getCenter(a,b){ return { x:(a.clientX+b.clientX)/2, y:(a.clientY+b.clientY)/2 }; }
function distanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

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

let lastTap = 0;
viewport.addEventListener("touchend", e => {
  const now = Date.now();
  if (now - lastTap < 300) {
    const t = e.changedTouches[0];
    const fake = new MouseEvent("dblclick", { clientX:t.clientX, clientY:t.clientY });
    viewport.dispatchEvent(fake);
  }
  lastTap = now;
}, { passive:true });

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    if (view === "full") { followGps = false; fitMap(); showToast("Full map"); }
    if (view === "gps") { followGps = false; startGps(); }
    if (view === "follow") { followGps = true; startGps(); if (lastGps) updateGpsDot(lastGps); showToast("Follow mode on"); }
    if (trailViews[view]) {
      followGps = false;
      const t = trailViews[view];
      const p = places.find(item => item.id === t.placeId);
      centerOnLatLon(p.lat, p.lon, t.scale, p.label);
    }
  });
});

document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => filterMarkers(button.dataset.filter)));
document.querySelectorAll("[data-action]").forEach(button => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "nearest") showNearest();
    if (action === "favorites") showFavorites();
    if (action === "info") showTrailInfo();
  });
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
startCompass();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
