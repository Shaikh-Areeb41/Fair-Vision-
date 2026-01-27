from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import datasets
from routers import ml_models
from routers import analysis
from routers import auth 
from routers import mitigation

app = FastAPI(title="FairVision API")

# Allow React to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for development
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. REGISTER AUTH ROUTER ---
app.include_router(auth.router)

# Register existing routers
app.include_router(datasets.router)
app.include_router(ml_models.router)
app.include_router(analysis.router)
app.include_router(mitigation.router)

@app.get("/")
def read_root():
    return {"status": "FairVision Backend (MongoDB) is Live"}