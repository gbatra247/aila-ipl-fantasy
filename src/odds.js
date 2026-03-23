function calculateOdds(bids, teamA, teamB, totalPlayers) {
  const bidsA = bids.filter((b) => b.team_chosen === teamA).length;
  const bidsB = bids.filter((b) => b.team_chosen === teamB).length;
  const totalBids = bidsA + bidsB;
  // Pool = all charged players (if provided), otherwise just bidders
  const pool = totalPlayers || totalBids;

  if (totalBids === 0) {
    return {
      teamA: { bids: 0, odds: 50, payout: 2.0 },
      teamB: { bids: 0, odds: 50, payout: 2.0 },
      totalPool: pool,
    };
  }

  const oddsA = ((bidsA / totalBids) * 100).toFixed(1);
  const oddsB = ((bidsB / totalBids) * 100).toFixed(1);
  const payoutA = bidsA > 0 ? (pool / bidsA).toFixed(2) : '-.--';
  const payoutB = bidsB > 0 ? (pool / bidsB).toFixed(2) : '-.--';

  return {
    teamA: { bids: bidsA, odds: oddsA, payout: payoutA },
    teamB: { bids: bidsB, odds: oddsB, payout: payoutB },
    totalPool: pool,
  };
}

// totalPool = total players charged (not just bidders)
function calculatePayouts(bids, winningTeam, weightage = 1.0, totalPool) {
  const winningBids = bids.filter((b) => b.team_chosen === winningTeam);
  const pool = totalPool || bids.length;
  const totalWinningBids = winningBids.length;

  if (totalWinningBids === 0) return [];

  return winningBids.map((b) => ({
    phone: b.user_phone,
    displayName: b.profiles?.display_name || b.user_phone,
    payout: parseFloat(((pool / totalWinningBids) * weightage).toFixed(2)),
  }));
}

module.exports = { calculateOdds, calculatePayouts };
