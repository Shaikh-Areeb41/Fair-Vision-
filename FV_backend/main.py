from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import datasets
from routers import ml_models
from routers import analysis
from routers import auth 
from routers import mitigation

app = FastAPI(title="FairVision API")

# Define your allowed sites (Localhost + Vercel)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://fairvisison.vercel.app",  # Your Vercel URL
    "https://fairvisison.vercel.app/"  # Just in case (with slash)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,    # Use the specific list
    allow_credentials=True,   # <--- THIS IS REQUIRED FOR LOGIN
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