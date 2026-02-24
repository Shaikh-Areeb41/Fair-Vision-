from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
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
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "https://fairvision.live",
    "https://www.fairvision.live",
    "https://fairvision.vercel.app",
    "https://fairvision.vercel.app/",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
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