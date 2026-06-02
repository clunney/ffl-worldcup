// api/brackets.js
// Secure server-side endpoint for bracket data.
// Strips pick data (group_picks, wildcard_picks, knockout_picks) from OTHER users
// until picks_visible=true in actual_results. Users always see their own full bracket.
// Frontend calls this instead of querying Supabase directly.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESULTS_ROW  = "00000000-0000-0000-0000-000000000001";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Require a valid Supabase JWT from the frontend
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the token by fetching the user
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Invalid token" });

  const pool_id = req.query.pool_id;
  if (!pool_id) return res.status(400).json({ error: "pool_id required" });

  // Verify user is a member of this pool
  const { data: membership } = await admin
    .from("pool_members")
    .select("role")
    .eq("pool_id", pool_id)
    .eq("user_id", user.id)
    .single();

  const isAdmin = user.email === "clunney22@gmail.com";
  if (!membership && !isAdmin) {
    return res.status(403).json({ error: "Not a member of this pool" });
  }

  // Check if picks are visible
  const { data: results } = await admin
    .from("actual_results")
    .select("picks_visible, tournament_locked")
    .eq("id", RESULTS_ROW)
    .single();

  const picksVisible = results?.picks_visible || false;

  // Fetch brackets
  const { data: brackets, error } = await admin
    .from("brackets")
    .select("id,user_id,display_name,bracket_name,champion_goal_diff_pick,pool_id," +
            (picksVisible || isAdmin
              ? "group_picks,wildcard_picks,wildcard_ranking,knockout_picks"
              : ""))
    .eq("pool_id", pool_id);

  if (error) return res.status(500).json({ error: error.message });

  // Strip pick data from other users when pre-lock
  const safeBrackets = brackets.map(b => {
    if (picksVisible || isAdmin || b.user_id === user.id) return b;
    // Pre-lock: return metadata only, no picks
    return {
      id:           b.id,
      user_id:      b.user_id,
      pool_id:      b.pool_id,
      display_name: b.display_name,
      bracket_name: b.bracket_name,
      // Indicate completion status without exposing picks
      is_complete:  false, // don't leak this either pre-lock
      group_picks:      null,
      wildcard_picks:   null,
      wildcard_ranking: null,
      knockout_picks:   null,
      champion_goal_diff_pick: null,
    };
  });

  return res.status(200).json({
    brackets: safeBrackets,
    picks_visible: picksVisible,
    tournament_locked: results?.tournament_locked || false,
  });
}
