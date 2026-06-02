const viewport = document.getElementById("viewport");
const mapLayer = document.getElementById("mapLayer");
const map );
const markerLayer = document.getElementById("markerLayer");
const gpsDot = document.getElementById("gpsDot");
const installBtn = document.getElementById("installBtn");

const trailBanner = document.getElementById("trailBanner");
const infoCard = document.getElementById("infoCard");
const cardTitle = document.gntById("cardTitle");
const cardText = document.getElementById("cardText");
const closeCard = document.getElementById("closeCard");

let scale = 1;
let minS
let x = 0;
let y = 0;

let pointers = new Map();
let lastDistance = 0;
let lastCentell;
let deferredPrompt = null;

const markers = [
  { type: "gas", icon: "⛽", x: 47, y: 39, title: "Fuel Stop", text: "Fuel location shown on the DCNR ATV map." },
  { type: "gas", icon: "⛽", x: 60, y: 54, title: "Fuel Stop", text: "Nearby fuel area. Confirm hours before riding." },
  { type: "parking", icon: "🅿️", x: 43, y: 43, title: "Parking", text: "Parking or staging area shown on the map." },
  { type: 8, y: 62, title: "Parking", text: "Use marked parking areas for trail access." },
  { type: "camping", icon: "⛺", x: 36, y: 66, title: "Camping", text: "Camping area or nearby state park camping." },
  { type: "camping", icon: "⛺", x: 55, y: 68, title: "Camping", text: "Check campground availability and rules." },
  { type: "food", icon: "🍔", x: 50, y: 41, title: "Food / Snacks", text: "Food, snack, or drink location shown on the map." },
  { type: "food", icon: "🍔", x: 62, y: 56, title: "Food / Snacks", text: "Nearby food or drink stop. Confirm hours before riding." }
];

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

function zoomToMapPercent(px, py, zoomMultiplier, label) {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const iw = map.naturalWidth;
  const ih = map.naturalHeight;

  scale = minScale * zoomMultiplier;

  x = vw / 2 - iw * px 

  updateMap();
  showBanner(label);
}

function gentleZoom(label) {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const oldScale = scale;
  const  * 2.2, scale * 1.15);

  const cx = 
  const cy = vh / 2;

  scale = Math.min(newScale, minScale * 5);

  x = cx - ((cx - x) / oldScale) * scale;
  y = cy - ) * scale;

  updateMap();
  showBanner(label);
}

function showBanner(text) {
  trailBanner.textContent = text;
  trailBanner.style.dis "block";

  clearTimeout(trailBanner.timer);
  trailBanner.timer = setTimeout(() => {
    trailBanner.style.display = "none";
  }, 1800);
}

function showCard(title, text) {
  cardTitle.textContent = title;
  cardText.textContent = text;
  infoCard.hidden = false;
}

closeCard.addEventListener("click", () => {
  infoCard.hidden = true;
});

function renderMarkers(filter = "hide") {
  markerLayer.innerHTML = "";

  if 

  markers.forEach(m => {
    if (filter !== "all" && m.type !== filter) return;

    const btn = document.createElement("button");
    btn.className = "marker";
    btn.textContent = m.icon;
    btn.style.left = m.x + "%";
    btn.style.top = m.y + "%";

    btn.addEventListener("click", e => {
      e.stopPropagation();
      showCard(m.title, m.text);
    });

    markerLayer.appendChild(btn);
  });
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

viewport.addEventListener("pointerup", e => {
  pointers.delete(e.pointerId);
});

viewport.addEventListener("pointercancel", e => {
  pointers.delete(e.pointerId);
});

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

    if (view === "gps") {
      startGPS();
    }

    if (view === "susquehannock") {
      zoomToMapPercent(0.46, 0.42, 2.1, "Susquehannock ATV Trail");
    }

    if (view === "whiskey") {
      zoomToMapPercent(0.35, 0.68, 2.1, "Whiskey Springs ATV Trail");
    }

    if (view === "haneyville") {
      zoomToMapPercent(0.78, 0.65, 2.1, "Haneyville ATV Trail");
    }

    if (view === "bloody") {
      zoomToMapPercent(0.39, 0.83, 2.1, "Bloody Skillet ATV Trail");
    }
  });
});

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    renderMarkers(filter);
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

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      placeApproxGpsDot(lat, lon);
    },
    () => {
      showBanner("Allow GPS permission");
    },
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

  /*
    Approximate calibration for the DCNR NRAT map.
    Fine-tuning may be needed after field testing.
  */

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

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  installBtn.hidden = true;
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
