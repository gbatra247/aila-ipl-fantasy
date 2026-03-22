require('dotenv').config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { handleMessage } = require('./bot');

const PHONE_NUMBER = process.env.ADMIN_PHONES?.split(',')[0];

let retryCount = 0;
const MAX_RETRIES = 5;

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

  // Request pairing code instead of QR
  if (!state.creds.registered && PHONE_NUMBER) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER);
        console.log('\n================================================');
        console.log('  PAIRING CODE: ' + code);
        console.log('  ');
        console.log('  Go to WhatsApp > Linked Devices > Link a Device');
        console.log('  Then tap "Link with phone number instead"');
        console.log('  Enter this code: ' + code);
        console.log('================================================\n');
      } catch (err) {
        console.error('Failed to get pairing code:', err.message);
      }
    }, 3000);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect && retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`Reconnecting... (attempt ${retryCount}/${MAX_RETRIES})`);
        setTimeout(() => startBot(), 3000);
      } else if (!shouldReconnect) {
        console.log('Logged out. Delete .auth folder and restart.');
      } else {
        console.log('Max retries reached. Restart the bot manually.');
        process.exit(1);
      }
    } else if (connection === 'open') {
      retryCount = 0;
      console.log('\nAIla IPL Fantasy Bot is ready!');
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
startBot();
