const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

async function testNode() {
  const form = new FormData();
  form.append("title", "Test Complaint");
  form.append("description", "Testing pipeline");
  form.append("photo", fs.createReadStream("../server/server_ml/garbage.jpg")); // <-- use same test image

  try {
    const res = await axios.post("http://localhost:5000/api/complaints", form, {
      headers: form.getHeaders(),
    });
    console.log("Node Response:", res.data);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testNode();
