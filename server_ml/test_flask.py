import requests

# Test health
print("Health:", requests.get("http://localhost:5001/health").json())

# Test prediction
with open("garbage.jpg", "rb") as f:   # <-- put any test image in server_ml folder
    files = {"photo": f}
    res = requests.post("http://localhost:5001/predict", files=files)
    print("Prediction:", res.json())