from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import joblib
import pandas as pd
import os

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

DATA_FILE = 'routes.json'
MODEL_FILE = 'fill_level_predictor.joblib'

routes_data = []
if os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'r') as f:
        routes_data = json.load(f)

model = None
if os.path.exists(MODEL_FILE):
    model = joblib.load(MODEL_FILE)

@app.route('/api/routes', methods=['GET'])
def get_routes():
    """Returns the processed bin/route data.""" 
    return jsonify({
        "status": "success",
        "count": len(routes_data),
        "data": routes_data
    })

@app.route('/api/predict', methods=['POST'])
def predict_fill_level():
    """Predicts fill level based on parameters (day_encoded, cycle_encoded, type_encoded, geo_X, geo_Y)"""
    if not model:
        return jsonify({"error": "ML model not found"}), 500
        
    try:
        req = request.get_json()
        
        
        features = pd.DataFrame([{
            'day_encoded': req.get('day_encoded', 0),
            'cycle_encoded': req.get('cycle_encoded', 0),
            'type_encoded': req.get('type_encoded', 0),
            'geo_point_X': req.get('geo_point_X', -78.8),
            'geo_point_Y': req.get('geo_point_Y', 35.7)
        }])
        
        prediction = model.predict(features)[0]
        
        return jsonify({
            "status": "success",
            "predicted_fill_level": min(max(round(prediction, 1), 0), 100) 
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/login', methods=['POST'])
def login():
    req = request.get_json() or {}
    email = req.get('email')
    password = req.get('password')
    requested_role = req.get('role', 'Resident')
    
    if requested_role == 'Admin':
        if email == 'admin@gmail.com' and password == 'password123':
            return jsonify({"status": "success", "token": "ecocity-token-xyz", "role": "Admin", "name": "Admin"})
        return jsonify({"status": "error", "message": "Invalid admin credentials"}), 401
        
    if requested_role == 'Resident':
        if os.path.exists('users.txt'):
            with open('users.txt', 'r') as f:
                for line in f.readlines():
                    if ',' in line:
                        parts = line.strip().split(',')
                        if len(parts) >= 3:
                            u_name, u_email, u_pass = parts[0], parts[1], parts[2]
                            if email == u_email and password == u_pass:
                                return jsonify({"status": "success", "token": "ecocity-token-db", "role": "Resident", "name": u_name})
        return jsonify({"status": "error", "message": "Invalid resident credentials"}), 401
        
    return jsonify({"status": "error", "message": "Invalid credentials"}), 401

@app.route('/api/register', methods=['POST'])
def register():
    req = request.get_json() or {}
    email = req.get('email')
    password = req.get('password')
    name = req.get('name')
    
    if not email or not password:
        return jsonify({"status": "error", "message": "Missing credentials"}), 400
        
    with open('users.txt', 'a') as f:
        f.write(f"{name},{email},{password}\n")
        
    return jsonify({"status": "success", "message": "Account securely saved in backend!"})

if __name__ == '__main__':
    print("Starting Smart Waste Management API on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
