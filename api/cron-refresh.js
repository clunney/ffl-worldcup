// api/cron-refresh.js
// Vercel cron: runs every 5 minutes
// Fetches football-data.org and stores in Supabase cache
// All users read from cache — never hits football-data directly per-request

import { createClient } from "@supabase/supabase-js";

const FOOTBALL_KEY = process.env.FOOTBALL_DATA_API_KEY || "cd7e468eee4c402f9a0bddab07599b0c";
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only run during tournament window (June 11 – July 19 2026)
// Outside this window, skip to save API quota
const TOURNAMENT_START = new Date("2026-06-11T00:00:00Z");
const TOURNAMENT_END   = new Date("2026-07-20T00:00:00Z");

export default async function handler(req, res) {
  // Verify this is a legitimate Vercel cron call
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();

  // Skip outside tournament window — saves quota
  if (now < TOURNAMENT_START || now > TOURNAMENT_END) {
    return res.status(200).json({ skipped: true, reason: "Outside tournament window" });
  }

  // Run all day during tournament - matches can be any time, 12pm-midnight ET
  // No time-based skip during tournament window

  try {
    // Fetch from football-data.org
    const r = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": FOOTBALL_KEY },
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("football-data fetch failed:", r.status, err);
      return res.status(200).json({ error: `football-data: ${r.status}` });
    }

    const data = await r.json();

    // Write to Supabase cache
    if (SUPABASE_URL && SERVICE_KEY) {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { error } = await admin.from("api_cache").upsert({
        key: "matches",
        data: data,
        fetched_at: new Date().toISOString(),
        ttl_seconds: 60,
      });

      if (error) console.error("Cache write failed:", error.message);
    }

    // Auto-lock picks and show brackets when first match goes live
    const liveOrFinished = (data.matches || []).filter(
      m => ["IN_PLAY","PAUSED","HALFTIME","FINISHED"].includes(m.status)
    );

    if (liveOrFinished.length > 0 && SUPABASE_URL && SERVICE_KEY) {
      // Check current state first to avoid unnecessary writes
      const { data: current } = await admin
        .from("actual_results")
        .select("tournament_locked, picks_visible")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();

      if (!current?.tournament_locked || !current?.picks_visible) {
        const { error: lockErr } = await admin
          .from("actual_results")
          .update({ tournament_locked: true, picks_visible: true })
          .eq("id", "00000000-0000-0000-0000-000000000001");

        if (lockErr) console.error("Auto-lock failed:", lockErr.message);
        else console.log("Auto-locked and made picks visible — first match is live.");
      }
    }

    return res.status(200).json({
      ok: true,
      matchCount: data.matches?.length || 0,
      liveCount: liveOrFinished.length,
      autoLocked: liveOrFinished.length > 0,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("cron-refresh error:", e.message);
    return res.status(200).json({ error: e.message }); // 200 so Vercel doesn't retry aggressively
  }
}
