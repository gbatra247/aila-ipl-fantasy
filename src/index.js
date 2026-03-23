require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  generateWAMessageFromContent,
  generateMessageID,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const http = require('http');
const { handleMessage } = require('./bot');

let latestQR = null;
const msgStore = {};

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
    markOnlineOnConnect: true,
    getMessage: async (key) => {
      return msgStore[key.id] || { conversation: '' };
    },
  });

  sock.ev.on('creds.update', saveCreds);

  // Store messages
  sock.ev.on('messages.upsert', async ({ messages: msgs }) => {
    for (const m of msgs) {
      if (m.message) msgStore[m.key.id] = m.message;
    }
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr: qrCode } = update;

    if (qrCode) {
      latestQR = qrCode;
      console.log('\n========================================');
      console.log('  Scan QR with WhatsApp:');
      console.log('========================================\n');
      qrcode.generate(qrCode, { small: true });
      console.log('\n🔗 Or open: http://localhost:' + (process.env.PORT || 3000) + '/qr\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('Logged out. Cleaning auth...');
        deleteAuthFolder();
        setTimeout(() => startBot(), 5000);
      } else {
        console.log('Connection lost. Reconnecting...');
        setTimeout(() => startBot(), 5000);
      }
    } else if (connection === 'open') {
      latestQR = null;
      console.log('\n*** AIla IPL Fantasy Bot is ready! ***\n');
    }
  });

  // Command handler
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      const prefix = process.env.BOT_PREFIX || '!';
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

      if (msg.key.remoteJid === 'status@broadcast') continue;
      if (msg.key.fromMe && !text.startsWith(prefix)) continue;
      if (!text || !text.startsWith(prefix)) continue;

      const isGroup = msg.key.remoteJid?.endsWith('@g.us');
      const sender = msg.key.participant || msg.key.remoteJid || '';
      const userPhone = sender.split('@')[0] || 'unknown';
      const chatId = msg.key.remoteJid;

      console.log(`[${isGroup ? 'GROUP' : 'DM'}] From: ${userPhone} Text: ${text}`);

      try {
        const reply = await handleMessage(sock, {
          body: text,
          userPhone,
          chatId,
        });

        if (!reply) continue;

        // Try sending to group first
        let sent = false;
        try {
          await sock.sendMessage(chatId, { text: reply });
          console.log('✅ Sent to', chatId);
          sent = true;
        } catch (e1) {
          console.log('Group send failed:', e1.message);
        }

        // If group send fails, DM the user instead
        if (!sent && isGroup) {
          const dmId = sender.includes('@') ? sender : sender + '@s.whatsapp.net';
          try {
            await sock.sendMessage(dmId, { text: `_(Reply to your "${text}" in the group)_\n\n${reply}` });
            console.log('✅ Sent via DM to', dmId);
          } catch (e2) {
            // Try with @lid format
            try {
              await sock.sendMessage(sender, { text: `_(Reply to your "${text}" in the group)_\n\n${reply}` });
              console.log('✅ Sent via DM (lid) to', sender);
            } catch (e3) {
              console.error('❌ All sends failed:', e3.message);
            }
          }
        }

      } catch (err) {
        console.error('❌ Error:', err.message);
      }
    }
  });
}

// HTTP server for QR
const PORT = process.env.PORT || 3000;
http.createServer(async (req, res) => {
  if (req.url === '/qr' && latestQR) {
    const qrImage = await QRCode.toDataURL(latestQR, { width: 400 });
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111;flex-direction:column"><h2 style="color:white;font-family:sans-serif">Scan with WhatsApp</h2><img src="${qrImage}" style="border-radius:12px"/><script>setTimeout(()=>location.reload(),30000)</script></body></html>`);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111"><h2 style="color:white;font-family:sans-serif">AIla Bot running! No QR needed.</h2></body></html>');
  }
}).listen(PORT, () => console.log(`QR server on port ${PORT}`));

console.log('Starting AIla IPL Fantasy Bot...');
startBot();
