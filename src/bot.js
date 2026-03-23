const register = require('./commands/register');
const match = require('./commands/match');
const bid = require('./commands/bid');
const balance = require('./commands/balance');
const leaderboard = require('./commands/leaderboard');
const help = require('./commands/help');
const admin = require('./commands/admin');

const PREFIX = process.env.BOT_PREFIX || '!';

const commands = {
  register,
  match,
  bid,
  balance,
  leaderboard,
  lb: leaderboard,
  help,
  // Admin commands
  open: admin.open,
  close: admin.close,
  winner: admin.winner,
  schedule: admin.schedule,
  status: admin.status,
  addmatch: admin.addmatch,
  deletematch: admin.deletematch,
};

async function handleMessage(sock, msg) {
  const body = msg.body.trim();
  if (!body.startsWith(PREFIX)) return null;

  const parts = body.slice(PREFIX.length).trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  const handler = commands[command];
  if (!handler) return null;

  return handler({ userPhone: msg.userPhone, args });
}

module.exports = { handleMessage };
