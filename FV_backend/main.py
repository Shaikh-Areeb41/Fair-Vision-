from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import datasets
from routers import ml_models
from routers import analysis

app = FastAPI(title="FairVision API")

# Allow React to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for development
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router)
app.include_router(ml_models.router)
app.include_router(analysis.router)

@app.get("/")
def read_root():
    return {"status": "FairVision Backend (MongoDB) is Live"}


