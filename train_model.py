import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
import joblib

def main():
    print("Loading dataset...")
    df = pd.read_csv("dataset.csv")
    
    # Define features and targets
    X = df[['Amount']]
    Y = df[['n1000', 'n500', 'n100', 'n50', 'n20', 'n10']]
    
    # Split the dataset (80% train, 20% test)
    print("Splitting dataset into train and test sets...")
    X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.2, random_state=42)
    
    # Initialize the base regressor
    # Using small estimators for quick training and smaller file size, as the relation is simple
    base_estimator = RandomForestRegressor(n_estimators=10, random_state=42, n_jobs=-1)
    
    # Wrap in MultiOutputRegressor
    model = MultiOutputRegressor(base_estimator)
    
    print("Training MultiOutput Random Forest Model (this might take a moment)...")
    model.fit(X_train, Y_train)
    
    # Evaluate model
    score = model.score(X_test, Y_test)
    print(f"Model R^2 Score on Test Set: {score:.4f}")
    
    # Save the model
    model_filename = "currency_model.pkl"
    print(f"Saving model to {model_filename}...")
    joblib.dump(model, model_filename)
    print("Model training and saving completed successfully!")

if __name__ == "__main__":
    main()
