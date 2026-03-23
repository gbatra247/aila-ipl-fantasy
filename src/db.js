const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── Profiles ───

async function getUser(phone) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', phone)
    .single();
  return data;
}

async function createUser(phone, displayName) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ phone, display_name: displayName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateBalance(phone, amount) {
  const user = await getUser(phone);
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .update({ balance: parseFloat(user.balance) + amount })
    .eq('phone', phone)
    .select()
    .single();
  return data;
}

async function getAllPlayers() {
  const { data } = await supabase
    .from('profiles')
    .select('*');
  return data || [];
}

// ─── Matches ───

// Get ALL open/closed matches (supports multiple simultaneous)
async function getActiveMatches() {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .in('status', ['open', 'closed'])
    .order('match_date', { ascending: true });
  return data || [];
}

// Get single active match (backward compat)
async function getActiveMatch() {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .in('status', ['open', 'closed'])
    .order('match_date', { ascending: true })
    .limit(1)
    .single();
  return data;
}

// Get all open matches (for bidding)
async function getOpenMatches() {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'open')
    .order('match_date', { ascending: true });
  return data || [];
}

async function getMatchById(matchId) {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();
  return data;
}

async function getTodayMatch() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('match_date', today)
    .limit(1)
    .single();
  return data;
}

async function getNextMatch() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('matches')
    .select('*')
    .gte('match_date', today)
    .in('status', ['upcoming', 'open'])
    .order('match_date', { ascending: true })
    .limit(1)
    .single();
  return data;
}

async function getNextUpcomingMatch() {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'upcoming')
    .order('match_date', { ascending: true })
    .limit(1)
    .single();
  return data;
}

async function updateMatchStatus(matchId, status) {
  const { data } = await supabase
    .from('matches')
    .update({ status })
    .eq('id', matchId)
    .select()
    .single();
  return data;
}

async function setMatchWinner(matchId, winner) {
  const { data } = await supabase
    .from('matches')
    .update({ status: 'settled', winner })
    .eq('id', matchId)
    .select()
    .single();
  return data;
}

async function getUpcomingMatches(limit = 15) {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .neq('status', 'settled')
    .order('match_date', { ascending: true })
    .limit(limit);
  return data || [];
}

// ─── Bids ───

async function placeBid(userPhone, matchId, teamChosen) {
  const { data, error } = await supabase
    .from('bids')
    .upsert(
      { user_phone: userPhone, match_id: matchId, team_chosen: teamChosen },
      { onConflict: 'user_phone,match_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getUserBid(userPhone, matchId) {
  const { data } = await supabase
    .from('bids')
    .select('*')
    .eq('user_phone', userPhone)
    .eq('match_id', matchId)
    .single();
  return data;
}

async function getMatchBids(matchId) {
  const { data } = await supabase
    .from('bids')
    .select('*, profiles(display_name)')
    .eq('match_id', matchId);
  return data || [];
}

// ─── Match Management ───

async function addMatch(teamA, teamB, matchDate, weightage = 1.0) {
  const { data, error } = await supabase
    .from('matches')
    .insert({ team_a: teamA, team_b: teamB, match_date: matchDate, weightage })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteMatch(matchId) {
  await supabase.from('bids').delete().eq('match_id', matchId);
  const { data, error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Reset ───

async function resetAll() {
  await supabase.from('bids').delete().neq('id', 0);
  await supabase.from('matches').delete().neq('id', 0);
  await supabase.from('profiles').delete().neq('phone', '');
}

// ─── Admin ───

async function isAdmin(phone) {
  const admins = (process.env.ADMIN_PHONES || '').split(',').map((p) => p.trim());
  return admins.includes(phone);
}

// ─── Leaderboard ───

async function getLeaderboard(limit = 10) {
  const { data } = await supabase
    .from('profiles')
    .select('display_name, balance')
    .order('balance', { ascending: false })
    .limit(limit);
  return data || [];
}

module.exports = {
  supabase,
  getUser,
  createUser,
  updateBalance,
  getActiveMatch,
  getActiveMatches,
  getOpenMatches,
  getMatchById,
  getTodayMatch,
  getNextMatch,
  getNextUpcomingMatch,
  updateMatchStatus,
  setMatchWinner,
  getUpcomingMatches,
  placeBid,
  getUserBid,
  getMatchBids,
  addMatch,
  deleteMatch,
  isAdmin,
  getLeaderboard,
  resetAll,
  getAllPlayers,
};
