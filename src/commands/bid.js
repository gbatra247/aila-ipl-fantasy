const { getUser, getActiveMatch, placeBid, getUserBid, updateBalance } = require('../db');

const TEAM_EMOJI = {
  CSK: '💛', MI: '💙', RCB: '❤️', KKR: '💜', SRH: '🧡',
  DC: '💙', RR: '💗', PBKS: '🔴', GT: '🩵', LSG: '💚',
};

module.exports = async function bid({ userPhone, args }) {
  const teamArg = args[0]?.toUpperCase();
  if (!teamArg) {
    return '❌ Usage: !bid <team>\nExample: !bid CSK';
  }

  const user = await getUser(userPhone);
  if (!user) {
    return '❌ Register first! Type *!register <your name>*';
  }

  const match = await getActiveMatch();
  if (!match) {
    return '❌ No match is currently open for bidding.';
  }

  if (match.status !== 'open') {
    return '🔒 Bidding is closed for this match.';
  }

  if (teamArg !== match.team_a && teamArg !== match.team_b) {
    return `❌ Invalid team. Choose *${match.team_a}* or *${match.team_b}*`;
  }

  const emoji = TEAM_EMOJI[teamArg] || '⚪';
  const existingBid = await getUserBid(userPhone, match.id);

  if (existingBid) {
    if (existingBid.team_chosen === teamArg) {
      return `${emoji} Already backing *${teamArg}*! Type *!match* for odds.`;
    }
    await placeBid(userPhone, match.id, teamArg);
    return `🔄 *Switched to ${teamArg}!* ${emoji}\n\n🏏 ${match.team_a} vs ${match.team_b}\nGood luck! 🤞`;
  }

  if (parseFloat(user.balance) < 1) {
    return '💸 Not enough balance! You need *$1* to bid.';
  }

  await updateBalance(userPhone, -1);
  await placeBid(userPhone, match.id, teamArg);

  const newBal = (parseFloat(user.balance) - 1).toFixed(2);

  let text = `${emoji} *BID PLACED!* ${emoji}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏏 ${match.team_a} vs ${match.team_b}\n`;
  text += `✅ Your pick: *${teamArg}*\n`;
  text += `💰 -$1 → Balance: *$${newBal}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `Type *!match* for live odds 📊`;

  return text;
};
