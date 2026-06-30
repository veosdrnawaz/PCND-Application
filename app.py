from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, validator
import joblib
import numpy as np
import os

# Initialize FastAPI app
app = FastAPI(title="Pak Currency Note Distribution API")

# Mount static files (CSS, JS, Logo)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize Jinja2 templates directory
templates = Jinja2Templates(directory="templates")

# Load the trained model
MODEL_PATH = "currency_model.pkl"
model = None

if os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print(f"Warning: {MODEL_PATH} not found. Running in rule-only mode.")

# Mathematical helper for exact note calculations
def calculate_notes(amount):
    n10, n20, n50, n100, n500, n1000 = 0, 0, 0, 0, 0, 0
    
    if amount < 10:
        return (0, 0, 0, 0, 0, 0)
        
    # Special cases for very small amounts:
    if amount == 20:
        return (0, 0, 0, 0, 0, 2)  # 2x Rs.10
    if amount == 40:
        return (0, 0, 0, 0, 1, 2)  # 2x Rs.10, 1x Rs.20
        
    # Rule 1: Include at least one Rs.10 note.
    n10 = 1
    rem = amount - 10
    
    # Rule 2: Then include Rs.20 notes.
    # We want rem - 20 * n20 to be a multiple of 50.
    rem_mod_50 = rem % 50
    if rem_mod_50 == 0:
        n20 = 0
    elif rem_mod_50 == 10:
        n20 = 3
    elif rem_mod_50 == 20:
        n20 = 1
    elif rem_mod_50 == 30:
        n20 = 4
    elif rem_mod_50 == 40:
        n20 = 2
        
    rem -= 20 * n20
    
    # Rule 3: Include one Rs.50 note if possible.
    if rem % 100 == 50:
        n50 = 1
        rem -= 50
    else:
        n50 = 0
        
    # Rule 4: Then include Rs.100 notes.
    n100 = (rem % 500) // 100
    rem -= 100 * n100
    
    # Rule 5: Use Rs.500 notes.
    if rem % 1000 == 500:
        n500 = 1
        rem -= 500
    else:
        n500 = 0
        
    # Rule 6: Fill the remaining with Rs.1000 notes.
    n1000 = rem // 1000
    
    return (n1000, n500, n100, n50, n20, n10)

# Input Pydantic Model for Validation
class PredictRequest(BaseModel):
    amount: float  # Accept float to detect decimals and return readable errors

    @validator('amount')
    def validate_amount(cls, v):
        # 1. Check for negative or zero
        if v <= 0:
            raise ValueError("Amount must be greater than zero.")
        
        # 2. Check for decimal / float part
        if not v.is_integer():
            raise ValueError("Amount cannot have decimal values. It must be a whole number.")
        
        int_val = int(v)
        
        # 3. Check for divisibility by 10
        if int_val % 10 != 0:
            raise ValueError("Amount must be divisible by 10.")
            
        return int_val

# API Routes
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/predict")
async def predict_notes(payload: PredictRequest):
    amount = int(payload.amount)
    
    # Check if amount is within dataset range (or higher)
    if amount > 500000:
        # The project requirements state amounts from 10 to 500,000.
        # However, our math algorithm generalizes up to infinity!
        # We can predict using math directly or cap the model.
        # Let's allow predictions for any amount but mark it.
        pass

    # Default values from ML model prediction
    adjusted = False
    p1000, p500, p100, p50, p20, p10 = 0, 0, 0, 0, 0, 0
    
    if model is not None:
        try:
            # Predict
            pred = model.predict(np.array([[amount]]))[0]
            # Round to non-negative integers
            p1000 = max(0, int(round(pred[0])))
            p500 = max(0, int(round(pred[1])))
            p100 = max(0, int(round(pred[2])))
            p50 = max(0, int(round(pred[3])))
            p20 = max(0, int(round(pred[4])))
            p10 = max(0, int(round(pred[5])))
        except Exception as e:
            # Fall back to math if prediction fails
            p1000, p500, p100, p50, p20, p10 = calculate_notes(amount)
            adjusted = True
    else:
        # Fall back if model is not loaded
        p1000, p500, p100, p50, p20, p10 = calculate_notes(amount)
        adjusted = True

    # Verify that the calculated total exactly equals the entered amount
    total = 1000 * p1000 + 500 * p500 + 100 * p100 + 50 * p50 + 20 * p20 + 10 * p10
    
    if total != amount:
        # Adjust prediction so final result always matches entered amount
        p1000, p500, p100, p50, p20, p10 = calculate_notes(amount)
        total = amount
        adjusted = True

    return {
        "amount": amount,
        "1000": p1000,
        "500": p500,
        "100": p100,
        "50": p50,
        "20": p20,
        "10": p10,
        "total": total,
        "adjusted": adjusted
    }

if __name__ == "__main__":
    import uvicorn
    # Run server locally on port 8000
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
