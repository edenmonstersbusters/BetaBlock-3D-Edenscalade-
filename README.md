# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/12i8PkwiFZ9Zf7xqJ5ukhYnCuUN3lX3jm

## Run Locally

***Prerequisites:***  Node.js (https://nodejs.org/)

**Install the repository**

1. Download all file in the repository
2. Open a terminal in your folder with the repository (cmd in explorate bar)

**Clone the repository**

If your don't want to install all file :
   ```bash
   git clone https://github.com/edenmonstersbusters/BetaBlock-3D-Edenscalade-.git
   cd BetaBlock-3D-Edenscalade-
   ```
**Launch application**

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key :
   - create .env.local file in the racine of the project
   - write : GEMINI_API_KEY=votre_cle_api_ici
3. Run the app:
   `npm run dev`



