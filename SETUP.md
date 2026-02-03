# Kid Vibe Code - Quick Setup Guide

## Step 1: Get Your API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Create an API key
4. Copy the key (it starts with `sk-ant-...`)

## Step 2: Configure Environment

1. In the `kid-vibe-code` folder, find the file `.env.example`
2. Make a copy and name it `.env`
3. Open `.env` in a text editor
4. Replace `your_anthropic_api_key_here` with your actual API key

```
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
PORT=3001
```

## Step 3: Start the Application

**Option A: Use the batch file (Windows)**
- Double-click `START.bat`
- This will start both the backend and frontend

**Option B: Manual start**
1. Open TWO terminal/command prompt windows
2. In the first window:
   ```
   cd kid-vibe-code
   node server/index.js
   ```
3. In the second window:
   ```
   cd kid-vibe-code
   npm run dev
   ```

## Step 4: Open the App

1. Open your web browser
2. Go to: http://localhost:3000
3. Select an age mode and start creating!

## Troubleshooting

### "Cannot find module" errors
Run `npm install` again in the kid-vibe-code folder.

### API errors
Make sure your `.env` file exists and has a valid API key.

### Port already in use
Change the port numbers in `.env` and `vite.config.ts`.

## Testing with Your Microschool Students

1. Start the app on your computer
2. Have students access via the browser
3. For remote testing, you'll need to deploy to a hosting service

## Next Steps

- Test with your microschool students
- Gather feedback on what works and what doesn't
- Iterate on the prompts in `server/prompts.js`
- Customize the UI in the `src/components` folder
