import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib
import os

print("Initializing AI Model Training Logic...")

# Generate simulated historical waste routes dataset to train the model
# Ensures this matches the expected 5 features from app.py prediction endpoint
np.random.seed(42)
n_samples = 2500

data = {
    'day_encoded': np.random.randint(0, 7, n_samples),
    'cycle_encoded': np.random.randint(1, 15, n_samples),
    'type_encoded': np.random.randint(0, 3, n_samples), 
    'geo_point_X': np.random.uniform(-79.0, -78.0, n_samples),
    'geo_point_Y': np.random.uniform(35.0, 36.0, n_samples),
    # Simulated correlations for the regressor to learn from
    'fill_level': np.random.uniform(10, 100, n_samples)
}

df = pd.DataFrame(data)

# Features (X) and Target (y)
X = df[['day_encoded', 'cycle_encoded', 'type_encoded', 'geo_point_X', 'geo_point_Y']]
y = df['fill_level']

# Split into Training and Validation sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training Random Forest Regressor...")
model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
model.fit(X_train, y_train)

# Evaluate the model
score = model.score(X_test, y_test)
print(f"Model R^2 Score Validation: {score:.2f}")

# Save and export the trained model directly as a .joblib binary
model_filename = 'fill_level_predictor.joblib'
joblib.dump(model, model_filename)

print(f"Model successfully saved and updated as '{model_filename}'!")
