const db = require('../db');
const { calculateOdds, calculatePayouts } = require('../odds');

async function requireAdmin(userPhone) {
  const admin = await db.isAdmin(userPhone);
  if (!admin) return '❌ Admin access required.';
  return null;
}

// !open - Open bidding for the next upcoming match
async function open({ userPhone }) {
  const denied = await requireAdmin(userPhone);
  if (denied) return denied;

  // Check if there's already an open match
  const active = await db.getActiveMatch();
  if (active && active.status === 'open') {
    return `⚠️ Bidding is already open for *${active.team_a} vs ${active.team_b}*.\nClose it first with !close`;
  }

  const match = await db.getNextMatch();
  if (!match) {
    return '❌ No upcoming matches to open.';
  }

  await db.updateMatchStatus(match.id, 'open');

  return `🟢 *BIDDING IS OPEN!*\n\n🏏 *${match.team_a} vs ${match.team_b}*\n📅 ${new Date(match.match_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}\n\nPlace your bids now! Type *!bid ${match.team_a}* or *!bid ${match.team_b}*`;
}

// !close - Close bidding for current match
async function close({ userPhone }) {
  const denied = await requireAdmin(userPhone);
  if (denied) return denied;

  const match = await db.getActiveMatch();
  if (!match || match.status !== 'open') {
    return '❌ No match is currently open for bidding.';
  }

  await db.updateMatchStatus(match.id, 'closed');

  const bids = await db.getMatchBids(match.id);
  const odds = calculateOdds(bids, match.team_a, match.team_b);

  return `🔴 *BIDDING CLOSED!*\n\n🏏 *${match.team_a} vs ${match.team_b}*\n\n📊 Final Odds:\n${match.team_a}: ${odds.teamA.odds}% (${odds.teamA.bids} bids)\n${match.team_b}: ${odds.teamB.odds}% (${odds.teamB.bids} bids)\n\n💰 Total Pool: *$${odds.totalPool}*\n👥 Total Bettors: ${bids.length}\n\nGood luck everyone! 🤞`;
}

// !winner <team> - Declare winner and trigger payouts
async function winner({ userPhone, args }) {
  const denied = await requireAdmin(userPhone);
  if (denied) return denied;

  const winningTeam = args[0]?.toUpperCase();
  if (!winningTeam) {
    return '❌ Usage: !winner <team>\nExample: !winner CSK';
  }

  const match = await db.getActiveMatch();
  if (!match) {
    return '❌ No active match to settle.';
  }

  if (winningTeam !== match.team_a && winningTeam !== match.team_b) {
    return `❌ Invalid team. Choose *${match.team_a}* or *${match.team_b}*`;
  }

  // Get all bids and calculate payouts
  const bids = await db.getMatchBids(match.id);
  const payouts = calculatePayouts(bids, winningTeam);

  // Credit winnings to each winner
  for (const p of payouts) {
    await db.updateBalance(p.phone, p.payout);
  }

  // Mark match as settled
  await db.setMatchWinner(match.id, winningTeam);

  // Build result message
  let text = `🏆 *${winningTeam} WINS!*\n\n`;
  text += `🏏 ${match.team_a} vs ${match.team_b}\n`;
  text += `💰 Total Pool: $${bids.length}\n\n`;

  if (payouts.length > 0) {
    text += `*Winners:*\n`;
    payouts.forEach((p) => {
      text += `  💸 ${p.displayName}: +$${p.payout.toFixed(2)}\n`;
    });
  } else {
    text += `😱 No one bet on ${winningTeam}! Pool is lost.\n`;
  }

  const losers = bids.filter((b) => b.team_chosen !== winningTeam);
  if (losers.length > 0) {
    text += `\n*Better luck next time:*\n`;
    losers.forEach((b) => {
      text += `  😢 ${b.profiles?.display_name || b.user_phone}\n`;
    });
  }

  text += `\nType *!leaderboard* to see standings!`;

  return text;
}

// !schedule - Show upcoming matches
async function schedule({ userPhone }) {
  const denied = await requireAdmin(userPhone);
  if (denied) return denied;

  const matches = await db.getUpcomingMatches(10);
  if (matches.length === 0) {
    return '📅 No upcoming matches.';
  }

  let text = '📅 *Upcoming Matches*\n\n';
  matches.forEach((m) => {
    const date = new Date(m.match_date).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const statusIcon = { upcoming: '⬜', open: '🟢', closed: '🔴' };
    text += `${statusIcon[m.status] || '⬜'} ${date}: *${m.team_a} vs ${m.team_b}*\n`;
  });

  return text;
}

// !status - Show current match betting stats
async function status({ userPhone }) {
  const denied = await requireAdmin(userPhone);
  if (denied) return denied;

  const match = await db.getActiveMatch();
  if (!match) {
    return '❌ No active match.';
  }

  const bids = await db.getMatchBids(match.id);
  const odds = calculateOdds(bids, match.team_a, match.team_b);

  let text = `📊 *Match Stats*\n\n`;
  text += `🏏 ${match.team_a} vs ${match.team_b}\n`;
  text += `Status: ${match.status.toUpperCase()}\n\n`;
  text += `${match.team_a}: ${odds.teamA.bids} bids (${odds.teamA.odds}%)\n`;
  text += `${match.team_b}: ${odds.teamB.bids} bids (${odds.teamB.odds}%)\n\n`;
  text += `💰 Pool: $${odds.totalPool}\n`;
  text += `👥 Bettors: ${bids.length}\n\n`;

  if (bids.length > 0) {
    text += `*All Bids:*\n`;
    bids.forEach((b) => {
      text += `  ${b.profiles?.display_name || b.user_phone} → ${b.team_chosen}\n`;
    });
  }

  return text;
}

module.exports = { open, close, winner, schedule, status };
