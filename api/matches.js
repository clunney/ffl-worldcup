// api/matches.js — Serves match data from Supabase cache
// Cache is populated by cron-refresh.js every 5 minutes
// Falls back to direct fetch if cache is empty (first load / cold start)

import { createClient } from "@supabase/supabase-js";

const FOOTBALL_KEY = process.env.FOOTBALL_DATA_API_KEY || "cd7e468eee4c402f9a0bddab07599b0c";
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const ANON_KEY     = process.env.REACT_APP_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Try Supabase cache first
  if (SUPABASE_URL && ANON_KEY) {
    try {
      const sb = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: cached } = await sb
        .from("api_cache")
        .select("data, fetched_at, ttl_seconds")
        .eq("key", "matches")
        .single();

      if (cached) {
        const ageSeconds = (Date.now() - new Date(cached.fetched_at).getTime()) / 1000;
        const isStale = ageSeconds > cached.ttl_seconds;

        // Serve from cache even if slightly stale — cron will refresh it
        // Only bypass cache if it's more than 10 minutes old (cron might be down)
        if (ageSeconds < 600) {
          res.setHeader("X-Cache", isStale ? "STALE" : "HIT");
          res.setHeader("X-Cache-Age", Math.round(ageSeconds));
          res.setHeader("Cache-Control", "no-store"); // don't CDN-cache — serve fresh from Supabase
          return res.status(200).json(cached.data);
        }
      }
    } catch (e) {
      console.warn("Cache read failed, falling back to direct fetch:", e.message);
    }
  }

  // Fallback: direct fetch from football-data.org
  // This only runs on cold start or if Supabase is unreachable
  try {
    const r = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": FOOTBALL_KEY },
    });

    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
