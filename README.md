
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