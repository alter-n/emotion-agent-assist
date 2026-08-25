from transformers import pipeline

# Load the emotion classification model
# We use a pipeline for simplicity and performance.
# DistilRoBERTa is fast and lightweight, ideal for a PoC.
print("Loading the emotion classification model... This may take a moment on the first run.")
classifier = pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", return_all_scores=False)
print("Model loaded successfully!")

# Define suggestions based on the emotion detected
# The model supports 7 emotions: anger, disgust, fear, joy, neutral, sadness, surprise
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
    Analyzes the emotion of the input text and returns the dominant emotion,
    its confidence score, and a suggested agent response.
    """
    try:
        # Run inference
        result = classifier(text)[0]
        emotion = result['label']
        score = result['score']
        
        # Get suggested response
        suggestion = SUGGESTIONS.get(emotion, "No suggestion available.")
        
        return {
            "emotion": emotion,
            "score": score,
            "suggestion": suggestion
        }
    except Exception as e:
        print(f"Error during analysis: {e}")
        return {
            "emotion": "unknown",
            "score": 0.0,
            "suggestion": "An error occurred during analysis. Please handle manually."
        }
