// server/models/Complaint.js
const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
  group: { type: String, default: "group1" },
  status: { type: String, default: "Pending" },
  title: { type: String, required: true },
  description: { type: String },
  lat: { type: Number },
  lon: { type: Number },
  risk: { type: Number, default: 1 },
  photo: { type: String }, // path like /uploads/filename.png
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Complaint", complaintSchema);
