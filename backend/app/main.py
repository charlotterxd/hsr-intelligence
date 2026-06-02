from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api import records

# Load sample data on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    try:
        from scripts.load_sample_data import load_character_info
        load_character_info()  # Only load character metadata, not player_records (use upsert_pf_data.py for that)
    except Exception as e:
        print(f"Warning: Could not load character info on startup: {e}")
    yield
    # Shutdown
    pass

app = FastAPI(title="HSR PF Visualizer API", lifespan=lifespan)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(records.router, prefix="/api", tags=["records"])

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
