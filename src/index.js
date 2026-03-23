require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./bot');

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

  const logger = pino({ level: 'silent' });

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    version,
    logger,
    browser: ['AIla IPL Bot', 'Chrome', '120.0.0'],
    syncFullHistory: true,
    getMessage: async (key) => {
      return { conversation: '' };
    },
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr: qrCode } = update;

    if (qrCode) {
      console.log('\n========================================');
      console.log('  Scan this QR with WhatsApp:');
      console.log('  (Linked Devices > Link a Device)');
      console.log('========================================\n');
      qrcode.generate(qrCode, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('Logged out. Cleaning auth and restarting...');
        deleteAuthFolder();
        setTimeout(() => startBot(), 5000);
      } else {
        console.log('Connection lost. Reconnecting in 5 seconds...');
        setTimeout(() => startBot(), 5000);
      }
    } else if (connection === 'open') {
      console.log('\n*** AIla IPL Fantasy Bot is ready! ***\n');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log('Message event:', type, '- Count:', messages.length);

    for (const msg of messages) {
      console.log('From:', msg.key.remoteJid, 'FromMe:', msg.key.fromMe);
      console.log('Message type:', Object.keys(msg.message || {}));

      // Skip bot's own replies (they don't start with !)
      // But allow our own !commands through
      const prefix = process.env.BOT_PREFIX || '!';
      const msgText =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';
      if (msg.key.fromMe && !msgText.startsWith(prefix)) continue;

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

      console.log('Text:', text);

      if (!text) continue;

      const sender = msg.key.participant || msg.key.remoteJid || '';
      const userPhone = sender.split('@')[0] || 'unknown';
      const chatId = msg.key.remoteJid;

      try {
        const reply = await handleMessage(sock, {
          body: text,
          userPhone,
          chatId,
        });
        console.log('Reply:', reply ? reply.substring(0, 50) + '...' : 'null');
        console.log('Sending to:', chatId);
        if (reply) {
          // Retry up to 3 times if "No sessions" error
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await sock.sendMessage(chatId, { text: reply });
              console.log('Message sent successfully!');
              break;
            } catch (sendErr) {
              console.error(`Send attempt ${attempt} failed:`, sendErr.message);
              if (attempt < 3) {
                await new Promise((r) => setTimeout(r, 2000));
              }
            }
          }
        }
      } catch (err) {
        console.error('Error handling message:', err.message);
      }
    }
  });
}

console.log('Starting AIla IPL Fantasy Bot...');
startBot();
