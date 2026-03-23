module.exports = async function help() {
  return `🏏 *AIla IPL Fantasy Game* 🏏

*Commands:*
!register <name> - Sign up with your name
!match - See today's match & live odds
!bid <team> - Place your $1 bid
!balance - Check your balance
!leaderboard - Top players
!help - This message

*Admin Commands:*
!addmatch <A> vs <B> <date> [wt] - Add match
!deletematch <id> - Remove match
!open - Open bidding
!close - Close bidding
!winner <team> - Declare winner & payout
!schedule - Upcoming matches
!status - Current match stats`;
};
