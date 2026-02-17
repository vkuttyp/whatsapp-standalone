import 'dotenv/config';
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';

const MY_JID = "YOUR_NUMBER@s.whatsapp.net"; // Same JID you used in index.js

async function sendNotification() {
    const { state } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
    });

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            await sock.sendMessage(MY_JID, { 
                text: `🚀 *Deployment Successful!*\n\nThe bot has been updated and restarted on your OVH VPS.\n\n🕒 *Time:* ${new Date().toLocaleString()}` 
            });
            process.exit(0);
        }
    });
}

sendNotification();