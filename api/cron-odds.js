// api/cron-odds.js
// Vercel cron: runs every 4 hours
// Max ~180 calls/month during tournament — well under 500 free tier limit
// All users read from Supabase cache — never hit The Odds API per-request

import { createClient } from "@supabase/supabase-js";

const ODDS_KEY     = process.env.ODDS_API_KEY;
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TOURNAMENT_START = new Date("2026-06-11T00:00:00Z");
const TOURNAMENT_END   = new Date("2026-07-20T00:00:00Z");

export default async function handler(req, res) {
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  if (now < TOURNAMENT_START || now > TOURNAMENT_END) {
    return res.status(200).json({ skipped: true, reason: "Outside tournament window" });
  }

  if (!ODDS_KEY) {
    return res.status(200).json({ skipped: true, reason: "ODDS_API_KEY not set" });
  }

  try {
    const url = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${ODDS_KEY}&regions=us&markets=h2h&oddsFormat=american`;
    const r = await fetch(url);

    // Log remaining quota from headers
    const remaining = r.headers.get("x-requests-remaining");
    const used      = r.headers.get("x-requests-used");
    console.log(`Odds API quota — used: ${used}, remaining: ${remaining}`);

    if (!r.ok) {
      const err = await r.text();
      console.error("Odds API error:", r.status, err);
      return res.status(200).json({ error: `odds-api: ${r.status}` });
    }

    const data = await r.json();

    if (SUPABASE_URL && SERVICE_KEY) {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { error } = await admin.from("api_cache").upsert({
        key: "odds",
        data: Array.isArray(data) ? data : [],
        fetched_at: new Date().toISOString(),
        ttl_seconds: 14400, // 4 hours
      });

      if (error) console.error("Odds cache write failed:", error.message);
    }

    return res.status(200).json({
      ok: true,
      matchCount: Array.isArray(data) ? data.length : 0,
      quotaRemaining: remaining,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("cron-odds error:", e.message);
    return res.status(200).json({ error: e.message });
  }
}
