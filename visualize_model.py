
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib
from sklearn.metrics import r2_score
import os

def generate_accuracy_plot():
    print("Loading model and data...")
    if not os.path.exists('fill_level_predictor.joblib') or not os.path.exists('routes.json'):
        print("Error: Model or data not found. Please run process_data.py first.")
        return

    model = joblib.load('fill_level_predictor.joblib')
    
    with open('routes.json', 'r') as f:
        import json
        data = json.load(f)
    
    df = pd.DataFrame(data)
    
    # We need the encoded features. Since routes.json doesn't have them, 
    # we'll re-encode or just use a sample if we had the original encoders.
    # For this visualization, we'll demonstrate the concept by plotting 
    # the predictions made by the model against the synthetic ground truth.
    
    print("Generating predictions...")
    # Mocking the feature set based on the training logic in process_data.py
    # LinearRegression X features were: day_encoded, cycle_encoded, type_encoded, geo_X, geo_Y
    
    from sklearn.preprocessing import LabelEncoder
    le_day = LabelEncoder()
    le_cycle = LabelEncoder()
    le_type = LabelEncoder()
    
    X = pd.DataFrame({
        'day_encoded': le_day.fit_transform(df['day'].astype(str)),
        'cycle_encoded': le_cycle.fit_transform(df['cycle'].astype(str)),
        'type_encoded': le_type.fit_transform(df['type'].astype(str)),
        'geo_point_X': df['geo_point_X'],
        'geo_point_Y': df['geo_point_Y']
    })
    
    y_actual = df['fillLevel']
    y_pred = model.predict(X)
    
    score = r2_score(y_actual, y_pred)
    
    print(f"R^2 Score: {score:.3f}")
    
    # Create the plot
    plt.figure(figsize=(10, 6))
    plt.scatter(y_actual, y_pred, alpha=0.5, color='#f59e0b', label='Predicted vs Actual')
    plt.plot([0, 100], [0, 100], color='#ef4444', linestyle='--', label='Perfect Prediction Line')
    
    plt.title(f'Model Accuracy: Predicted vs Actual Fill Level (R² = {score:.3f})', fontsize=14, fontweight='bold')
    plt.xlabel('Actual Fill Level (%)', fontsize=12)
    plt.ylabel('Predicted Fill Level (%)', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.legend()
    
    # Save the plot
    output_path = 'accuracy_graph.png'
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"Plot saved to {output_path}")

if __name__ == "__main__":
    generate_accuracy_plot()
