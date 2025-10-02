// client/script.js
const API_URL = "http://localhost:5000"; // Local backend

let video = document.getElementById("video");
let canvas = document.getElementById("canvas");
let stream = null;

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
    console.error(err);
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
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  video.srcObject = null;
  video.style.display = "none";
  stream = null;
});

document.getElementById("locate").addEventListener("click", () => {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        document.getElementById(
          "location"
        ).value = `Lat: ${position.coords.latitude.toFixed(
          5
        )}, Long: ${position.coords.longitude.toFixed(5)}`;
      },
      (err) => {
        alert("Location access denied or error occurred.");
        console.error(err);
      }
    );
  } else {
    alert("Geolocation not supported.");
  }
});

function parseLatLon(str) {
  if (!str) return null;
  const nums = str.match(/-?\d+(.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  return { lat: parseFloat(nums[0]), lon: parseFloat(nums[1]) };
}

document.getElementById("submit-btn").addEventListener("click", async () => {
  const locationStr = document.getElementById("location").value.trim();
  const address = document.getElementById("address").value.trim();
  const category = document.getElementById("category").value;
  const showCanvas = canvas.style.display !== "none";

  if (!category || !showCanvas) {
    alert("Please capture an image and select category.");
    return;
  }

  const riskMap = { Garbage: 1, "Water Leakage": 2, "Illegal Dumping": 3 };
  const risk = riskMap[category] || 1;

  let coords = parseLatLon(locationStr);
  if (!coords && navigator.geolocation) {
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      );
      coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch (e) {
      console.warn("Geolocation failed or denied", e);
    }
  }

  const payload = {
    title: category,
    description: address,
    lat: coords ? coords.lat : undefined,
    lon: coords ? coords.lon : undefined,
    risk: risk,
    photoBase64: canvas.toDataURL("image/png"),
  };

  try {
    const resp = await fetch(`${API_URL}/api/complaints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (json && json.success) {
      alert("Complaint submitted successfully!");
      document.getElementById("location").value = "";
      document.getElementById("address").value = "";
      document.getElementById("category").selectedIndex = 0;
      canvas.style.display = "none";
    } else {
      alert("Server error: " + (json.message || "unknown"));
      console.error(json);
    }
  } catch (err) {
    console.error(err);
    alert("Network or server error. Is the backend running?");
  }
});
