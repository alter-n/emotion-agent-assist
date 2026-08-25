import requests
import os
import time

API_URL = "https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base"
API_TOKEN = os.getenv("HF_API_TOKEN")
headers = {"Authorization": f"Bearer {API_TOKEN}"} if API_TOKEN else {}

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
    Analyzes the emotion using the Hugging Face Inference API.
    """
    payload = {"inputs": text}
    
    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        
        # Hugging Face API returns 503 if the model is currently loading on their end
        retries = 0
        while response.status_code == 503 and retries < 10:
            try:
                error_data = response.json()
                # Use HF's estimated time, but cap it at 10 seconds per loop to check back often
                wait_time = min(error_data.get("estimated_time", 10.0), 10.0)
            except:
                wait_time = 5.0
                
            print(f"Model is loading on Hugging Face, waiting {wait_time} seconds...")
            time.sleep(wait_time)
            response = requests.post(API_URL, headers=headers, json=payload)
            retries += 1
            
        response.raise_for_status()
        data = response.json()
        
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list) and len(data[0]) > 0:
            top_emotion_data = sorted(data[0], key=lambda x: x['score'], reverse=True)[0]
            emotion = top_emotion_data['label']
            score = top_emotion_data['score']
        else:
            raise ValueError("Unexpected response format from Hugging Face API")
            
        suggestion = SUGGESTIONS.get(emotion, "No suggestion available.")
        
        return {
            "emotion": emotion,
            "score": score,
            "suggestion": suggestion
        }
        
    except requests.exceptions.RequestException as e:
        print(f"API Error: {e}")
        try:
            error_details = response.json()
            if "error" in error_details:
                error_msg = error_details["error"]
                if "Authorization header" in error_msg:
                    suggestion = "Invalid Hugging Face API token provided."
                else:
                    # Show exactly what HF is complaining about (e.g. Model is still loading)
                    suggestion = f"Hugging Face API: {error_msg}"
                return {
                    "emotion": "unknown",
                    "score": 0.0,
                    "suggestion": suggestion
                }
        except:
            pass
            
        return {
            "emotion": "unknown",
            "score": 0.0,
            "suggestion": "API is currently overloaded or rate-limited. Please try again later."
        }
    except Exception as e:
        print(f"Error parsing response: {e}")
        return {
            "emotion": "unknown",
            "score": 0.0,
            "suggestion": "An error occurred during analysis."
        }
