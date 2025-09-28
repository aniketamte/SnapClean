// server/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Complaint = require("./models/complaint");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ensure uploads dir exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));
app.use("/", express.static(path.join(__dirname, "public")));

// multer for multipart file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB error:", err.message);
    process.exit(1);
  });

// POST complaint - accepts JSON with photoBase64 OR multipart/form-data with file field 'photo'
app.post("/api/complaints", upload.single("photo"), async (req, res) => {
  try {
    const { title, description, lat, lon, risk, group } = req.body;
    let photoPath = null;

    if (req.file) {
      photoPath = `/uploads/${req.file.filename}`;
    } else if (req.body.photoBase64) {
      const matches = req.body.photoBase64.match(
        /^data:(image\/\w+);base64,(.+)$/
      );
      if (matches) {
        const ext = matches[1].split("/")[1] || "png";
        const data = matches[2];
        const filename = `${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}.${ext}`;
        fs.writeFileSync(
          path.join(uploadsDir, filename),
          Buffer.from(data, "base64")
        );
        photoPath = `/uploads/${filename}`;
      }
    }

    const c = new Complaint({
      group: group || "group1",
      title: title || "No title",
      description,
      lat: lat ? parseFloat(lat) : undefined,
      lon: lon ? parseFloat(lon) : undefined,
      risk: risk ? parseInt(risk) : 1,
      photo: photoPath,
    });

    await c.save();
    res.status(201).json({ success: true, complaint: c });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET all complaints
app.get("/api/complaints", async (req, res) => {
  try {
    const list = await Complaint.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH update status
app.patch("/api/complaints/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const c = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!c) return res.status(404).json({ message: "Not found" });
    res.json(c);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
