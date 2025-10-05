const API_URL = "http://localhost:5000"; // backend

let video = document.getElementById("video");
let canvas = document.getElementById("canvas");
let stream = null;
let uploadedFileBase64 = null; // for uploaded image

/* -------- Camera Handling -------- */
document.getElementById("start-camera").addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
    });
    video.srcObject = stream;
    video.style.display = "block";
    canvas.style.display = "none";
  } catch (err) {
    alert("Camera access denied or not available.");
  }
});

document.getElementById("snap-photo").addEventListener("click", () => {
  if (!stream) {
    alert("Please start the camera first.");
    return;
  }
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.style.display = "block";

  // stop camera stream
  stream.getTracks().forEach((track) => track.stop());
  video.srcObject = null;
  video.style.display = "none";
  stream = null;
});

/* -------- File Upload Handling -------- */
document.getElementById("file-upload").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = () => {
    uploadedFileBase64 = reader.result;
    canvas.style.display = "none";
    video.style.display = "none";
  };
  reader.readAsDataURL(file);
});

/* -------- Location -------- */
document.getElementById("locate").addEventListener("click", () => {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.getElementById(
          "location"
        ).value = `Lat: ${pos.coords.latitude.toFixed(
          5
        )}, Long: ${pos.coords.longitude.toFixed(5)}`;
      },
      () => alert("Unable to fetch location")
    );
  }
});

function parseLatLon(str) {
  if (!str) return null;
  const nums = str.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  return { lat: parseFloat(nums[0]), lon: parseFloat(nums[1]) };
}

/* -------- Submit Complaint -------- */
document.getElementById("submit-btn").addEventListener("click", async () => {
  const locationStr = document.getElementById("location").value.trim();
  const address = document.getElementById("address").value.trim();
  const category = document.getElementById("category").value;

  let coords = parseLatLon(locationStr);

  let photoBase64 = null;
  if (canvas.style.display !== "none") {
    photoBase64 = canvas.toDataURL("image/png");
  } else if (uploadedFileBase64) {
    photoBase64 = uploadedFileBase64;
  }

  if (!category || !photoBase64) {
    return alert("Please capture or upload an image and select category.");
  }

  const payload = {
    title: category,
    description: address,
    lat: coords?.lat,
    lon: coords?.lon,
    photoBase64,
    status: "Pending",
  };

  try {
    const resp = await fetch(`${API_URL}/api/complaints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (json.success) {
      alert("Complaint submitted!");
      uploadedFileBase64 = null;
      document.getElementById("file-upload").value = "";
      loadCompletedComplaints();
    } else {
      alert("Error: " + json.message);
    }
  } catch (err) {
    alert("Network error");
  }
});

/* -------- Load Completed Complaints -------- */
async function loadCompletedComplaints() {
  const resp = await fetch(`${API_URL}/api/complaints`);
  const data = await resp.json();
  const list = document.getElementById("completed-list");
  list.innerHTML = "";

  data
    .filter((c) => c.status === "Completed")
    .forEach((c) => {
      const li = document.createElement("li");
      li.className = "completed-item";

      li.innerHTML = `
        <div class="complaint-card">
          <h3>${c.title}</h3>
          
          <p><strong>Predicted Risk Level:</strong> ${c.risk || "N/A"}</p>
          <p><strong>Status:</strong> ${c.status}</p>
          
          ${
            c.photo
              ? `<img src="${
                  c.photo.startsWith("http") ? c.photo : API_URL + c.photo
                }" style="max-width:200px;max-height:150px;border-radius:8px;margin-top:6px"/>`
              : ""
          }
        </div>
      `;

      list.appendChild(li);
    });

  if (list.innerHTML.trim() === "") {
    list.innerHTML = `<li>No completed complaints yet.</li>`;
  }
}

window.onload = loadCompletedComplaints;

// // client/script.js
// const API_URL = "http://localhost:5000"; // Local backend
