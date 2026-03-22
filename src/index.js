require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { handleMessage } = require('./bot');

const PHONE_NUMBER = process.env.ADMIN_PHONES?.split(',')[0];

function deleteAuthFolder() {
  const authPath = path.join(process.cwd(), '.auth');
  if (fs.existsSync(authPath)) {
    fs.rmSync(authPath, { recursive: true, force: true });
    console.log('Cleared old auth data.');
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('.auth');
  const { version } = await fetchLatestBaileysVersion();

  console.log('Using WA version:', version.join('.'));

  const sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }),
    browser: ['AIla IPL Bot', 'Chrome', '120.0.0'],
  });

  // Request pairing code if not yet registered
  if (!state.creds.registered && PHONE_NUMBER) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER);
        console.log('\n================================================');
        console.log('  PAIRING CODE: ' + code);
        console.log('');
        console.log('  On your phone:');
        console.log('  1. WhatsApp > Linked Devices > Link a Device');
        console.log('  2. Tap "Link with phone number instead"');
        console.log('  3. Enter phone number: +' + PHONE_NUMBER);
        console.log('  4. Enter code: ' + code);
        console.log('');
        console.log('  Code expires in ~60 seconds!');
        console.log('================================================\n');
      } catch (err) {
        console.error('Failed to get pairing code:', err.message);
        console.log('Cleaning auth and retrying in 10 seconds...');
        deleteAuthFolder();
        setTimeout(() => startBot(), 10000);
      }
    }, 5000);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('Logged out. Cleaning auth and restarting...');
        deleteAuthFolder();
        setTimeout(() => startBot(), 10000);
      } else {
        console.log('Connection lost. Reconnecting in 5 seconds...');
        setTimeout(() => startBot(), 5000);
      }
    } else if (connection === 'open') {
      console.log('\n*** AIla IPL Fantasy Bot is ready! ***\n');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

      if (!text) continue;

      const sender = msg.key.participant || msg.key.remoteJid;
      const userPhone = sender.replace('@s.whatsapp.net', '');
      const chatId = msg.key.remoteJid;

      try {
        const reply = await handleMessage(sock, {
          body: text,
          userPhone,
          chatId,
        });
        if (reply) {
          await sock.sendMessage(chatId, { text: reply }, { quoted: msg });
        }
      } catch (err) {
        console.error('Error handling message:', err);
      }
    }
  });
}

console.log('Starting AIla IPL Fantasy Bot...');
console.log('Phone number for pairing: +' + PHONE_NUMBER);
startBot();
