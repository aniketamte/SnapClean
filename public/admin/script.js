// // admin/script.js
// const API_URL = "http://localhost:5000"; // Local backend only

// let complaints = [];
// let map = null,
// allMarkers = [],
// lastActiveMarker = null;

// const riskIcons = [
// "[https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png](https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png)", // Risk 1
// "[https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png](https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png)", // Risk 2
// "[https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png](https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png)",   // Risk 3
// ];

// document.addEventListener("DOMContentLoaded", function () {
// setupTabs();
// initMap();
// loadComplaints();
// });

// function setupTabs() {
// const tabButtons = document.querySelectorAll(".tab-btn");
// tabButtons.forEach((btn) => {
// btn.addEventListener("click", function () {
// tabButtons.forEach((x) => x.classList.remove("active"));
// this.classList.add("active");
// renderTab(this.dataset.tab);
// });
// });
// }

// async function loadComplaints() {
// try {
// const res = await fetch(`${API_BASE}/api/complaints`);
// const list = await res.json();
// complaints = list.map((c) => ({
// _id: c._id,
// group: c.group || "group1",
// status: c.status || "Pending",
// title: c.title || "",
// description: c.description || "",
// lat: c.lat,
// lon: c.lon,
// risk: c.risk || 1,
// photo: c.photo || null,
// createdAt: c.createdAt,
// }));
// renderStatusCards();
// renderTab(getActiveTab());
// clearMarkers();
// addMarkers();
// } catch (err) {
// console.error("Failed to load complaints:", err);
// alert("Could not fetch complaints from server. Is backend running?");
// }
// }

// function renderTab(tabGroup) {
// const list = document.getElementById("complaint-list");
// list.innerHTML = "";

// let filtered = complaints.filter((c) => c.group === tabGroup);

// if (filtered.length === 0) {
// list.innerHTML = `<li>No complaints in this category.</li>`;
// return;
// }

// filtered.forEach((c) => {
// const li = document.createElement("li");
// li.innerHTML = `      <strong>${c.title}</strong> - ${c.description || ""}       <br>Status: ${c.status}       <br>Risk: ${c.risk}       <br>Location: ${c.lat?.toFixed(5)}, ${c.lon?.toFixed(5)}
//       ${c.photo ?`<br><img src="${c.photo}" width="120"/>`: ""}       <br>       <button onclick="updateStatus('${c._id}', 'Completed')">Mark Completed</button>
//    `;
// list.appendChild(li);
// });
// }

// function renderStatusCards() {
// const total = complaints.length;
// const pending = complaints.filter((c) => c.status === "Pending").length;
// const completed = complaints.filter((c) => c.status === "Completed").length;

// document.getElementById("total-count").textContent = total;
// document.getElementById("pending-count").textContent = pending;
// document.getElementById("completed-count").textContent = completed;
// }

// async function updateStatus(id, status) {
// try {
// await fetch(`${API_BASE}/api/complaints/${id}/status`, {
// method: "PATCH",
// headers: { "Content-Type": "application/json" },
// body: JSON.stringify({ status }),
// });
// await loadComplaints();
// } catch (err) {
// console.error(err);
// alert("Failed to update complaint status");
// }
// }

// function initMap() {
// map = L.map("india-map").setView([18.52, 73.85], 12); // Pune default

// L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
// attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a>',
// maxZoom: 19,
// }).addTo(map);
// }

// function clearMarkers() {
// allMarkers.forEach((m) => map.removeLayer(m));
// allMarkers = [];
// }

// function addMarkers() {
// complaints.forEach((c) => {
// if (c.lat && c.lon) {
// const icon = L.icon({
// iconUrl: riskIcons[(c.risk || 1) - 1],
// iconSize: [25, 41],
// iconAnchor: [12, 41],
// });

//   const marker = L.marker([c.lat, c.lon], { icon }).addTo(map);
//   marker.bindPopup(
//     `<b>${c.title}</b><br>${c.description || ""}<br>Status: ${
//       c.status
//     }<br>Risk: ${c.risk}`
//   );
//   allMarkers.push(marker);
// }

// });
// }

// function getActiveTab() {
// const active = document.querySelector(".tab-btn.active");
// return active ? active.dataset.tab : "group1";
// }

// admin/script.js  (replace your old admin script with this)
const API_BASE = "http://localhost:5000"; // change if deployed

let complaints = [];
let map = null,
  allMarkers = [],
  lastActiveMarker = null;

const riskIcons = [
  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png", // 1
  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png", // 2
  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png", // 3
];

document.addEventListener("DOMContentLoaded", function () {
  setupTabs();
  initMap();
  loadComplaints();
});

function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      tabButtons.forEach((x) => x.classList.remove("active"));
      this.classList.add("active");
      renderTab(this.dataset.tab);
    });
  });
}

async function loadComplaints() {
  try {
    const res = await fetch(`${API_BASE}/api/complaints`);
    const list = await res.json();
    // normalize
    complaints = list.map((c) => ({
      _id: c._id,
      group: c.group || "group1",
      status: c.status || "Pending",
      title: c.title || "",
      description: c.description || "",
      lat: c.lat,
      lon: c.lon,
      risk: c.risk || 1,
      photo: c.photo || null,
      createdAt: c.createdAt,
    }));
    renderStatusCards();
    renderTab(getActiveTab());
    clearMarkers();
    addMarkers();
  } catch (err) {
    console.error("Failed to load complaints:", err);
    alert("Could not fetch complaints from server. Is backend running?");
  }
}

