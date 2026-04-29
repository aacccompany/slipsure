import uvicorn
from app.main import app

if __name__ == "__main__":
    # This is a wrapper for the new modular app structure
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
