import 'dotenv/config';
import makeWASocket, { 
    useMultiFileAuthState, 
    DisconnectReason,
    downloadMediaMessage 
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import pino from 'pino';

// Configuration from .env
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

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    const updateUser = async (jid, status) => {
        userSessions[jid] = { state: status, lastSeen: Date.now() };
        await saveSessions(userSessions);
    };

    const sendMainMenu = async (jid) => {
        await updateUser(jid, 'MAIN_MENU');
        await sock.sendMessage(jid, { text: `*Main Menu* 🏠\n\n1️⃣ Status\n2️⃣ Settings\n3️⃣ Exit` });
    };

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.clear();
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'open') console.log('✅ Bot Online & Protected by PM2/Dotenv');
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (msg.key.fromMe) continue;

            const jid = msg.key.remoteJid;
            const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
            
            // Timeout Logic
            const userData = userSessions[jid] || { state: 'IDLE', lastSeen: Date.now() };
            if (userData.state !== 'IDLE' && (Date.now() - userData.lastSeen) > TIMEOUT_MS) {
                await sock.sendMessage(jid, { text: '_Session expired. Type !menu to start again._' });
                userData.state = 'IDLE';
            }

            // Command / Menu Logic
            if (text.startsWith(PREFIX) || text.toLowerCase() === 'menu') {
                await sendMainMenu(jid);
                continue;
            }

            if (userData.state === 'MAIN_MENU') {
                if (text === '1') {
                    await sock.sendMessage(jid, { text: '🟢 System: Active' });
                    await updateUser(jid, 'MAIN_MENU');
                } else if (text === '2') {
                    await updateUser(jid, 'SETTINGS_MENU');
                    await sock.sendMessage(jid, { text: '*Settings*\n\n0️⃣ Back' });
                }
            } else if (userData.state === 'SETTINGS_MENU' && text === '0') {
                await sendMainMenu(jid);
            }

            // Image Handling
            if (msg.message?.imageMessage) {
                const buffer = await downloadMediaMessage(msg, 'buffer', {});
                const path = `${DATA_DIR}/img_${Date.now()}.jpg`;
                await fs.writeFile(path, buffer);
                await sock.sendMessage(jid, { text: '📸 Saved to data folder.' });
                await updateUser(jid, userData.state);
            }
        }
    });
}

connectToWhatsApp().catch(err => console.error(err));