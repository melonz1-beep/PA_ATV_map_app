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

let activeFilter = "all";

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

  // Shows the FULL map, not zoomed in
  minScale = Math.min(vw / iw, vh / ih);

  scale = minScale;
  x = (vw - iw * scale) / 2;
  y = (vh - ih * scale) / 2;

  updateMap();
  showToast("Full map view");
}

function zoomAt(clientX, clientY, zoomAmount) {
  const oldScale = scale;
  const rect = viewport.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;

  scale = Math.min(Math.max(scale * zoomAmount, minScale), 8);

  x = px - ((px - x) / oldScale) * scale;
  y = py - ((py - y) / oldScale) * scale;

  updateMap();
}

function zoomTo(nx, ny, ns, label) {
  scale = Math.max(ns, minScale);
  x = nx;
  y = ny;
  updateMap();
  showToast(label);
}

function showToast(msg) {
  if (!toast) {
    alert(msg);
    return;
  }

  toast.textContent = msg;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// Load / resize
map.addEventListener("load", fitMap);
window.addEventListener("resize", fitMap);

if (map.complete) {
  setTimeout(fitMap, 200);
}

// Drag map
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
  try {
    viewport.releasePointerCapture(e.pointerId);
  } catch {}
});

viewport.addEventListener("pointercancel", () => {
  dragging = false;
});

// Mouse wheel zoom
viewport.addEventListener(
  "wheel",
  e => {
    e.preventDefault();
    const zoomAmount = e.deltaY < 0 ? 1.15 : 0.85;
    zoomAt(e.clientX, e.clientY, zoomAmount);
  },
  { passive: false }
);

// Double tap / double click zoom
viewport.addEventListener("dblclick", e => {
  zoomAt(e.clientX, e.clientY, 1.6);
});

// View buttons
document.querySelectorAll("[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;

    if (view === "full") {
      fitMap();
      return;
    }

    if (view === "gps" || view === "location") {
      showLocation();
      return;
    }

    if (view === "susquehannock") {
      zoomTo(-430, -420, 2.4, "Susquehannock ATV Trail");
    }

    if (view === "whiskey") {
      zoomTo(-320, -980, 3, "Whiskey Springs ATV Trail");
    }

    if (view === "haneyville") {
      zoomTo(-1050, -900, 3, "Haneyville ATV Trail");
    }

    if (view === "bloody") {
      zoomTo(-620, -1200, 3, "Bloody Skillet ATV Trail");
    }
  });
});

// Filter buttons: gas, parking, camping
document.querySelectorAll("[data-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    activeFilter = btn.dataset.filter;

    document.querySelectorAll("[data-filter]").forEach(b => {
      b.classList.remove("active");
    });

    btn.classList.add("active");

    applyMarkerFilter(activeFilter);

    const label = btn.textContent.trim();
    showToast(`${label} shown`);
  });
});

function applyMarkerFilter(filter) {
  const markers = document.querySelectorAll("[data-marker]");

  if (!markers.length) {
    showToast("Markers are not added to the map yet");
    return;
  }

  markers.forEach(marker => {
    const type = marker.dataset.marker;

    if (filter === "all" || type === filter) {
      marker.style.display = "";
    } else {
      marker.style.display = "none";
    }
  });
}

// GPS / My Location
function showLocation() {
  if (!navigator.geolocation) {
    showToast("GPS is not available on this phone");
    return;
  }

  showToast("Checking location...");

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude.toFixed(5);
      const lon = pos.coords.longitude.toFixed(5);

      showToast(`Your GPS: ${lat}, ${lon}`);

      console.log("Latitude:", lat);
      console.log("Longitude:", lon);

      alert(
        "Your phone location was found:\n\n" +
          "Latitude: " +
          lat +
          "\nLongitude: " +
          lon +
          "\n\nThis is an image map, so GPS cannot place a dot unless the map image is georeferenced."
      );
    },
    error => {
      if (error.code === 1) {
        showToast("Location permission was blocked");
      } else {
        showToast("Could not get your location");
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

window.showLocation = showLocation;

// Install button
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;

  if (installBtn) {
    installBtn.hidden = false;
  }
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) {
      showToast("Use Chrome menu ⋮ then Add to Home screen");
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    deferredPrompt = null;
    installBtn.hidden = true;
  });
}

// Service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
