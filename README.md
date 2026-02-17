
---

# WhatsApp Menu Bot with Session Persistence

A standalone WhatsApp automation tool built with Node.js. This repository features a stateful menu system, automatic image handling, and persistent session management to ensure users don't lose their place in the menu even after a bot restart.

## 🚀 Features

* **Persistent Login:** Scan once and stay logged in using `auth_info`.
* **Stateful Menus:** Remembers if a user is in the "Main Menu" or "Settings" using a local JSON database.
* **Automated Time-outs:** Resets inactive users to the IDLE state after 10 minutes to maintain security.
* **Media Downloader:** Automatically downloads and organizes images sent to the bot.
* **Command System:** Supports custom prefixes (e.g., `!menu`, `!ping`).

## 📁 Project Structure

```text
├── auth_info/           # WhatsApp session credentials (don't share this!)
├── data/                # Persistent storage
│   ├── sessions.json    # Stores user menu states and timestamps
│   └── img_xxxx.jpg     # Downloaded images
├── index.js             # Core logic
├── package.json         # Dependencies and scripts
└── README.md

```

## 🛠️ Installation

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd whatsapp-standalone

```


2. **Install dependencies:**
```bash
npm install

```


3. **Set up ES Modules:**
Ensure your `package.json` contains `"type": "module"`.

## 🚦 How to Run

### Start the Bot

```bash
npm start

```

* The first time you run this, a **QR Code** will appear in your terminal.
* Open WhatsApp on your phone -> **Linked Devices** -> **Link a Device**.
* Scan the code.

### Reset / Logout

If you need to log in with a different account or clear all data:

```bash
# On Linux/Mac:
rm -rf auth_info data

# On Windows:
rd /s /q auth_info data

```

## 🤖 Available Commands

| Command | Action |
| --- | --- |
| `!menu` | Displays the interactive Main Menu |
| `!ping` | Replies with "Pong!" to test connection |
| `1, 2, 0` | Used for navigating through the menus |

## ⚙️ Configuration

You can adjust the session timeout duration in `index.js`:

```javascript
const TIMEOUT_MS = 10 * 60 * 1000; // Currently set to 10 Minutes

```

## 🛡️ Requirements

* Node.js 18.x or higher
* An active WhatsApp account

---

### What's next?

pm2 start index.js --name "whatsapp-bot"

Here is a professionally structured **README** for your [whatsapp-standalone]() repository. This will help document your progress and show anyone visiting your GitHub exactly how advanced your bot has become.

You can copy and paste this directly into your `README.md` file:

---

```markdown
# 🤖 WhatsApp Standalone AI Assistant

A robust, standalone WhatsApp automation tool built with **Node.js** and **Baileys**. This bot is now integrated with **Google Gemini 2.5 Flash**, providing advanced natural language processing and computer vision capabilities directly within WhatsApp.

## 🚀 Features

-   **Persistence:** Sessions are saved locally, so you only need to scan the QR code once.
-   **AI Chat:** Powered by [Google Gemini](https://aistudio.google.com/app/api-keys), allowing for natural, human-like conversations.
-   **AI Vision:** Send an image and ask the bot to describe it, identify objects, or summarize text within the photo.
-   **Real-time Interaction:** Features "typing..." indicators for a more human feel.
-   **Stable Connection:** Optimized to handle connection updates and auto-reconnects.

## 🛠️ Tech Stack

-   **Runtime:** Node.js (v22+)
-   **Library:** `@whiskeysockets/baileys`
-   **AI Engine:** `@google/generative-ai` (Gemini 2.5 Flash)
-   **Environment:** `dotenv` for secure API key management

## 📦 Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/vkuttyp/whatsapp-standalone.git](https://github.com/vkuttyp/whatsapp-standalone.git)
   cd whatsapp-standalone

```

2. **Install dependencies:**
```bash
npm install

```


3. **Configure Environment:**
Create a `.env` file in the root directory and add your [Gemini API Key]():
```env
GEMINI_API_KEY=your_api_key_here
COMMAND_PREFIX=!

```


4. **Run the Bot:**
```bash
npm run dev

```



## 📖 User Guide

Once the bot is online, you can interact with it using the following:

* **General Chat:** Just send a message! The AI will respond to questions, tell jokes, or help with tasks.
* **Analyze Images:** Send a photo with a caption like *"What is this?"* to trigger the Vision engine.
* **Commands:**
* `!start` or `!menu`: Displays the feature guide.
* `!status`: Verifies system health.



## 🤝 Contributing

This is a personal project used to explore WhatsApp automation and AI integration. Feel free to fork it and add your own features!

```

---

### 🌟 Final Tip for the Show-Off
When you show Miran, you can even explain that the code is open-source on your GitHub. It makes the whole project feel much more "official"!

**Is there anything else you'd like to tweak in the code before you wrap up for the day?**

```