# server_ml/app.py
import os
import io
import time
import re
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import numpy as np
import tensorflow as tf

# ---------- CONFIG ----------
MODEL_PATH = os.environ.get("MODEL_PATH", "./model/final_resnet50_4class.h5")
UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "./uploads")
CLASS_LABELS_ENV = os.environ.get("CLASS_LABELS")  # optional comma-separated override
# default label order used during training script (adjust if you used different order)
DEFAULT_CLASS_LABELS = ["High", "Low", "Moderate", "invalid"]
RISK_MAP = {"High": 3, "Moderate": 2, "Low": 1, "invalid": 0}
IMG_SIZE = (224, 224)
# ----------------------------

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# load labels
if CLASS_LABELS_ENV:
    CLASS_LABELS = [s.strip() for s in CLASS_LABELS_ENV.split(",")]
else:
    CLASS_LABELS = DEFAULT_CLASS_LABELS.copy()

# Load model
print("Loading model from:", MODEL_PATH)
model = tf.keras.models.load_model(MODEL_PATH, compile=False)
n_out = model.output_shape[-1]
if len(CLASS_LABELS) != n_out:
    # adjust labels size to model output if mismatch
    print(f"WARNING: provided labels ({len(CLASS_LABELS)}) != model outputs ({n_out}). Adjusting.")
    # if we have fewer labels, create generic ones
    if len(CLASS_LABELS) < n_out:
        for i in range(len(CLASS_LABELS), n_out):
            CLASS_LABELS.append(f"class_{i}")
    else:
        CLASS_LABELS = CLASS_LABELS[:n_out]

def preprocess_image_from_path(path):
    img = Image.open(path).convert("RGB")
    img = img.resize(IMG_SIZE, Image.LANCZOS)
    arr = np.array(img).astype("float32") / 255.0
    arr = np.expand_dims(arr, axis=0)
    return arr

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "model": os.path.basename(MODEL_PATH)})

@app.route("/predict", methods=["POST"])
def predict():
    """
    Accepts either:
      - multipart/form-data with file field 'photo'
      - JSON with 'photoBase64' containing "data:image/...;base64,...."
    Returns:
      {
        predicted_class: "high",
        confidence: 0.83,
        probabilities: { "high":0.83, "low":0.03, ... },
        risk_score: 3,
        saved_path: "/uploads/12345.jpg"  // optional
      }
    """
    try:
        saved_path = None
        if "photo" in request.files:
            f = request.files["photo"]
            filename = f"{int(time.time()*1000)}_{secure_filename(f.filename)}"
            save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            f.save(save_path)
            saved_path = "/" + os.path.relpath(save_path).replace("\\", "/")
            img_arr = preprocess_image_from_path(save_path)

        elif request.is_json and "photoBase64" in request.json:
            b64 = request.json["photoBase64"]
            m = re.match(r"^data:image/(.+);base64,(.+)$", b64)
            if not m:
                return jsonify({"error": "photoBase64 not in expected format"}), 400
            ext = m.group(1)
            data = m.group(2)
            filename = f"{int(time.time()*1000)}.{ext}"
            save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            with open(save_path, "wb") as out:
                out.write(base64.b64decode(data))
            saved_path = "/" + os.path.relpath(save_path).replace("\\", "/")
            img_arr = preprocess_image_from_path(save_path)

        else:
            return jsonify({"error": "No image provided. Send multipart/form-data 'photo' or JSON 'photoBase64'."}), 400

        preds = model.predict(img_arr)  # shape (1, n_out)
        probs = preds[0].astype(float).tolist()
        best_idx = int(np.argmax(probs))
        best_label = CLASS_LABELS[best_idx]
        confidence = float(probs[best_idx])

        probabilities = {CLASS_LABELS[i]: float(probs[i]) for i in range(len(probs))}
        risk_score = RISK_MAP.get(best_label, 1)

        return jsonify({
            "predicted_class": best_label,
            "confidence": confidence,
            "probabilities": probabilities,
            "risk_score": risk_score,
            "saved_path": saved_path
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# if __name__ == "__main__":
#     # debug True is fine for local dev; in production use gunicorn
#     app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)), debug=True)


if __name__ == "__main__":
    # Render provides the PORT environment variable
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
