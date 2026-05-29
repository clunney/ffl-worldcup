// api/odds.js — Serves odds from Supabase cache
// Cache populated by cron-odds.js every 4 hours (max ~180 calls/month)

import { createClient } from "@supabase/supabase-js";

const ODDS_KEY     = process.env.ODDS_API_KEY;
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const ANON_KEY     = process.env.REACT_APP_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Serve from Supabase cache
  if (SUPABASE_URL && ANON_KEY) {
    try {
      const sb = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: cached } = await sb
        .from("api_cache")
        .select("data, fetched_at, ttl_seconds")
        .eq("key", "odds")
        .single();

      if (cached) {
        const ageSeconds = (Date.now() - new Date(cached.fetched_at).getTime()) / 1000;
        // Serve cache up to 6 hours old (TTL is 4hrs, give 2hr grace)
        if (ageSeconds < 21600) {
          res.setHeader("X-Cache", "HIT");
          res.setHeader("X-Cache-Age", Math.round(ageSeconds));
          res.setHeader("Cache-Control", "no-store");
          return res.status(200).json(cached.data);
        }
      }
    } catch (e) {
      console.warn("Odds cache read failed:", e.message);
    }
  }

  // Fallback: direct fetch — only if cache is empty (very first run)
  if (!ODDS_KEY) return res.status(200).json([]);

  try {
    const url = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${ODDS_KEY}&regions=us&markets=h2h&oddsFormat=american`;
    const r = await fetch(url);
    if (!r.ok) return res.status(200).json([]); // fail silently — odds are non-critical
    const data = await r.json();
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "s-maxage=14400");
    return res.status(200).json(Array.isArray(data) ? data : []);
  } catch (e) {
    return res.status(200).json([]);
  }
}
