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

