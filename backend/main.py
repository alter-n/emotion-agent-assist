from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ml_service import analyze_emotion

app = FastAPI(title="Emotion Analysis and Agent Assist API")

# Configure CORS
# In a production environment, you should restrict origins to your specific domain (e.g., https://unwe.aleksiev.fr)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for the PoC local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageRequest(BaseModel):
    text: str

from typing import Optional

class EmotionResponse(BaseModel):
    emotion: str
    score: float
    suggestion: str
    debug: Optional[dict] = None

@app.get("/")
def read_root():
    return {"message": "Welcome to the Emotion Analysis API. Send a POST request to /api/analyze."}

@app.post("/api/analyze", response_model=EmotionResponse)
def analyze_message(request: MessageRequest):
    """
    Receives a message from the customer and returns the detected emotion and an agent suggestion.
    """
    result = analyze_emotion(request.text)
    return result

if __name__ == "__main__":
    import uvicorn
    # Run the server on port 8000 by default
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
