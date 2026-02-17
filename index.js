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
import os from 'os';
import cron from 'node-cron';
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * 1. INITIALIZATION & CONFIG
 * Your API key is pulled from the .env file.
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const chatMemory = {}; 
let dailyLog = [];

// FIXME: Replace with your JID from terminal logs (e.g., "919876543210@s.whatsapp.net")
const MY_JID = process.env.MY_JID.trim(); 
const AUTH_DIR = 'auth_info';

/**
 * 2. AI HELPER FUNCTIONS
 */
async function askAI(prompt, history = []) {
    try {
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(prompt);
        return (await result.response).text();
    } catch (error) {
        console.error("AI Text Error:", error);
        return "I'm having a bit of trouble thinking right now. 🧠";
    }
}

async function analyzeMedia(buffer, mimeType, prompt) {
    try {
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: buffer.toString("base64"), mimeType } },
        ]);
        return (await result.response).text();
    } catch (error) {
        console.error("Media Error:", error);
        return "I couldn't process that file. 😵‍️";
    }
}

/**
 * 3. WHATSAPP CONNECTION ENGINE
 */
async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestWaWebVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'error' }),
        browser: ["Mac OS", "Chrome", "121.0.0"],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.clear();
            console.log("📲 SCAN QR CODE:");
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'open') {
            console.clear();
            console.log('✅ BOT IS ONLINE');
            console.log('--------------------------------------------');
        }
        if (connection === 'close' && lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
            connectToWhatsApp();
        }
    });

    /**
     * 4. MESSAGE LISTENER (AI + Vision + Voice + Admin)
     */
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (msg.key.fromMe) continue;

            const jid = msg.key.remoteJid;
            const name = msg.pushName || 'User';
            
            const isImage = !!msg.message?.imageMessage;
            const isVoice = !!msg.message?.audioMessage;
            const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();

            if (!chatMemory[jid]) chatMemory[jid] = [];

            // --- ADMIN COMMAND (!sys) ---
            if (text.toLowerCase() === '!sys' && jid === MY_JID) {
                const status = `💻 *System:* ${os.platform()}\n🧠 *RAM:* ${(os.freemem()/1e9).toFixed(2)}GB free\n🚀 *Uptime:* ${Math.floor(os.uptime()/3600)}h`;
                await sock.sendMessage(jid, { text: status });
                continue;
            }

            await sock.sendPresenceUpdate('composing', jid);
            let aiResponse = "";

            // --- HANDLING MEDIA (Images & Voice) ---
            if (isImage || isVoice) {
                const buffer = await downloadMediaMessage(msg, 'buffer', {});
                const mime = isImage ? "image/jpeg" : "audio/ogg";
                const prompt = isImage ? (msg.message.imageMessage.caption || "Describe this") : "Transcribe and answer this";
                
                aiResponse = await analyzeMedia(buffer, mime, prompt);
                dailyLog.push(`[${name}] Sent media: ${isImage ? 'Image' : 'Voice'}`);
            } 
            // --- HANDLING TEXT ---
            else if (text) {
                aiResponse = await askAI(text, chatMemory[jid]);
                dailyLog.push(`[${name}] Said: ${text.slice(0, 30)}`);
            }

            if (aiResponse) {
                // Update Local Memory
                chatMemory[jid].push({ role: "user", parts: [{ text: text || "Sent media" }] });
                chatMemory[jid].push({ role: "model", parts: [{ text: aiResponse }] });
                if (chatMemory[jid].length > 10) chatMemory[jid].shift();

                await sock.sendMessage(jid, { text: aiResponse }, { quoted: msg });
            }
        }
    });

    /**
     * 5. AUTOMATED TASKS
     */
    // Daily Summary at 8 AM
    cron.schedule('0 8 * * *', async () => {
        if (dailyLog.length === 0) return;
        const summary = await askAI(`Summarize this bot activity: ${dailyLog.join(', ')}`);
        await sock.sendMessage(MY_JID, { text: `📅 *Daily Summary:*\n\n${summary}` });
        dailyLog = [];
    });

    // Hourly Maintenance (Keeps Memory Lean)
    cron.schedule('0 * * * *', () => {
        if (Object.keys(chatMemory).length > 50) {
            for (const key in chatMemory) delete chatMemory[key];
            console.log("🧹 Cache Purged");
        }
    });
}

connectToWhatsApp().catch(err => console.error(err));


import http from 'http';

// Simple Health Check Server
const PORT = process.env.PORT || 2482;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: "online",
        uptime: Math.floor(os.uptime() / 3600) + " hours",
        memory_usage: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + "GB free",
        last_log_entry: dailyLog[dailyLog.length - 1] || "No activity yet today"
    }));
}).listen(PORT, () => {
    console.log(`📡 Health Check live at http://localhost:${PORT}`);
});