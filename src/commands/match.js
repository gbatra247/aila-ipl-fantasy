const { getActiveMatch, getNextMatch, getMatchBids } = require('../db');
const { calculateOdds } = require('../odds');

const TEAM_EMOJI = {
  CSK: '💛',
  MI: '💙',
  RCB: '❤️',
  KKR: '💜',
  SRH: '🧡',
  DC: '💙',
  RR: '💗',
  PBKS: '🔴',
  GT: '🩵',
  LSG: '💚',
};

function makeBar(pct, len = 10) {
  const filled = Math.round((pct / 100) * len);
  return '▓'.repeat(filled) + '░'.repeat(len - filled);
}

module.exports = async function match() {
  let m = await getActiveMatch();
  if (!m) {
    m = await getNextMatch();
  }

  if (!m) {
    return '📅 No upcoming matches found!';
  }

  const bids = await getMatchBids(m.id);
  const odds = calculateOdds(bids, m.team_a, m.team_b);

  const dateStr = new Date(m.match_date).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const emojiA = TEAM_EMOJI[m.team_a] || '⚪';
  const emojiB = TEAM_EMOJI[m.team_b] || '⚪';
  const wt = m.weightage && m.weightage !== 1 ? `  ⚖️ *${m.weightage}x*` : '';

  let text = '';

  if (m.status === 'open') {
    text += `🟢 *BIDDING OPEN*\n`;
  } else if (m.status === 'closed') {
    text += `🔴 *BIDDING CLOSED*\n`;
  } else if (m.status === 'upcoming') {
    text += `⏳ *COMING UP*\n`;
  } else {
    text += `✅ *SETTLED*\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `${emojiA}  *${m.team_a}*   🆚   *${m.team_b}*  ${emojiB}\n`;
  text += `📅 ${dateStr}${wt}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (bids.length > 0) {
    text += `📊 *ODDS*\n\n`;
    text += `${emojiA} ${m.team_a}  *${odds.teamA.odds}%*\n`;
    text += `${makeBar(parseFloat(odds.teamA.odds))}\n`;
    text += `${odds.teamA.bids} bids → payout *${odds.teamA.payout}x*\n\n`;
    text += `${emojiB} ${m.team_b}  *${odds.teamB.odds}%*\n`;
    text += `${makeBar(parseFloat(odds.teamB.odds))}\n`;
    text += `${odds.teamB.bids} bids → payout *${odds.teamB.payout}x*\n\n`;
  } else {
    text += `📊 *ODDS*\n\n`;
    text += `No bids yet — be the first! 🎯\n\n`;
  }

  text += `💰 Pool: *$${odds.totalPool}*  │  👥 Bettors: *${bids.length}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;

  if (m.status === 'open') {
    text += `\n👉 *!bid ${m.team_a}* or *!bid ${m.team_b}*`;
  } else if (m.status === 'upcoming') {
    text += `\n⏳ Bidding opens soon...`;
  } else if (m.status === 'closed') {
    text += `\n🔒 Waiting for result...`;
  } else if (m.status === 'settled') {
    text += `\n🏆 Winner: *${m.winner}*`;
  }

  return text;
};
