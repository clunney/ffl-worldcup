// api/matches.js — Vercel serverless function
// Proxies football-data.org so the API key stays server-side
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const key = process.env.FOOTBALL_DATA_API_KEY || "cd7e468eee4c402f9a0bddab07599b0c";
  const { endpoint = "matches" } = req.query;

  const urls = {
    matches: "https://api.football-data.org/v4/competitions/WC/matches",
    standings: "https://api.football-data.org/v4/competitions/WC/standings",
  };

  const url = urls[endpoint] || urls.matches;

  try {
    const r = await fetch(url, { headers: { "X-Auth-Token": key } });
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }
    const data = await r.json();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
