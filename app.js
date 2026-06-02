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
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function updateMap() {
  mapLayer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

function fitMap() {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const iw = map.naturalWidth;
  const ih = map.naturalHeight;

  if (!vw || !vh || !iw || !ih) return;

  minScale = Math.min(vw / iw, vh / ih);
  scale = minScale;

  x = (vw - iw * scale) / 2;
  y = (vh - ih * scale) / 2;

  updateMap();
  showToast("Full map view");
}

function zoomAt(clientX, clientY, amount) {
  const oldScale = scale;
  const rect = viewport.getBoundingClientRect();

  const px = clientX - rect.left;
  const py = clientY - rect.top;

  scale = Math.min(Math.max(scale * amount, minScale), minScale * 8);

  x = px - ((px - x) / oldScale) * scale;
  y = py - ((py - y) / oldScale) * scale;

  updateMap();
}

function zoomToPercent(px, py, zoom, label) {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const iw = map.naturalWidth;
  const ih = map.naturalHeight;

  scale = minScale * zoom;

  const mapX = iw * px;
  const mapY = ih * py;

  x = vw / 2 - mapX * scale;
  y = vh / 2 - mapY * scale;

  updateMap();
  showToast(label);
}

map.addEventListener("load", fitMap);
window.addEventListener("resize", fitMap);

if (map.complete) {
  setTimeout(fitMap, 200);
}

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

viewport.addEventListener("dblclick", e => {
  zoomAt(e.clientX, e.clientY, 1.7);
});

viewport.addEventListener("wheel", e => {
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 0.85);
}, { passive: false });

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;

    if (view === "full") {
      fitMap();
    }

    if (view === "gps") {
      showLocation();
    }

    if (view === "susquehannock") {
      zoomToPercent(0.42, 0.45, 2.2, "Susquehannock ATV Trail");
    }

    if (view === "whiskey") {
      zoomToPercent(0.55, 0.48, 2.2, "Whiskey Springs ATV Trail");
    }

    if (view === "haneyville") {
      zoomToPercent(0.48, 0.56, 2.2, "Haneyville ATV Trail");
    }

    if (view === "bloody") {
      zoomToPercent(0.58, 0.62, 2.2, "Bloody Skillet ATV Trail");
    }
  });
});

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    document.querySelectorAll("[data-filter]").forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    document.querySelectorAll("[data-marker]").forEach(marker => {
      if (filter === "all" || marker.dataset.marker === filter) {
        marker.classList.add("show");
      } else {
        marker.classList.remove("show");
      }
    });

    showToast(`${button.textContent.trim()} shown`);
  });
});

function showLocation() {
  if (!navigator.geolocation) {
    showToast("GPS is not available on this phone");
    return;
  }

  showToast("Checking location...");

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude.toFixed(5);
      const lng = position.coords.longitude.toFixed(5);

      alert(
        "Your phone GPS location was found:\n\n" +
        "Latitude: " + lat + "\n" +
        "Longitude: " + lng + "\n\n" +
        "This map is a picture, so GPS cannot place an exact dot until the image is calibrated."
      );
    },
    () => {
      showToast("Allow location permission to use GPS");
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event;

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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
