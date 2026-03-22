const { getActiveMatch, getNextMatch, getMatchBids } = require('../db');
const { calculateOdds } = require('../odds');

const TEAM_NAMES = {
  CSK: 'Chennai Super Kings',
  MI: 'Mumbai Indians',
  RCB: 'Royal Challengers Bengaluru',
  KKR: 'Kolkata Knight Riders',
  SRH: 'Sunrisers Hyderabad',
  DC: 'Delhi Capitals',
  RR: 'Rajasthan Royals',
  PBKS: 'Punjab Kings',
  GT: 'Gujarat Titans',
  LSG: 'Lucknow Super Giants',
};

module.exports = async function match() {
  // First check for an active (open/closed) match
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
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const statusEmoji = {
    upcoming: '📅',
    open: '🟢',
    closed: '🔴',
    settled: '✅',
  };

  const nameA = TEAM_NAMES[m.team_a] || m.team_a;
  const nameB = TEAM_NAMES[m.team_b] || m.team_b;

  let text = `${statusEmoji[m.status]} *${m.team_a} vs ${m.team_b}*\n`;
  text += `${dateStr}\n\n`;

  text += `📊 *Live Odds*\n`;
  text += `┌─────────────────────┐\n`;
  text += `│ ${m.team_a}: ${odds.teamA.odds}% │ ${odds.teamA.payout}x\n`;
  text += `│ ${m.team_b}: ${odds.teamB.odds}% │ ${odds.teamB.payout}x\n`;
  text += `└─────────────────────┘\n\n`;

  text += `💰 Total Pool: *$${odds.totalPool}*\n`;
  text += `👥 Bettors: ${bids.length}\n\n`;

  if (m.status === 'open') {
    text += `Type *!bid ${m.team_a}* or *!bid ${m.team_b}* to place your bet!`;
  } else if (m.status === 'upcoming') {
    text += `⏳ Bidding not open yet. Admin will open it soon!`;
  } else if (m.status === 'closed') {
    text += `🔒 Bidding is closed. Waiting for result...`;
  } else if (m.status === 'settled') {
    text += `🏆 Winner: *${m.winner}*`;
  }

  return text;
};
