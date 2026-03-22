const { getUser, createUser } = require('../db');

module.exports = async function register({ userPhone, args }) {
  const name = args.join(' ').trim();
  if (!name) {
    return '❌ Usage: !register <your name>\nExample: !register Virat';
  }

  const existing = await getUser(userPhone);
  if (existing) {
    return `You're already registered as *${existing.display_name}*! Balance: $${existing.balance}`;
  }

  const user = await createUser(userPhone, name);
  return `🎉 Welcome to AIla IPL Fantasy, *${user.display_name}*!\n\n💰 Starting balance: *$${user.balance}*\n\nType *!match* to see today's game or *!help* for all commands.`;
};
