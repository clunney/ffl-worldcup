// api/odds.js — Vercel serverless function — The Odds API proxy
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const key = process.env.ODDS_API_KEY;
  if (!key) return res.status(500).json({ error: "ODDS_API_KEY not set" });

  try {
    const url = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${key}&regions=us&markets=h2h&oddsFormat=american`;
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    // Cache for 4 hours on Vercel CDN
    res.setHeader("Cache-Control", "s-maxage=14400, stale-while-revalidate=3600");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
