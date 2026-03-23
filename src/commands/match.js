const { getActiveMatches, getNextMatch, getMatchBids } = require('../db');
const { calculateOdds } = require('../odds');

const TEAM_EMOJI = {
  CSK: '💛', MI: '💙', RCB: '❤️', KKR: '💜', SRH: '🧡',
  DC: '💙', RR: '💗', PBKS: '🔴', GT: '🩵', LSG: '💚',
};

function makeBar(pct, len = 10) {
  const filled = Math.round((pct / 100) * len);
  return '▓'.repeat(filled) + '░'.repeat(len - filled);
}

function formatMatch(m, bids, odds) {
  const dateStr = new Date(m.match_date).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  const emojiA = TEAM_EMOJI[m.team_a] || '⚪';
  const emojiB = TEAM_EMOJI[m.team_b] || '⚪';
  const wt = m.weightage && m.weightage !== 1 ? ` ⚖️${m.weightage}x` : '';

  let text = '';

  if (m.status === 'open') {
    text += `🟢 *OPEN* ─ Match #${m.id}\n`;
  } else if (m.status === 'closed') {
    text += `🔴 *CLOSED* ─ Match #${m.id}\n`;
  } else if (m.status === 'upcoming') {
    text += `⏳ *UPCOMING* ─ Match #${m.id}\n`;
  } else {
    text += `✅ *SETTLED* ─ Match #${m.id}\n`;
  }

  text += `${emojiA} *${m.team_a}*  🆚  *${m.team_b}* ${emojiB}\n`;
  text += `📅 ${dateStr}${wt}\n`;

  if (bids.length > 0) {
    text += `\n${emojiA} ${m.team_a} *${odds.teamA.odds}%* ${makeBar(parseFloat(odds.teamA.odds))} ${odds.teamA.payout}x\n`;
    text += `${emojiB} ${m.team_b} *${odds.teamB.odds}%* ${makeBar(parseFloat(odds.teamB.odds))} ${odds.teamB.payout}x\n`;
    text += `💰 Pool: *$${odds.totalPool}*  👥 *${bids.length}*\n`;
  } else {
    text += `\nNo bids yet 🎯\n`;
  }

  if (m.status === 'open') {
    text += `👉 *!bid ${m.id} ${m.team_a}* or *!bid ${m.id} ${m.team_b}*\n`;
  } else if (m.status === 'closed') {
    text += `🔒 Waiting for result...\n`;
  } else if (m.status === 'settled') {
    text += `🏆 Winner: *${m.winner}*\n`;
  }

  return text;
}

module.exports = async function match() {
  const activeMatches = await getActiveMatches();

  // If no active matches, show next upcoming
  if (activeMatches.length === 0) {
    const next = await getNextMatch();
    if (!next) return '📅 No upcoming matches found!';

    const bids = await getMatchBids(next.id);
    const odds = calculateOdds(bids, next.team_a, next.team_b);

    let text = `━━━━━━━━━━━━━━━━━━━━\n`;
    text += formatMatch(next, bids, odds);
    text += `━━━━━━━━━━━━━━━━━━━━`;
    return text;
  }

  // Show all active matches
  let text = `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏏 *ACTIVE MATCHES*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;

  for (const m of activeMatches) {
    const bids = await getMatchBids(m.id);
    const odds = calculateOdds(bids, m.team_a, m.team_b);
    text += `\n` + formatMatch(m, bids, odds);
  }

  text += `━━━━━━━━━━━━━━━━━━━━`;

  return text;
};
