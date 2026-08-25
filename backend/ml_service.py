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
        while response.status_code == 503 and retries < 5:
            print("Model is loading on Hugging Face, waiting 5 seconds...")
            time.sleep(5)
            response = requests.post(API_URL, headers=headers, json=payload)
            retries += 1
            
        response.raise_for_status()
        data = response.json()
        
        # The API returns a list of lists of dictionaries: [[{'label': 'anger', 'score': 0.9}]]
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list) and len(data[0]) > 0:
            # Sort the emotions by score to get the top one
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
            print(f"Details: {error_details}")
            if "error" in error_details and "Authorization header" in error_details["error"]:
                 return {
                    "emotion": "unknown",
                    "score": 0.0,
                    "suggestion": "Invalid Hugging Face API token provided."
                }
        except:
            pass
            
        return {
            "emotion": "unknown",
            "score": 0.0,
            "suggestion": "API is currently overloaded or rate-limited. Please add a Hugging Face token or try again later."
        }
    except Exception as e:
        print(f"Error parsing response: {e}")
        return {
            "emotion": "unknown",
            "score": 0.0,
            "suggestion": "An error occurred during analysis."
        }
