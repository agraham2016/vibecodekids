# Kid Vibe Code 🚀

A kid-friendly vibe coding platform where children ages 7-18 can describe what they want to build in plain English and watch it come to life!

## Features

- **Natural Language Coding**: Kids describe what they want, AI generates the code
- **Age-Adaptive Interface**: Three modes for different age groups:
  - **Explorer (7-10)**: Focus on creation, code hidden, maximum simplicity
  - **Builder (10-14)**: See code, learn concepts, guided exploration
  - **Creator (14-18)**: Full code editing, advanced features
- **Live Preview**: See creations instantly in a built-in browser
- **Kid-Safe AI**: Content filtering and age-appropriate responses
- **Zero Setup**: Runs entirely in the browser

## Quick Start

### Prerequisites

- Node.js 18+ installed
- An Anthropic API key ([get one here](https://console.anthropic.com/))

### Installation

1. **Install dependencies:**
   ```bash
   cd kid-vibe-code
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your Anthropic API key.

3. **Start the development servers:**

   In one terminal, start the backend:
   ```bash
   npm run server
   ```

   In another terminal, start the frontend:
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:3000`

## Project Structure

```
kid-vibe-code/
├── public/              # Static assets
├── server/              # Backend API server
│   ├── index.js         # Express server
│   └── prompts.js       # Kid-friendly AI prompts
├── src/
│   ├── components/      # React components
│   │   ├── ChatPanel    # Chat interface
│   │   ├── CodeEditor   # Monaco code editor
│   │   ├── PreviewPanel # Live preview
│   │   ├── Header       # App header
│   │   └── WelcomeModal # Age selection
│   ├── App.tsx          # Main application
│   ├── types.ts         # TypeScript types
│   └── index.css        # Global styles
├── .env.example         # Environment template
└── package.json         # Dependencies
```

## Age Modes Explained

### Explorer Mode (Ages 7-10)
- Large, friendly UI
- Code is completely hidden
- AI speaks in very simple language
- Focus entirely on the creative result
- Maximum encouragement and positivity

### Builder Mode (Ages 10-14)
- Code visible but read-only
- AI explains concepts simply
- Learn-by-seeing approach
- Introduces programming vocabulary gradually

### Creator Mode (Ages 14-18)
- Full code editing capabilities
- Technical explanations available
- Professional development experience
- Export and download features

## Safety Features

- **Content Filtering**: Blocks inappropriate requests
- **Sandboxed Preview**: Code runs in isolated iframe
- **Age-Appropriate Responses**: AI adapts language and content
- **No External Requests**: All code is self-contained
- **Parental Visibility**: (Coming soon) Dashboard for parents

## Testing with Your Microschool

This MVP is designed to be tested with real students:

1. Start the app with your microschool
2. Let students choose their age mode
3. Observe what works and what confuses them
4. Note which prompts produce best results
5. Collect feedback on the UI

### Questions to Ask Students:
- "Was it easy to understand what to do?"
- "Did the AI helper explain things clearly?"
- "What did you wish you could do that you couldn't?"
- "What was your favorite part?"

## Customization

### Modifying AI Prompts

Edit `server/prompts.js` to:
- Adjust the base personality
- Add new content filters
- Modify age-specific language
- Add educational elements

### Changing the Theme

Edit `src/index.css` to modify:
- Color palette (CSS variables at top)
- Border radius and shadows
- Animation timings

## Roadmap

### Phase 2: Core Platform
- [ ] Game engine support (Phaser.js or p5.js)
- [ ] Project save/load with database
- [ ] Parent dashboard
- [ ] User authentication

### Phase 3: Safety & Polish
- [ ] Enhanced content filtering
- [ ] Error handling improvements
- [ ] Mobile responsive design
- [ ] Sharing and export features

### Phase 4: Scale
- [ ] Multi-user support
- [ ] ESA billing integration
- [ ] Analytics dashboard
- [ ] Documentation for educators

## License

Proprietary - All rights reserved

## Support

For questions about using this with your microschool, contact the developer.

---

Built with ❤️ for young creators everywhere!
