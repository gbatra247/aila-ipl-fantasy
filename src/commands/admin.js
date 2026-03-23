const db = require('../db');
const { calculateOdds, calculatePayouts } = require('../odds');

async function requireAdmin(userPhone) {
  const admin = await db.isAdmin(userPhone);
  if (!admin) return '❌ Admin access required.';
  return null;
}

// !open [matchId] - Open bidding for next upcoming match or a specific match
async function open({ userPhone, args }) {
  const denied = await requireAdmin(userPhone);
  if (denied) return denied;

  let match;
  if (args[0] && /^\d+$/.test(args[0])) {
    match = await db.getMatchById(parseInt(args[0]));
    if (!match) return `❌ Match #${args[0]} not found.`;
    if (match.status !== 'upcoming') return `⚠️ Match #${match.id} is already *${match.status}*.`;
  } else {
    match = await db.getNextUpcomingMatch();
    if (!match) return '❌ No upcoming matches to open.';
  }

  await db.updateMatchStatus(match.id, 'open');
  const date = new Date(match.match_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return `🟢 *BIDDING OPEN!*\n━━━━━━━━━━━━━━━━━━━━\n🏏 *${match.team_a} vs ${match.team_b}*\n📅 ${date}  │  Match #${match.id}\n━━━━━━━━━━━━━━━━━━━━\n\nPlace your bids! *!bid ${match.team_a}* or *!bid ${match.team_b}*`;
}

// !close [matchId] - Close bidding for a specific match or the oldest open match
async function close({ userPhone, args }) {
  const denied = await requireAdmin(userPhone);
  if (denied) return denied;

  let match;
  if (args[0] && /^\d+$/.test(args[0])) {
    match = await db.getMatchById(parseInt(args[0]));
    if (!match || match.status !== 'open') return `❌ Match #${args[0]} is not open.`;
  } else {
    const openMatches = await db.getOpenMatches();
    if (openMatches.length === 0) return '❌ No matches are currently open.';
    if (openMatches.length > 1) {
      let text = '⚠️ Multiple matches open. Specify which:\n\n';
      openMatches.forEach(m => {
        text += `  *!close ${m.id}* — ${m.team_a} vs ${m.team_b}\n`;
      });
      return text;
    }
    match = openMatches[0];
  }

  await db.updateMatchStatus(match.id, 'closed');
  const bids = await db.getMatchBids(match.id);
  const odds = calculateOdds(bids, match.team_a, match.team_b);

  return `🔴 *BIDDING CLOSED!*\n━━━━━━━━━━━━━━━━━━━━\n🏏 *${match.team_a} vs ${match.team_b}*  │  #${match.id}\n\n${match.team_a}: ${odds.teamA.odds}% (${odds.teamA.bids} bids)\n${match.team_b}: ${odds.teamB.odds}% (${odds.teamB.bids} bids)\n💰 Pool: *$${odds.totalPool}*  👥 ${bids.length}\n━━━━━━━━━━━━━━━━━━━━\nGood luck everyone! 🤞`;
}

// !winner [matchId] <team> - Declare winner
async function winner({ userPhone, args }) {
  const denied = await requireAdmin(userPhone);
  if (denied) return denied;

  if (!args[0]) {
    return '❌ Usage: *!winner <team>* or *!winner <matchId> <team>*';
  }

  let match;
  let winningTeam;

  // Check if first arg is match ID
  if (args.length >= 2 && /^\d+$/.test(args[0])) {
    match = await db.getMatchById(parseInt(args[0]));
    winningTeam = args[1].toUpperCase();
    if (!match) return `❌ Match #${args[0]} not found.`;
  } else {
    winningTeam = args[0].toUpperCase();
    const activeMatches = await db.getActiveMatches();
    if (activeMatches.length === 0) return '❌ No active match to settle.';

    // Find the match with this team
    const matching = activeMatches.filter(
      m => m.team_a === winningTeam || m.team_b === winningTeam
    );
    if (matching.length === 1) {
      match = matching[0];
    } else if (matching.length > 1) {
      let text = `⚠️ Multiple matches with *${winningTeam}*:\n\n`;
      matching.forEach(m => {
        text += `  *!winner ${m.id} ${winningTeam}* — ${m.team_a} vs ${m.team_b}\n`;
      });
      return text;
    } else {
      return `❌ No active match has team *${winningTeam}*.`;
    }
  }

  if (winningTeam !== match.team_a && winningTeam !== match.team_b) {
    return `❌ Choose *${match.team_a}* or *${match.team_b}*`;
  }

  const bids = await db.getMatchBids(match.id);
  const payouts = calculatePayouts(bids, winningTeam, match.weightage || 1.0);

  for (const p of payouts) {
    await db.updateBalance(p.phone, p.payout);
  }

  await db.setMatchWinner(match.id, winningTeam);

  let text = `🏆 *${winningTeam} WINS!*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏏 ${match.team_a} vs ${match.team_b}  │  #${match.id}\n`;
  text += `💰 Pool: $${bids.length}`;
  text += match.weightage && match.weightage !== 1 ? ` (${match.weightage}x)\n` : '\n';
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

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

// !addmatch <TeamA> vs <TeamB> <YYYY-MM-DD> [weightage]
async function addmatch({ userPhone, args }) {
  const denied = await requireAdmin(userPhone);
  if (denied) return denied;

  const raw = args.join(' ');
  const vsMatch = raw.match(/^(\w+)\s+vs\s+(\w+)\s+(\d{4}-\d{2}-\d{2})(?:\s+([\d.]+))?$/i);
  if (!vsMatch) {
    return '❌ Usage: *!addmatch TeamA vs TeamB YYYY-MM-DD [weightage]*\nExample: !addmatch CSK vs MI 2026-03-27 1.5';
  }

  const teamA = vsMatch[1].toUpperCase();
  const teamB = vsMatch[2].toUpperCase();
  const matchDate = vsMatch[3];
  const weightage = parseFloat(vsMatch[4]) || 1.0;

  try {
    const match = await db.addMatch(teamA, teamB, matchDate, weightage);
    const date = new Date(matchDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    return `✅ Match added!\n\n🏏 *${teamA} vs ${teamB}*\n📅 ${date}\n⚖️ Weightage: ${weightage}x\n🆔 Match #${match.id}`;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

// !deletematch <id>
async function deletematch({ userPhone, args }) {
  const denied = await requireAdmin(userPhone);
  if (denied) return denied;

  const matchId = parseInt(args[0]);
  if (!matchId) {
    return '❌ Usage: *!deletematch <match_id>*\nUse !schedule to see IDs.';
  }

  try {
    const match = await db.deleteMatch(matchId);
    return `🗑️ Deleted match #${matchId}: *${match.team_a} vs ${match.team_b}*`;
  } catch (err) {
    return `❌ Match #${matchId} not found.`;
  }
}

// !schedule - Show upcoming matches (available to ALL players)
async function schedule() {
  const matches = await db.getUpcomingMatches(15);
  if (matches.length === 0) {
    return '📅 No upcoming matches.';
  }

  let text = `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📅 *MATCH SCHEDULE*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  matches.forEach((m) => {
    const date = new Date(m.match_date).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
    const statusIcon = { upcoming: '⬜', open: '🟢', closed: '🔴' };
    const wt = m.weightage && m.weightage !== 1 ? ` ⚖️${m.weightage}x` : '';
    text += `${statusIcon[m.status] || '⬜'} #${m.id} ${date}: *${m.team_a} vs ${m.team_b}*${wt}\n`;
  });

  text += `\n━━━━━━━━━━━━━━━━━━━━`;
  return text;
}

// !status [matchId] - Show match betting stats (admin only)
async function status({ userPhone, args }) {
  const denied = await requireAdmin(userPhone);
  if (denied) return denied;

  let matches;
  if (args[0] && /^\d+$/.test(args[0])) {
    const m = await db.getMatchById(parseInt(args[0]));
    matches = m ? [m] : [];
  } else {
    matches = await db.getActiveMatches();
  }

  if (matches.length === 0) return '❌ No active matches.';

  let text = `📊 *MATCH STATS*\n━━━━━━━━━━━━━━━━━━━━\n`;

  for (const match of matches) {
    const bids = await db.getMatchBids(match.id);
    const odds = calculateOdds(bids, match.team_a, match.team_b);

    text += `\n🏏 #${match.id} ${match.team_a} vs ${match.team_b} [${match.status.toUpperCase()}]\n`;
    text += `${match.team_a}: ${odds.teamA.bids} bids (${odds.teamA.odds}%)\n`;
    text += `${match.team_b}: ${odds.teamB.bids} bids (${odds.teamB.odds}%)\n`;
    text += `💰 $${odds.totalPool}  👥 ${bids.length}\n`;

    if (bids.length > 0) {
      text += `Bids: `;
      text += bids.map(b => `${b.profiles?.display_name || b.user_phone}→${b.team_chosen}`).join(', ');
      text += `\n`;
    }
  }

  text += `━━━━━━━━━━━━━━━━━━━━`;
  return text;
}

// !reset - Wipe everything and start fresh
async function reset({ userPhone, args }) {
  const denied = await requireAdmin(userPhone);
  if (denied) return denied;

  if (args[0] !== 'CONFIRM') {
    return `⚠️ This will delete ALL matches, bids, and players!\n\nType *!reset CONFIRM* to proceed.`;
  }

  await db.resetAll();
  return `🔄 *FULL RESET COMPLETE*\n━━━━━━━━━━━━━━━━━━━━\nAll matches, bids, and players wiped.\nMatch IDs reset to 1.\n\nEveryone needs to *!register* again.`;
}

module.exports = { open, close, winner, schedule, status, addmatch, deletematch, reset };
