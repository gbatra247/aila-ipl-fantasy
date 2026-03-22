const { getUser, getActiveMatch, placeBid, getUserBid, updateBalance } = require('../db');

module.exports = async function bid({ userPhone, args }) {
  const teamArg = args[0]?.toUpperCase();
  if (!teamArg) {
    return '❌ Usage: !bid <team>\nExample: !bid CSK';
  }

  const user = await getUser(userPhone);
  if (!user) {
    return '❌ You need to register first! Type *!register <your name>*';
  }

  const match = await getActiveMatch();
  if (!match) {
    return '❌ No match is currently open for bidding.';
  }

  if (match.status !== 'open') {
    return '🔒 Bidding is closed for this match.';
  }

  // Validate team name
  if (teamArg !== match.team_a && teamArg !== match.team_b) {
    return `❌ Invalid team. Choose *${match.team_a}* or *${match.team_b}*`;
  }

  // Check if user already bid (for balance logic)
  const existingBid = await getUserBid(userPhone, match.id);

  if (existingBid) {
    if (existingBid.team_chosen === teamArg) {
      return `You've already bid on *${teamArg}*! Use !match to see odds.`;
    }
    // Changing bid - no balance change needed (already deducted $1)
    await placeBid(userPhone, match.id, teamArg);
    return `🔄 Bid changed to *${teamArg}*! Good luck!`;
  }

  // New bid - check balance
  if (parseFloat(user.balance) < 1) {
    return '❌ Insufficient balance! You need at least $1 to bid.';
  }

  // Deduct $1 and place bid
  await updateBalance(userPhone, -1);
  await placeBid(userPhone, match.id, teamArg);

  return `✅ Bid placed on *${teamArg}*!\n\n💰 $1 deducted. New balance: *$${(parseFloat(user.balance) - 1).toFixed(2)}*\n\nYou can change your bid anytime before bidding closes. Type *!match* to see live odds.`;
};