function renderTab(tabGroup) {
  const list = document.getElementById("complaint-list");
  list.innerHTML = "";

  let filtered = complaints.filter((c) => c.group === tabGroup);
  if (filtered.length === 0) {
    list.innerHTML = `<li style="padding:12px;color:#666">No complaints in this list.</li>`;
    return;
  }

  filtered.forEach((item) => {
    const idx = complaints.indexOf(item);
    const li = document.createElement("li");
    li.className = "complaint-item";
    li.dataset.idx = idx;

    li.innerHTML = `
      <div class="risk-icon risk-${item.risk}">
        <i class="fa${
          item.risk === 1
            ? "-solid fa-circle"
            : item.risk === 2
            ? "-solid fa-exclamation-triangle"
            : "-solid fa-fire"
        }"></i>
      </div>
      <div class="complaint-details">
        <div class="complaint-title">${escapeHtml(item.title)}</div>
        <div class="complaint-meta">Status: ${escapeHtml(
          item.status
        )} &bull; Risk ${item.risk}</div>
        ${
          item.photo
            ? `<div style="margin-top:6px;"><img src="${
                item.photo.startsWith("http")
                  ? item.photo
                  : API_BASE + item.photo
              }" style="max-width:140px;max-height:90px;object-fit:cover;border-radius:6px"/></div>`
            : ""
        }
        <div style="margin-top:6px;">
          <button data-id="${item._id}" class="status-btn">${
      item.status === "Completed" ? "Mark Pending" : "Mark Completed"
    }</button>
        </div>
      </div>
    `;

    li.addEventListener("click", function (ev) {
      // avoid clicking the status button from triggering map highlight
      if (ev.target && ev.target.classList.contains("status-btn")) return;
      document
        .querySelectorAll(".complaint-item")
        .forEach((e) => e.classList.remove("active"));
      li.classList.add("active");
      highlightOnMap(idx);
    });

    // status button handler
    li.querySelector(".status-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      const newStatus = item.status === "Completed" ? "Pending" : "Completed";
      try {
        await fetch(`${API_BASE}/api/complaints/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        await loadComplaints(); // refresh
      } catch (err) {
        console.error(err);
        alert("Failed to update status");
      }
    });

    list.appendChild(li);
  });
}

function renderStatusCards() {
  const pending = complaints.filter((c) => c.status === "Pending").length;
  const inprogress = complaints.filter(
    (c) => c.status === "In Progress"
  ).length;
  const completed = complaints.filter((c) => c.status === "Completed").length;

  document.getElementById("pending-count").textContent = pending;
  document.getElementById("inprogress-count").textContent = inprogress;
  document.getElementById("completed-count").textContent = completed;
}

function initMap() {
  // Center map on Pune initially
  map = L.map("india-map").setView([18.5204, 73.8567], 13);

  // Add tile layer
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
}

function clearMarkers() {
  allMarkers.forEach((m) => {
    try {
      map.removeLayer(m);
    } catch (e) {}
  });
  allMarkers = [];
  lastActiveMarker = null;
}

function addMarkers() {
  clearMarkers();
  complaints.forEach((item, idx) => {
    if (typeof item.lat !== "number" || typeof item.lon !== "number") return;
    const icon = new L.Icon({
      iconUrl: riskIcons[(item.risk || 1) - 1] || riskIcons[0],
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    const marker = L.marker([item.lat, item.lon], { icon }).addTo(map);
    const popupHtml = `
      <div style="min-width:150px">
        <b>${escapeHtml(item.title)}</b><br/>
        ${item.description ? escapeHtml(item.description) + "<br/>" : ""}
        Risk: <span style="font-weight:bold;color:${getRiskColor(item.risk)}">${
      item.risk
    }</span>
        ${
          item.photo
            ? `<div style="margin-top:6px;"><img src="${
                item.photo.startsWith("http")
                  ? item.photo
                  : API_BASE + item.photo
              }" style="max-width:180px;max-height:120px;object-fit:cover"/></div>`
            : ""
        }
      </div>
    `;
    marker.bindPopup(popupHtml);
    marker.on("click", () => {
      document
        .querySelectorAll(".complaint-item")
        .forEach((e) => e.classList.remove("active"));
      const li = document.querySelector(`.complaint-item[data-idx="${idx}"]`);
      if (li) li.classList.add("active");
      highlightMarker(marker);
    });
    allMarkers.push(marker);
  });
}

function highlightOnMap(idx) {
  if (!map || !allMarkers[idx]) return;
  const marker = allMarkers[idx];
  highlightMarker(marker);
  marker.openPopup();
  map.setView(marker.getLatLng(), 12, { animate: true });
}

function highlightMarker(marker) {
  if (lastActiveMarker) lastActiveMarker.setZIndexOffset(0);
  marker.setZIndexOffset(1000);
  lastActiveMarker = marker;
}

function getRiskColor(risk) {
  if (risk === 1) return "#27ae60";
  if (risk === 2) return "#f1c40f";
  return "#e74c3c";
}

function getActiveTab() {
  const btn = document.querySelector(".tab-btn.active");
  return btn ? btn.dataset.tab : "group1";
}

// simple escape to avoid injecting HTML
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}
