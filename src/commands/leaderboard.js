const { getLeaderboard } = require('../db');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = async function leaderboard() {
  const players = await getLeaderboard(10);

  if (players.length === 0) {
    return 'No players registered yet! Type *!register <name>* to join.';
  }

  let text = '🏆 *LEADERBOARD* 🏆\n\n';
  players.forEach((p, i) => {
    const rank = MEDALS[i] || `${i + 1}.`;
    text += `${rank} *${p.display_name}* — $${parseFloat(p.balance).toFixed(2)}\n`;
  });

  return text;
};
