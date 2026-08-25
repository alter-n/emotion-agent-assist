import os
import time
from huggingface_hub import InferenceClient

# Initialize the official Hugging Face SDK Client
API_TOKEN = os.getenv("HF_API_TOKEN")
client = InferenceClient(token=API_TOKEN)

SUGGESTIONS = {
    "anger": "The customer is angry. Validate their frustration, apologize sincerely, and offer an immediate resolution.",
    "disgust": "The customer is extremely dissatisfied. Acknowledge the issue, apologize, and promise to investigate.",
    "fear": "The customer is anxious or afraid. Provide reassurance, clear information, and guide them step-by-step.",
    "joy": "The customer is happy! Thank them for their positive feedback and ask if there's anything else you can do.",
    "neutral": "The customer is neutral. Provide a clear, concise, and professional answer to their query.",
    "sadness": "The customer is sad or disappointed. Show deep empathy, apologize for their experience, and offer support.",
    "surprise": "The customer is surprised. Acknowledge their reaction and provide clear explanations to clarify the situation."
}

def analyze_emotion(text: str):
    """
    Analyzes the emotion using the official Hugging Face Inference SDK.
    """
    try:
        # We loop to handle 503 Model Loading errors which the client might throw
        retries = 0
        results = None
        while retries < 5:
            try:
                results = client.text_classification(text, model="j-hartmann/emotion-english-distilroberta-base")
                break  # Success!
            except Exception as e:
                error_str = str(e).lower()
                if "503" in error_str or "loading" in error_str:
                    print(f"Model loading, waiting 10 seconds... ({retries+1}/5)")
                    time.sleep(10)
                    retries += 1
                else:
                    raise e  # Re-raise if it's not a loading error
        
        if results is None:
            return {
                "emotion": "unknown",
                "score": 0.0,
                "suggestion": "Model took too long to load on Hugging Face. Please try again."
            }
            
        if len(results) > 0:
            # Handle both dict-like and object-like returns from the SDK
            if isinstance(results[0], dict):
                top_result = sorted(results, key=lambda x: x.get('score', 0), reverse=True)[0]
                emotion = top_result.get('label', 'unknown')
                score = top_result.get('score', 0.0)
            else:
                top_result = sorted(results, key=lambda x: getattr(x, 'score', 0), reverse=True)[0]
                emotion = getattr(top_result, 'label', 'unknown')
                score = getattr(top_result, 'score', 0.0)
        else:
            raise ValueError("Empty response from Hugging Face API")
            
        suggestion = SUGGESTIONS.get(emotion, "No suggestion available.")
        
        return {
            "emotion": emotion,
            "score": score,
            "suggestion": suggestion
        }
        
    except Exception as e:
        print(f"API Error: {e}")
        error_str = str(e)
        if "Unauthorized" in error_str or "401" in error_str:
            suggestion = "Invalid Hugging Face API token provided."
        elif "resolve" in error_str or "NameResolutionError" in error_str:
             suggestion = "Render Server DNS Error: Could not resolve Hugging Face URL. Try again."
        else:
            # Cap the length of the error message to avoid UI overflow
            suggestion = f"Hugging Face SDK Error: {error_str[:150]}"
            
        return {
            "emotion": "unknown",
            "score": 0.0,
            "suggestion": suggestion
        }
