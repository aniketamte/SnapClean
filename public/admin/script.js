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

document.addEventListener("DOMContentLoaded", () => {
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
    complaints = list.map((c) => ({
      _id: c._id,
      status: c.status || "Pending",
      title: c.title || "",
      description: c.description || "",
      lat: c.lat,
      lon: c.lon,
      risk: c.risk || 1,
      photoBase64: c.photoBase64 || c.photo || null,
      createdAt: c.createdAt,
    }));
    renderStatusCards();
    renderTab(getActiveTab());
    clearMarkers();
    addMarkers();
  } catch (err) {
    console.error("Failed to load complaints:", err);
    alert("Could not fetch complaints from server.");
  }
}

function renderTab(tab) {
  const list = document.getElementById("complaint-list");
  list.innerHTML = "";

  // map tab names to statuses
  let status = "Pending";
  if (tab === "group2") status = "In Progress";
  if (tab === "group3") status = "Completed";

  let filtered = complaints.filter((c) => c.status === status);

  if (filtered.length === 0) {
    list.innerHTML = `<li style="padding:12px;color:#666">No complaints with status ${status}.</li>`;
    return;
  }

  filtered.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = "complaint-item";
    li.dataset.idx = idx;

    li.innerHTML = `
      <div class="complaint-details">
        <div class="complaint-title">${escapeHtml(item.title)}</div>
        <div class="complaint-meta">Status: ${escapeHtml(
          item.status
        )} &bull; Predicted Risk ${item.risk}</div>
        ${
          item.photoBase64
            ? `<div style="margin-top:6px;">
                 <img src="${item.photoBase64}" style="max-width:140px;max-height:90px;object-fit:cover;border-radius:6px"/>
               </div>`
            : ""
        }
        <div style="margin-top:6px;" class="action-buttons"></div>
      </div>
    `;

    const btnContainer = li.querySelector(".action-buttons");
    if (item.status === "Pending") {
      btnContainer.innerHTML = `
        <button data-id="${item._id}" data-status="In Progress" class="status-btn">Mark In Progress</button>
        <button data-id="${item._id}" data-status="Completed" class="status-btn">Mark Completed</button>
      `;
    } else if (item.status === "In Progress") {
      btnContainer.innerHTML = `
        <button data-id="${item._id}" data-status="Completed" class="status-btn">Mark Completed</button>
      `;
    } else if (item.status === "Completed") {
      btnContainer.innerHTML = `<span style="color:green;font-weight:bold;">✔ Completed</span>`;
    }

    li.addEventListener("click", (ev) => {
      if (ev.target && ev.target.classList.contains("status-btn")) return;
      document
        .querySelectorAll(".complaint-item")
        .forEach((e) => e.classList.remove("active"));
      li.classList.add("active");
      highlightOnMap(idx);
    });

    li.querySelectorAll(".status-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        const newStatus = e.currentTarget.dataset.status;
        try {
          await fetch(`${API_BASE}/api/complaints/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });
          await loadComplaints();
        } catch (err) {
          console.error(err);
          alert("Failed to update status");
        }
      });
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

/* ---------- Map code ---------- */
function initMap() {
  map = L.map("india-map").setView([18.5204, 73.8567], 13);
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

    let popupHtml = `
      <div style="max-width:200px;">
        <b>${escapeHtml(item.title)}</b><br/>
        Status: ${escapeHtml(item.status)}<br/>
        Risk: ${item.risk}<br/>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
    `;
    if (item.photoBase64) {
      popupHtml += `
        <div style="margin-top:6px;">
          <img src="${item.photoBase64}" 
          style="max-width:160px;max-height:120px;object-fit:cover;border-radius:6px;cursor:pointer"
          onclick="window.open('${item.photoBase64}','_blank')"/>
        </div>`;
    }
    popupHtml += "</div>";

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
  const m = allMarkers[idx];
  highlightMarker(m);
  m.openPopup();
  map.setView(m.getLatLng(), 12, { animate: true });
}
function highlightMarker(marker) {
  if (lastActiveMarker) lastActiveMarker.setZIndexOffset(0);
  marker.setZIndexOffset(1000);
  lastActiveMarker = marker;
}
function getActiveTab() {
  const btn = document.querySelector(".tab-btn.active");
  return btn ? btn.dataset.tab : "group1";
}
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

// const API_BASE = "http://localhost:5000"; // change if deployed

// let complaints = [];
// let map = null,
//   allMarkers = [],
//   lastActiveMarker = null;

// const riskIcons = [
//   "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png", // 1
//   "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png", // 2
//   "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png", // 3
// ];

// document.addEventListener("DOMContentLoaded", function () {
//   setupTabs();
//   initMap();
//   loadComplaints();
// });

// function setupTabs() {
//   const tabButtons = document.querySelectorAll(".tab-btn");
//   tabButtons.forEach((btn) => {
//     btn.addEventListener("click", function () {
//       tabButtons.forEach((x) => x.classList.remove("active"));
//       this.classList.add("active");
//       renderTab(this.dataset.tab);
//     });
//   });
// }

// async function loadComplaints() {
//   try {
//     const res = await fetch(`${API_BASE}/api/complaints`);
//     const list = await res.json();
//     // normalize
//     complaints = list.map((c) => ({
//       _id: c._id,
//       group: c.group || "group1",
//       status: c.status || "Pending",
//       title: c.title || "",
//       description: c.description || "",
//       lat: c.lat,
//       lon: c.lon,
//       risk: c.risk || 1,
//       photo: c.photo || null,
//       createdAt: c.createdAt,
//     }));
//     renderStatusCards();
//     renderTab(getActiveTab());
//     clearMarkers();
//     addMarkers();
//   } catch (err) {
//     console.error("Failed to load complaints:", err);
//     alert("Could not fetch complaints from server. Is backend running?");
//   }
// }

// function renderTab(tabGroup) {
//   const list = document.getElementById("complaint-list");
//   list.innerHTML = "";

//   let filtered = complaints.filter((c) => c.group === tabGroup);
//   if (filtered.length === 0) {
//     list.innerHTML = `<li style="padding:12px;color:#666">No complaints in this list.</li>`;
//     return;
//   }

//   filtered.forEach((item) => {
//     const idx = complaints.indexOf(item);
//     const li = document.createElement("li");
//     li.className = "complaint-item";
//     li.dataset.idx = idx;

//     li.innerHTML = `
//       <div class="risk-icon risk-${item.risk}">
//         <i class="fa${
//           item.risk === 1
//             ? "-solid fa-circle"
//             : item.risk === 2
//             ? "-solid fa-exclamation-triangle"
//             : "-solid fa-fire"
//         }"></i>
//       </div>
//       <div class="complaint-details">
//         <div class="complaint-title">${escapeHtml(item.title)}</div>
//         <div class="complaint-meta">Status: ${escapeHtml(
//           item.status
//         )} &bull; Risk ${item.risk}</div>
//         ${
//           item.photo
//             ? `<div style="margin-top:6px;"><img src="${
//                 item.photo.startsWith("http")
//                   ? item.photo
//                   : API_BASE + item.photo
//               }" style="max-width:140px;max-height:90px;object-fit:cover;border-radius:6px"/></div>`
//             : ""
//         }
//         <div style="margin-top:6px;">
//           <button data-id="${item._id}" class="status-btn">${
//       item.status === "Completed" ? "Mark Pending" : "Mark Completed"
//     }</button>
//         </div>
//       </div>
//     `;

//     li.addEventListener("click", function (ev) {
//       // avoid clicking the status button from triggering map highlight
//       if (ev.target && ev.target.classList.contains("status-btn")) return;
//       document
//         .querySelectorAll(".complaint-item")
//         .forEach((e) => e.classList.remove("active"));
//       li.classList.add("active");
//       highlightOnMap(idx);
//     });

//     // status button handler
//     li.querySelector(".status-btn").addEventListener("click", async (e) => {
//       e.stopPropagation();
//       const id = e.currentTarget.dataset.id;
//       const newStatus = item.status === "Completed" ? "Pending" : "Completed";
//       try {
//         await fetch(`${API_BASE}/api/complaints/${id}/status`, {
//           method: "PATCH",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ status: newStatus }),
//         });
//         await loadComplaints(); // refresh
//       } catch (err) {
//         console.error(err);
//         alert("Failed to update status");
//       }
//     });

//     list.appendChild(li);
//   });
// }

// function renderStatusCards() {
//   const pending = complaints.filter((c) => c.status === "Pending").length;
//   const inprogress = complaints.filter(
//     (c) => c.status === "In Progress"
//   ).length;
//   const completed = complaints.filter((c) => c.status === "Completed").length;

//   document.getElementById("pending-count").textContent = pending;
//   document.getElementById("inprogress-count").textContent = inprogress;
//   document.getElementById("completed-count").textContent = completed;
// }

// function initMap() {
//   // Center map on Pune initially
//   map = L.map("india-map").setView([18.5204, 73.8567], 13);

//   // Add tile layer
//   L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
//     attribution:
//       'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a>',
//     maxZoom: 19,
//   }).addTo(map);
// }

// function clearMarkers() {
//   allMarkers.forEach((m) => {
//     try {
//       map.removeLayer(m);
//     } catch (e) {}
//   });
//   allMarkers = [];
//   lastActiveMarker = null;
// }

// function addMarkers() {
//   clearMarkers();
//   complaints.forEach((item, idx) => {
//     if (typeof item.lat !== "number" || typeof item.lon !== "number") return;
//     const icon = new L.Icon({
//       iconUrl: riskIcons[(item.risk || 1) - 1] || riskIcons[0],
//       shadowUrl:
//         "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
//       iconSize: [25, 41],
//       iconAnchor: [12, 41],
//       popupAnchor: [1, -34],
//       shadowSize: [41, 41],
//     });
//     const marker = L.marker([item.lat, item.lon], { icon }).addTo(map);
//     const popupHtml = `
//       <div style="min-width:150px">
//         <b>${escapeHtml(item.title)}</b><br/>
//         ${item.description ? escapeHtml(item.description) + "<br/>" : ""}
//         Risk: <span style="font-weight:bold;color:${getRiskColor(item.risk)}">${
//       item.risk
//     }</span>
//         ${
//           item.photo
//             ? `<div style="margin-top:6px;"><img src="${
//                 item.photo.startsWith("http")
//                   ? item.photo
//                   : API_BASE + item.photo
//               }" style="max-width:180px;max-height:120px;object-fit:cover"/></div>`
//             : ""
//         }
//       </div>
//     `;
//     marker.bindPopup(popupHtml);
//     marker.on("click", () => {
//       document
//         .querySelectorAll(".complaint-item")
//         .forEach((e) => e.classList.remove("active"));
//       const li = document.querySelector(`.complaint-item[data-idx="${idx}"]`);
//       if (li) li.classList.add("active");
//       highlightMarker(marker);
//     });
//     allMarkers.push(marker);
//   });
// }

// function highlightOnMap(idx) {
//   if (!map || !allMarkers[idx]) return;
//   const marker = allMarkers[idx];
//   highlightMarker(marker);
//   marker.openPopup();
//   map.setView(marker.getLatLng(), 12, { animate: true });
// }

// function highlightMarker(marker) {
//   if (lastActiveMarker) lastActiveMarker.setZIndexOffset(0);
//   marker.setZIndexOffset(1000);
//   lastActiveMarker = marker;
// }

// function getRiskColor(risk) {
//   if (risk === 1) return "#27ae60";
//   if (risk === 2) return "#f1c40f";
//   return "#e74c3c";
// }

// function getActiveTab() {
//   const btn = document.querySelector(".tab-btn.active");
//   return btn ? btn.dataset.tab : "group1";
// }

// // simple escape to avoid injecting HTML
// function escapeHtml(s) {
//   if (!s) return "";
//   return String(s).replace(
//     /[&<>"]/g,
//     (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
//   );
// }
