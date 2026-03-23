function calculateOdds(bids, teamA, teamB) {
  const bidsA = bids.filter((b) => b.team_chosen === teamA).length;
  const bidsB = bids.filter((b) => b.team_chosen === teamB).length;
  const total = bidsA + bidsB;

  if (total === 0) {
    return {
      teamA: { bids: 0, odds: 50, payout: 2.0 },
      teamB: { bids: 0, odds: 50, payout: 2.0 },
      totalPool: 0,
    };
  }

  const oddsA = ((bidsA / total) * 100).toFixed(1);
  const oddsB = ((bidsB / total) * 100).toFixed(1);
  const payoutA = bidsA > 0 ? (total / bidsA).toFixed(2) : '-.--';
  const payoutB = bidsB > 0 ? (total / bidsB).toFixed(2) : '-.--';

  return {
    teamA: { bids: bidsA, odds: oddsA, payout: payoutA },
    teamB: { bids: bidsB, odds: oddsB, payout: payoutB },
    totalPool: total,
  };
}

function calculatePayouts(bids, winningTeam, weightage = 1.0) {
  const winningBids = bids.filter((b) => b.team_chosen === winningTeam);
  const totalPool = bids.length; // $1 per bid
  const totalWinningBids = winningBids.length;

  if (totalWinningBids === 0) return [];

  return winningBids.map((b) => ({
    phone: b.user_phone,
    displayName: b.profiles?.display_name || b.user_phone,
    payout: parseFloat(((totalPool / totalWinningBids) * weightage).toFixed(2)),
  }));
}

module.exports = { calculateOdds, calculatePayouts };
