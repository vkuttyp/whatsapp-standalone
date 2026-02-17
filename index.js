import 'dotenv/config';
import makeWASocket, { 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestWaWebVersion,
    downloadMediaMessage 
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import pino from 'pino';

import { GoogleGenerativeAI } from "@google/generative-ai";
// Initialize Gemini with your API Key

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());

// Update this line to use the 2.5 series
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash" 
});

const chatMemory = {}; // Store { jid: [history_array] }

// Inside your listener:
if (!chatMemory[jid]) chatMemory[jid] = [];

const aiResponse = await askAI(text, chatMemory[jid]);

// Add the current exchange to memory
chatMemory[jid].push({ role: "user", parts: [{ text: text }] });
chatMemory[jid].push({ role: "model", parts: [{ text: aiResponse }] });

// Keep only the last 10 messages to save memory
if (chatMemory[jid].length > 10) chatMemory[jid].shift();

async function askAI(prompt, history = []) {
    try {
        const chat = model.startChat({
            history: history,
            generationConfig: { maxOutputTokens: 500 },
        });

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Error:", error);
        return "I'm having a bit of trouble remembering our conversation. 🧠";
    }
}
/**
 * Helper to analyze images with Gemini
 */
async function analyzeImage(imageBuffer, caption) {
    try {
        const prompt = caption || "Describe this image in detail.";
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBuffer.toString("base64"),
                    mimeType: "image/jpeg",
                },
            },
        ]);
        return result.response.text();
    } catch (error) {
        console.error("AI Vision Error:", error);
        return "I can see the image, but I'm having trouble describing it. 😵‍️";
    }
}

const DATA_DIR = process.env.DATA_DIRECTORY || './data';
const AUTH_DIR = process.env.AUTH_DIRECTORY || 'auth_info';
const PREFIX = process.env.COMMAND_PREFIX || '!';
const TIMEOUT_MS = (parseInt(process.env.TIMEOUT_MINUTES) || 10) * 60 * 1000;
const SESSION_FILE = `${DATA_DIR}/sessions.json`;

async function initDataDir() {
    if (!existsSync(DATA_DIR)) await fs.mkdir(DATA_DIR);
}

async function loadSessions() {
    try {
        if (existsSync(SESSION_FILE)) {
            const data = await fs.readFile(SESSION_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) { return {}; }
    return {};
}

async function saveSessions(sessions) {
    await fs.writeFile(SESSION_FILE, JSON.stringify(sessions, null, 2));
}

async function connectToWhatsApp() {
    await initDataDir();
    let userSessions = await loadSessions();
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestWaWebVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'error' }),
        browser: ["Mac OS", "Chrome", "121.0.0"],
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.clear();
            console.log("📲 SCAN QR CODE WITH WHATSAPP:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
    console.clear();
    console.log('✅ BOT IS ONLINE');
    console.log('--------------------------------------------');
    // You can also send a message to yourself or a specific group to announce the bot is up
    // await sock.sendMessage("your_number@s.whatsapp.net", { text: "🤖 Bot is online and AI Vision is active!" });
}

        if (connection === 'close') {
            const statusCode = lastDisconnect.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) {
                connectToWhatsApp();
            }
        }
    });

   sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
        if (msg.key.fromMe) continue;

        const jid = msg.key.remoteJid;
        const name = msg.pushName || 'User';
        
        // 1. Handle Images (Vision)
        if (msg.message?.imageMessage) {
            await sock.sendPresenceUpdate('composing', jid);
            console.log(`📸 Image received from ${name}. Analyzing...`);

            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const userCaption = msg.message.imageMessage.caption || "What is in this image?";
            
            // Call the analyzeImage function we discussed
            const aiDescription = await analyzeImage(buffer, userCaption);
            
            await sock.sendMessage(jid, { 
                text: `🤖 *AI Vision:* ${aiDescription}`,
                quoted: msg // This replies directly to the image
            });
            continue;
        }

        // 2. Handle Text (Chat)
        const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
        if (!text) continue;

        console.log(`📩 [${name}]: ${text}`);

        // Welcome/Help Command
        if (text.toLowerCase() === '!start' || text.toLowerCase() === '!menu') {
            await sock.sendMessage(jid, { 
                text: `Hello ${name}! 👋\n\nI am now powered by *Google Gemini AI*.\n\n✨ *What I can do:*\n1. *Chat:* Just talk to me normally!\n2. *Vision:* Send me any photo and ask me about it.\n\nTry sending me a photo of something nearby!` 
            });
        } 
        // Default to AI Chat
        else {
            await sock.sendPresenceUpdate('composing', jid);
            const aiResponse = await askAI(text);
            await sock.sendMessage(jid, { text: aiResponse });
        }
    }
});
}

connectToWhatsApp().catch(err => console.error(err));