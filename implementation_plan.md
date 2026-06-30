# Implementation Plan - Pakistani Currency Note Distribution Web App

This document outlines the design and implementation details for the **Pakistani Currency Note Distribution** application. The app predicts the required number of currency notes for a given amount using a Scikit-learn model, served via a FastAPI backend, and visualized through a premium Material Design 3 frontend.

---

## User Review Required

> [!IMPORTANT]
> The dataset will span amounts from 10 to 500,000 in steps of 10. We will use a deterministic mathematical algorithm to construct the unique note distribution for each amount, ensuring the rules are strictly followed.

---

## Proposed Changes

### Component 1: Python ML & Backend Core

#### [NEW] [generate_dataset.py](file:///c:/Users/Khalil%20Ahmad/OneDrive/Desktop/cruncy%20note%20finder/web%20app/generate_dataset.py)
Generates the dataset `dataset.csv` containing amounts from 10 to 500,000 (step 10) mapped to unique note counts according to the rules:
1. Try to include at least one Rs.10 note.
2. Then include Rs.20 notes.
3. Then include one Rs.50 note.
4. Then include Rs.100 notes.
5. Use Rs.500 notes.
6. Fill the remaining amount with Rs.1000 notes.

The generation code will use a mathematical algorithm that handles all values:
- For amount = 20: 2x Rs.10
- For amount = 40: 2x Rs.10, 1x Rs.20
- For other amounts: 1x Rs.10, with Rs.20/Rs.50/Rs.100/Rs.500/Rs.1000 chosen to resolve modulo conditions and ensure exact sums.

#### [NEW] [train_model.py](file:///c:/Users/Khalil%20Ahmad/OneDrive/Desktop/cruncy%20note%20finder/web%20app/train_model.py)
Loads `dataset.csv`, splits into train and test sets, fits a `MultiOutputRegressor(RandomForestRegressor(n_estimators=10, random_state=42))` on the training data (`X = Amount`, `Y = [n1000, n500, n100, n50, n20, n10]`), and saves the model as `currency_model.pkl`.

#### [NEW] [app.py](file:///c:/Users/Khalil%20Ahmad/OneDrive/Desktop/cruncy%20note%20finder/web%20app/app.py)
FastAPI application that serves the frontend at `GET /` and exposes a prediction API at `POST /predict`.
- API takes `{ "amount": int }`.
- Predicts note distribution using the loaded `currency_model.pkl`.
- Rounds the predictions to integers.
- If the rounded prediction total does not equal the input amount exactly, it adjusts the predictions using the exact mathematical algorithm to ensure accuracy.
- Returns `{ "amount": amount, "1000": n1000, "500": n500, "100": n100, "50": n50, "20": n20, "10": n10, "total": total, "adjusted": bool }`.

---

### Component 2: Frontend Client

#### [NEW] [index.html](file:///c:/Users/Khalil%20Ahmad/OneDrive/Desktop/cruncy%20note%20finder/web%20app/templates/index.html)
An HTML document implementing a responsive Android-style dashboard using **Material Design 3 (MD3)** principles.
- **Top App Bar** with Title, Subtitle, and Quick Links.
- **Main Layout** with multi-page single-page application (SPA) navigation via a bottom navigation bar:
  - 🏠 **Home**: Input panel (numeric keyboard, calculate, reset buttons) and live-predicting loading state.
  - 📊 **Result Section**: Glassmorphism result cards, success animations, individual note counters with custom icons and custom accent colors, and verification summary badges.
  - 📜 **History**: Historical search logs with date, time, inputs, totals, and buttons to delete single/all records.
  - 📄 **Export**: Action cards to download predictions as CSV or PDF, share, or print.
  - ⚙ **Settings**: Accent customization, Light/Dark Mode toggles, language, developer credentials, and app version.
- Includes a Splash Screen at startup with app logo, tagline "Smart Currency Distribution using AI", and a smooth fade-out loader.

#### [NEW] [style.css](file:///c:/Users/Khalil%20Ahmad/OneDrive/Desktop/cruncy%20note%20finder/web%20app/static/style.css)
Custom CSS styling using a curated palette (Primary: Pakistan Green `#006600`, Accent: Emerald Green `#00A86B`, success `#22C55E`, error `#EF4444`, dark backgrounds, and soft transitions). Fully responsive for standard mobile devices and desktops.

#### [NEW] [script.js](file:///c:/Users/Khalil%20Ahmad/OneDrive/Desktop/cruncy%20note%20finder/web%20app/static/script.js)
Frontend logic that manages page routing (Home, History, Export, Settings), handles dark mode state, saves search history to LocalStorage, handles PDF/CSV export (generating client-side CSV downloads and printing layouts), and interacts with `/predict`.

---

### Component 3: Configuration & Documentation

#### [NEW] [requirements.txt](file:///c:/Users/Khalil%20Ahmad/OneDrive/Desktop/cruncy%20note%20finder/web%20app/requirements.txt)
Specifies dependencies:
- fastapi
- uvicorn
- scikit-learn
- pandas
- numpy
- joblib
- jinja2

#### [NEW] [README.md](file:///c:/Users/Khalil%20Ahmad/OneDrive/Desktop/cruncy%20note%20finder/web%20app/README.md)
Instructions on installing dependencies and running the script.

---

## Verification Plan

### Automated Tests
- Run `python generate_dataset.py` and verify `dataset.csv` contains valid lines and matching totals.
- Run `python train_model.py` and verify `currency_model.pkl` is created.
- Start `python app.py` and test API payload compatibility:
  ```powershell
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/predict" -ContentType "application/json" -Body '{"amount": 5000}'
  ```

### Manual Verification
- Access the UI in a browser subagent to verify navigation, input validation, calculations, visual aesthetics (dark mode, note distribution layout), and export features.
