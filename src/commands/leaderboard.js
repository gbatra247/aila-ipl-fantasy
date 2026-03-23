const { getLeaderboard } = require('../db');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = async function leaderboard() {
  const players = await getLeaderboard(10);

  if (players.length === 0) {
    return 'No players registered yet! Type *!register <name>* to join.';
  }

  const topBalance = parseFloat(players[0].balance);

  let text = `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏆 *LEADERBOARD* 🏆\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  players.forEach((p, i) => {
    const bal = parseFloat(p.balance);
    const medal = MEDALS[i] || `  ${i + 1}.`;
    const bar = topBalance > 0 ? '▓'.repeat(Math.max(1, Math.round((bal / topBalance) * 8))) : '';
    text += `${medal} *${p.display_name}*\n`;
    text += `    ${bar} *$${bal.toFixed(2)}*\n`;
  });

  text += `\n━━━━━━━━━━━━━━━━━━━━`;

  return text;
};
