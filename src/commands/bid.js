const { getUser, getOpenMatches, getMatchById, placeBid, getUserBid } = require('../db');

const TEAM_EMOJI = {
  CSK: '💛', MI: '💙', RCB: '❤️', KKR: '💜', SRH: '🧡',
  DC: '💙', RR: '💗', PBKS: '🔴', GT: '🩵', LSG: '💚',
};

module.exports = async function bid({ userPhone, args }) {
  if (!args[0]) {
    return '❌ Usage: *!bid <team>* or *!bid <matchId> <team>*\nExample: !bid CSK or !bid 5 CSK';
  }

  const user = await getUser(userPhone);
  if (!user) {
    return '❌ Register first! Type *!register <your name>*';
  }

  const openMatches = await getOpenMatches();
  if (openMatches.length === 0) {
    return '❌ No matches are currently open for bidding.';
  }

  let match;
  let teamArg;

  // Check if first arg is a number (match ID)
  if (args.length >= 2 && /^\d+$/.test(args[0])) {
    const matchId = parseInt(args[0]);
    teamArg = args[1].toUpperCase();
    match = await getMatchById(matchId);
    if (!match || match.status !== 'open') {
      return `❌ Match #${matchId} is not open for bidding.`;
    }
  } else {
    teamArg = args[0].toUpperCase();

    if (openMatches.length === 1) {
      match = openMatches[0];
    } else {
      const matching = openMatches.filter(
        m => m.team_a === teamArg || m.team_b === teamArg
      );
      if (matching.length === 1) {
        match = matching[0];
      } else if (matching.length > 1) {
        let text = `⚠️ *${teamArg}* is in multiple open matches:\n\n`;
        matching.forEach(m => {
          text += `  Match #${m.id}: ${m.team_a} vs ${m.team_b}\n`;
        });
        text += `\nSpecify: *!bid ${matching[0].id} ${teamArg}*`;
        return text;
      } else {
        let text = `❌ *${teamArg}* isn't in any open match.\n\nOpen matches:\n`;
        openMatches.forEach(m => {
          text += `  #${m.id}: ${m.team_a} vs ${m.team_b}\n`;
        });
        return text;
      }
    }
  }

  if (teamArg !== match.team_a && teamArg !== match.team_b) {
    return `❌ Choose *${match.team_a}* or *${match.team_b}* for match #${match.id}`;
  }

  const emoji = TEAM_EMOJI[teamArg] || '⚪';
  const existingBid = await getUserBid(userPhone, match.id);

  if (existingBid) {
    if (existingBid.team_chosen === teamArg) {
      return `${emoji} Already backing *${teamArg}* in match #${match.id}!`;
    }
    await placeBid(userPhone, match.id, teamArg);
    return `🔄 *Switched to ${teamArg}!* ${emoji}\n🏏 #${match.id}: ${match.team_a} vs ${match.team_b}`;
  }

  // No extra charge — $1 was already deducted when bidding opened
  await placeBid(userPhone, match.id, teamArg);

  let text = `${emoji} *BID PLACED!* ${emoji}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏏 #${match.id}: ${match.team_a} vs ${match.team_b}\n`;
  text += `✅ Your pick: *${teamArg}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `You can switch anytime before close!\nType *!match* for live odds 📊`;

  return text;
};
