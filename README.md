# Real-time Emotion Analysis and Agent Assist PoC

This project is a Proof of Concept (PoC) web application for analyzing customer emotions in real-time and providing actionable suggestions to customer support agents.

## Architecture

The project consists of two main components:
1. **Backend**: Python with FastAPI, utilizing the Hugging Face `transformers` library with the `j-hartmann/emotion-english-distilroberta-base` model.
2. **Frontend**: A modern, premium UI built with HTML, CSS, and Vanilla JS, simulating a split-screen chat interface.

## Local Development Setup

### 1. Backend Setup

You will need Python 3.9+ installed.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. (Optional but recommended) Create a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   *Note: On the very first run, the transformers library will download the pre-trained model (~330MB). This may take a minute depending on your internet connection.*

### 2. Frontend Setup

The frontend consists of static files, so you can serve them using any basic HTTP server or just open the HTML file directly in your browser.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Open `index.html` in your web browser. 
   *(Alternatively, use an extension like Live Server in VS Code, or run `python -m http.server 3000` and visit `http://localhost:3000`)*.

---

## Deployment (Firebase Hosting)

As requested, the frontend will be deployed to **Google Firebase Hosting** under the subdomain `unwe.aleksiev.fr`.

### Prerequisites
1. You must have a Firebase project created at [Firebase Console](https://console.firebase.google.com/).
2. You must have the Firebase CLI installed:
   ```bash
   npm install -g firebase-tools
   ```

### Deployment Steps
1. Log in to Firebase:
   ```bash
   firebase login
   ```
2. Initialize Firebase in the `frontend` directory:
   ```bash
   cd frontend
   firebase init hosting
   ```
   - **Select your project**: Choose the Firebase project you created.
   - **What do you want to use as your public directory?**: Type `.` (to use the current directory, or move the files into a `public` folder and specify `public`).
   - **Configure as a single-page app (rewrite all urls to /index.html)?**: `No`
   - **Set up automatic builds and deploys with GitHub?**: `No`
3. Deploy the application:
   ```bash
   firebase deploy --only hosting
   ```
4. **Custom Domain Setup**: 
   - Go to your Firebase Console -> Hosting.
   - Click "Add custom domain".
   - Enter `unwe.aleksiev.fr`.
   - Follow the instructions to add the TXT/A records to your DNS provider (e.g., Cloudflare, Namecheap, Route53) to verify and map the subdomain.

### Important Note for Production
Currently, the frontend expects the backend at `http://localhost:8000/api/analyze`. 
Before deploying the frontend, you must:
1. Deploy your FastAPI backend to a cloud provider (e.g., Google Cloud Run, Heroku, Render, AWS).
2. Update the `API_URL` variable in `frontend/script.js` to point to your deployed backend's URL.
