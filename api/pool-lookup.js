// api/pool-lookup.js
// Public endpoint: looks up a pool by join code.
// No auth required — the code itself is the invite token.
// Returns only safe metadata (no member data, no picks).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { code } = req.query;
  if (!code || code.length < 3) {
    return res.status(400).json({ error: "code required" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: pool, error } = await admin
    .from("pools")
    .select("id, name, code, invite_expires_at, password")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !pool) {
    return res.status(404).json({ error: "Pool not found" });
  }

  // Return safe metadata — never expose the actual password value
  return res.status(200).json({
    id:               pool.id,
    name:             pool.name,
    code:             pool.code,
    has_password:     !!pool.password,
    invite_expires_at: pool.invite_expires_at,
  });
}
