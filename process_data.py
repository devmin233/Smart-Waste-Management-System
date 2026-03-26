import pandas as pd
import numpy as np
import json
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
import joblib
import os

def main():
    print("Loading dataset...")
    df = pd.read_csv("solid-waste-and-recycling-collection-routes1.csv")
    
    print("Cleaning dataset...")
    df.dropna(subset=['geo_point_X', 'geo_point_Y', 'day', 'cycle'], inplace=True)
 
    day_normalise = {
        'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
        'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
    }
    df['day'] = df['day'].str.strip().replace(day_normalise)
    
    print("Sampling 150 routes...")
    df_sample = df.sample(n=min(150, len(df)), random_state=42).copy()

    print("Engineering synthetic fillLevel feature...")
    np.random.seed(42)
    base_fill = (df_sample['objectid'] % 10) * 8
    day_map = {'Monday': 10, 'Tuesday': 20, 'Wednesday': 30, 'Thursday': 40, 'Friday': 50}
    day_mod = df_sample['day'].map(day_map).fillna(25)
    noise = np.random.randint(0, 30, size=len(df_sample))
    df_sample['fillLevel'] = (base_fill + day_mod + noise).clip(0, 100)

    status_options = ['Completed', 'Pending', 'Missed', 'In Route']
    df_sample['status'] = np.random.choice(status_options, size=len(df_sample), p=[0.2, 0.6, 0.05, 0.15])

    types = ['Solid', 'Recycle', 'Yard Waste']
    df_sample['type'] = np.random.choice(types, size=len(df_sample))
 
    hours = np.random.randint(6, 15, size=len(df_sample))
    mins = np.random.choice(['00', '15', '30', '45'], size=len(df_sample))
    df_sample['time'] = [f"{h:02d}:{m} {'AM' if h < 12 else 'PM'}" for h, m in zip(hours, mins)]
    
    sl_cities = ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo', 'Anuradhapura', 'Trincomalee', 'Kurunegala', 'Ratnapura', 'Matara', 'Gampaha', 'Kalutara', 'Badulla', 'Matale']
    df_sample['city'] = np.random.choice(sl_cities, size=len(df_sample))
    
    print("Training ML Model (Linear Regression)...")
    le_day = LabelEncoder()
    le_cycle = LabelEncoder()
    le_type = LabelEncoder()
    
    X = pd.DataFrame({
        'day_encoded': le_day.fit_transform(df_sample['day'].astype(str)),
        'cycle_encoded': le_cycle.fit_transform(df_sample['cycle'].astype(str)),
        'type_encoded': le_type.fit_transform(df_sample['type'].astype(str)),
        'geo_point_X': df_sample['geo_point_X'],
        'geo_point_Y': df_sample['geo_point_Y']
    }).fillna(0)
    y = df_sample['fillLevel']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    score = r2_score(y_test, model.predict(X_test))
    print(f"Linear Regression R^2 score (test set): {score:.3f}")
 
    print("Saving model to fill_level_predictor.joblib...")
    joblib.dump(model, 'fill_level_predictor.joblib')
    
    print("Exporting routes.json for frontend...")
    export_cols = ['objectid', 'type', 'day', 'cycle', 'status', 'fillLevel', 'time', 'city', 'geo_point_X', 'geo_point_Y']
    
    df_export = df_sample[export_cols].rename(columns={'objectid': 'id'})
    df_export['id'] = 'BIN-' + df_export['id'].astype(str)
    
    records = df_export.to_dict(orient='records')
    
    with open('routes.json', 'w') as f:
        json.dump(records, f, indent=4)
        
    print(f"Successfully exported {len(records)} records to routes.json")

if __name__ == "__main__":
    main()
