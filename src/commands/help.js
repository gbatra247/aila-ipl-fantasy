module.exports = async function help() {
  let text = `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏏 *AIla IPL Fantasy Game* 🏏\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `*Player Commands:*\n`;
  text += `!register <name> — Sign up\n`;
  text += `!match — Active matches & odds\n`;
  text += `!bid <team> — Bet $1 on a team\n`;
  text += `!bid <id> <team> — Bet on specific match\n`;
  text += `!schedule — View all upcoming matches\n`;
  text += `!balance — Check your wallet\n`;
  text += `!leaderboard — Top players\n`;
  text += `!help — This message\n\n`;

  text += `*Admin Commands:*\n`;
  text += `!addmatch A vs B YYYY-MM-DD [wt]\n`;
  text += `!deletematch <id>\n`;
  text += `!open [id] — Open bidding\n`;
  text += `!close [id] — Close bidding\n`;
  text += `!winner [id] <team> — Settle match\n`;
  text += `!status [id] — Betting stats\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━`;
  return text;
};
