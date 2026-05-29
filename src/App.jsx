// App.jsx — Fairmount Fantasy League · 2026 FIFA World Cup Challenge
// Requires: npm install @supabase/supabase-js
// Requires: src/supabase.js (see supabase.js file)
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";

// ============================================================
// DATA — 2026 FIFA World Cup Groups (draw Dec 5, 2025)
// ============================================================
const WC_GROUPS = {
  A: [{ name:"Mexico",code:"mx"},{ name:"South Africa",code:"za"},{ name:"South Korea",code:"kr"},{ name:"Czechia",code:"cz"}],
  B: [{ name:"Canada",code:"ca"},{ name:"Switzerland",code:"ch"},{ name:"Qatar",code:"qa"},{ name:"Bosnia & Herz.",code:"ba"}],
  C: [{ name:"Brazil",code:"br"},{ name:"Morocco",code:"ma"},{ name:"Haiti",code:"ht"},{ name:"Scotland",code:"gb-sct"}],
  D: [{ name:"USA",code:"us"},{ name:"Paraguay",code:"py"},{ name:"Australia",code:"au"},{ name:"Türkiye",code:"tr"}],
  E: [{ name:"Germany",code:"de"},{ name:"Curaçao",code:"cw"},{ name:"Ivory Coast",code:"ci"},{ name:"Ecuador",code:"ec"}],
  F: [{ name:"Netherlands",code:"nl"},{ name:"Japan",code:"jp"},{ name:"Sweden",code:"se"},{ name:"Tunisia",code:"tn"}],
  G: [{ name:"Belgium",code:"be"},{ name:"Egypt",code:"eg"},{ name:"Iran",code:"ir"},{ name:"New Zealand",code:"nz"}],
  H: [{ name:"Spain",code:"es"},{ name:"Cape Verde",code:"cv"},{ name:"Saudi Arabia",code:"sa"},{ name:"Uruguay",code:"uy"}],
  I: [{ name:"France",code:"fr"},{ name:"Senegal",code:"sn"},{ name:"Norway",code:"no"},{ name:"Iraq",code:"iq"}],
  J: [{ name:"Argentina",code:"ar"},{ name:"Algeria",code:"dz"},{ name:"Austria",code:"at"},{ name:"Jordan",code:"jo"}],
  K: [{ name:"Portugal",code:"pt"},{ name:"DR Congo",code:"cd"},{ name:"Uzbekistan",code:"uz"},{ name:"Colombia",code:"co"}],
  L: [{ name:"England",code:"gb-eng"},{ name:"Croatia",code:"hr"},{ name:"Ghana",code:"gh"},{ name:"Panama",code:"pa"}],
};

const ALL_TEAMS = Object.values(WC_GROUPS).flat();

const SCORING = {
  exactPos:3, advancedWrong:1, wildcardCorrect:3, perfectGroup:6,
  r32:2, r16:4, qf:9, sf:13, third:5, champion:20,
};

const MAX_POSSIBLE = 391; // theoretical max pts

const ROUNDS = [
  { id:"r32", label:"R32", fullLabel:"Round of 32", n:16, pts:2 },
  { id:"r16", label:"R16", fullLabel:"Round of 16", n:8,  pts:4 },
  { id:"qf",  label:"QF",  fullLabel:"Quarterfinals",n:4, pts:9 },
  { id:"sf",  label:"SF",  fullLabel:"Semifinals",   n:2, pts:13 },
];

// ============================================================
// COLORS & STYLE HELPERS
// ============================================================
const C = {
  bg:"#0B1629", card:"#122040", card2:"#0d1a2e",
  gold:"#D4AF37", goldDim:"rgba(212,175,55,0.25)",
  text:"#E8E8E8", muted:"#8899AA", dim:"#445566",
  green:"#22C55E", red:"#f87171", border:"rgba(255,255,255,0.06)",
};

const btn = (primary, disabled=false) => ({
  padding:"13px 20px", fontFamily:"'Bebas Neue',sans-serif",
  fontSize:17, letterSpacing:1.5, borderRadius:10, cursor:disabled?"not-allowed":"pointer",
  border:primary?"none":`1px solid ${C.goldDim}`,
  background: disabled?C.card2: primary?`linear-gradient(135deg,${C.gold},#b8962e)`:"transparent",
  color: disabled?C.dim: primary?C.bg:C.gold,
});

const inp = {
  width:"100%", padding:"11px 12px", background:C.card2,
  border:`1px solid ${C.border}`, borderRadius:8,
  color:C.text, fontFamily:"'Barlow',sans-serif", fontSize:14,
  marginBottom:10, boxSizing:"border-box", outline:"none",
};

// ============================================================
// HELPERS
// ============================================================
const initGroupPicks = () => {
  const p = {};
  Object.keys(WC_GROUPS).forEach(g => { p[g] = [...WC_GROUPS[g]]; });
  return p;
};

const buildR32 = (groupPicks, wildcardPicks) => {
  const g = (grp, pos) => groupPicks[grp]?.[pos] || null;
  const allThirds = Object.keys(WC_GROUPS).map(grp => groupPicks[grp]?.[2]).filter(Boolean);
  const wcTeams = (wildcardPicks || []).map(code => allThirds.find(t => t?.code === code)).filter(Boolean);
  const wc = i => wcTeams[i] || null;
  return [
    [g("A",0),g("B",1)],[g("C",0),g("D",1)],[g("E",0),g("F",1)],[g("G",0),g("H",1)],
    [g("B",0),g("A",1)],[g("D",0),g("C",1)],[g("F",0),g("E",1)],[g("H",0),g("G",1)],
    [g("I",0),g("J",1)],[g("K",0),g("L",1)],[g("J",0),g("I",1)],[g("L",0),g("K",1)],
    [wc(0),wc(1)],[wc(2),wc(3)],[wc(4),wc(5)],[wc(6),wc(7)],
  ];
};

// ── Scoring engine ────────────────────────────────────────────
function calculateScore(bracket, results) {
  if (!results || !bracket) return { total:0, projected:0 };
  let total = 0;

  // Group stage
  const gPicks = bracket.group_picks || {};
  const gResults = results.group_results || {};
  const wcCodes = results.wildcard_codes || [];

  Object.keys(WC_GROUPS).forEach(g => {
    const predicted = gPicks[g] || [];
    const actual = gResults[g] || [];
    if (!actual.length) return;
    let gPts = 0, exactCount = 0;
    predicted.forEach((team, i) => {
      const aIdx = actual.findIndex(t => t.code === team.code);
      if (aIdx === i) { gPts += SCORING.exactPos; exactCount++; }
      else if (aIdx <= 1 || wcCodes.includes(team.code)) gPts += SCORING.advancedWrong;
    });
    if (exactCount === 4) gPts += SCORING.perfectGroup;
    total += gPts;
  });

  // Wildcard
  (bracket.wildcard_picks || []).forEach(code => {
    if (wcCodes.includes(code)) total += SCORING.wildcardCorrect;
  });

  // Knockout
  const ko = bracket.knockout_picks || {};
  const koR = results.knockout_results || {};
  ["r32","r16","qf","sf"].forEach(round => {
    const pts = SCORING[round];
    const actual = koR[round] || {};
    const predicted = ko[round] || {};
    Object.keys(actual).forEach(idx => {
      if (predicted[+idx]?.code === actual[idx]?.code) total += pts;
    });
  });
  if (ko.thirdPlace?.code && koR.thirdPlace?.code === ko.thirdPlace.code) total += SCORING.third;
  if (ko.champion?.code && koR.champion?.code === ko.champion.code) total += SCORING.champion;

  return { total };
}

// ── Stats computed from all brackets ─────────────────────────
function computeStats(allBrackets) {
  const n = allBrackets.length;
  if (!n) return { champDist:[], groupConsensus:[], contrarian:[] };

  // Champion distribution
  const champCounts = {};
  allBrackets.forEach(b => {
    const code = b.knockout_picks?.champion?.code;
    if (code) champCounts[code] = (champCounts[code]||0) + 1;
  });
  const champDist = Object.entries(champCounts)
    .map(([code, count]) => ({ team: ALL_TEAMS.find(t => t.code===code), pct: Math.round(count/n*100), count }))
    .filter(x => x.team)
    .sort((a,b) => b.count - a.count);

  // Group consensus — top 1st-place pick per group
  const groupConsensus = Object.keys(WC_GROUPS).map(g => {
    const counts = {};
    allBrackets.forEach(b => {
      const code = b.group_picks?.[g]?.[0]?.code;
      if (code) counts[code] = (counts[code]||0) + 1;
    });
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    if (!top) return null;
    return { group:g, team:WC_GROUPS[g].find(t=>t.code===top[0]), pct:Math.round(top[1]/n*100) };
  }).filter(Boolean);

  // Contrarian picks: champion picked by ≤ 25%
  const contrarian = champDist.filter(x => x.pct <= 25 && x.pct > 0);

  return { champDist, groupConsensus, contrarian };
}

// ── Who to root for ──────────────────────────────────────────
function computeRooting(myBracket, allBrackets, results) {
  if (!myBracket || !allBrackets.length || !results) return [];
  
  // For each team still in tournament, estimate how much I gain vs. the field
  // Simplified: list teams in my knockout picks that most others don't have
  const remaining = [];
  const ko = myBracket.knockout_picks || {};
  const allCodes = new Set();
  ["r32","r16","qf","sf"].forEach(r => {
    Object.values(ko[r]||{}).forEach(t => { if (t?.code) allCodes.add(t.code); });
  });
  if (ko.champion?.code) allCodes.add(ko.champion.code);

  allCodes.forEach(code => {
    const team = ALL_TEAMS.find(t => t.code === code);
    if (!team) return;
    const othersHave = allBrackets.filter(b =>
      b.user_id !== myBracket.user_id &&
      (Object.values(b.knockout_picks?.sf||{}).some(t=>t?.code===code) ||
       b.knockout_picks?.champion?.code === code)
    ).length;
    const uniqueness = 1 - (othersHave / Math.max(allBrackets.length-1,1));
    if (uniqueness > 0.4) remaining.push({ team, uniqueness:Math.round(uniqueness*100) });
  });

  return remaining.sort((a,b) => b.uniqueness - a.uniqueness).slice(0,6);
}

// ============================================================
// SMALL SHARED COMPONENTS
// ============================================================
const Flag = ({ code, size=28 }) => (
  <img src={`https://flagcdn.com/w${size<=24?20:40}/${code}.png`}
    style={{ width:size, height:Math.round(size*0.62), objectFit:"cover", borderRadius:2, flexShrink:0, display:"inline-block" }}
    alt="" onError={e=>{e.target.style.opacity=0;}} />
);

const FFLShield = ({ size=40 }) => (
  <svg width={size} height={size*1.18} viewBox="0 0 100 118" fill="none">
    <path d="M50 4L92 18V68Q92 102 50 114Q8 102 8 68V18Z" fill="#14305a" stroke="#D4AF37" strokeWidth="3.5"/>
    <path d="M50 10L87 23V68Q87 98 50 110Q13 98 13 68V23Z" fill="#0B1629"/>
    <line x1="22" y1="46" x2="78" y2="46" stroke="#D4AF37" strokeWidth="1.5" opacity="0.4"/>
    <line x1="22" y1="84" x2="78" y2="84" stroke="#D4AF37" strokeWidth="1.5" opacity="0.3"/>
    <text x="50" y="78" textAnchor="middle" fontFamily="'Bebas Neue',sans-serif" fontSize="34" fill="#D4AF37" letterSpacing="3">FFL</text>
  </svg>
);

const SaveBadge = ({ status }) => {
  if (status === "idle") return null;
  const map = { saving:["#8899AA","⟳  Saving..."], saved:[C.green,"✓  Saved"], error:[C.red,"✗  Save failed"] };
  const [color, label] = map[status] || map.saved;
  return (
    <span style={{ color, fontFamily:"'Barlow',sans-serif", fontSize:11, fontWeight:600, flexShrink:0 }}>{label}</span>
  );
};

const Spinner = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:C.bg }}>
    <div style={{ textAlign:"center" }}>
      <FFLShield size={56} />
      <p style={{ color:C.muted, fontFamily:"'Barlow',sans-serif", marginTop:16 }}>Loading FFL…</p>
    </div>
  </div>
);

// ============================================================
// LOGIN SCREEN
// ============================================================
function LoginScreen() {
  const [mode, setMode]       = useState("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleGoogle = async () => {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider:"google", options:{ redirectTo:window.location.origin }
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  const handleEmail = async () => {
    setLoading(true); setError("");
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password, options:{ data:{ display_name:name } }
      });
      if (error) setError(error.message); else setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap'); *{box-sizing:border-box;} body{margin:0;background:#0B1629;} button{outline:none;}`}</style>
      <FFLShield size={64} />
      <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:C.gold, margin:"14px 0 4px", letterSpacing:3, textAlign:"center" }}>FAIRMOUNT FANTASY LEAGUE</h1>
      <p style={{ color:C.muted, fontFamily:"'Barlow',sans-serif", fontSize:14, marginBottom:32, textAlign:"center" }}>2026 FIFA World Cup Challenge</p>

      {sent ? (
        <div style={{ background:C.card, borderRadius:14, padding:28, maxWidth:340, width:"100%", textAlign:"center", border:`1px solid ${C.goldDim}` }}>
          <div style={{ fontSize:44, marginBottom:12 }}>📧</div>
          <h3 style={{ color:C.gold, fontFamily:"'Bebas Neue',sans-serif", fontSize:22, margin:"0 0 10px" }}>CHECK YOUR EMAIL</h3>
          <p style={{ color:C.muted, fontFamily:"'Barlow',sans-serif", fontSize:13, lineHeight:1.6 }}>
            We sent a confirmation link to <strong style={{color:C.text}}>{email}</strong>. Click it to activate your account, then come back and sign in.
          </p>
        </div>
      ) : (
        <div style={{ background:C.card, borderRadius:14, padding:24, maxWidth:340, width:"100%", border:`1px solid ${C.goldDim}` }}>
          {/* Google */}
          <button onClick={handleGoogle} disabled={loading}
            style={{ width:"100%", padding:"13px", background:"#fff", color:"#333", border:"none", borderRadius:10, fontFamily:"'Barlow',sans-serif", fontSize:15, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:20 }}>
            <img src="https://www.google.com/favicon.ico" width={18} height={18} alt="" />
            Continue with Google
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
            <div style={{flex:1,height:1,background:C.border}} />
            <span style={{color:C.dim,fontFamily:"'Barlow',sans-serif",fontSize:12}}>or email</span>
            <div style={{flex:1,height:1,background:C.border}} />
          </div>

          {/* Mode toggle */}
          <div style={{ display:"flex", marginBottom:16 }}>
            {["login","signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex:1, padding:"8px", background:mode===m?C.gold:C.card2, color:mode===m?C.bg:C.muted, fontFamily:"'Bebas Neue',sans-serif", fontSize:13, letterSpacing:0.5, border:`1px solid ${C.goldDim}`, borderRadius:m==="login"?"8px 0 0 8px":"0 8px 8px 0", cursor:"pointer" }}>
                {m==="login"?"SIGN IN":"CREATE ACCOUNT"}
              </button>
            ))}
          </div>

          {mode==="signup" && (
            <input placeholder="Your name (shown on leaderboard)" value={name} onChange={e=>setName(e.target.value)} style={inp} />
          )}
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={inp} />
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleEmail()} style={{ ...inp, marginBottom:14 }} />

          {error && <p style={{color:C.red,fontFamily:"'Barlow',sans-serif",fontSize:13,marginBottom:12}}>{error}</p>}

          <button onClick={handleEmail} disabled={loading||!email||!password||(mode==="signup"&&!name)}
            style={{ ...btn(true,loading||!email||!password||(mode==="signup"&&!name)), width:"100%" }}>
            {loading?"…":mode==="login"?"SIGN IN":"CREATE ACCOUNT"}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// GROUP CARD  — desktop drag + arrow buttons; no touch drag
// ============================================================
function GroupCard({ groupId, teams, onReorder, locked }) {
  const rankLabel = ["1st","2nd","3rd","4th"];
  const rankColor = ["#D4AF37","#aab","#a87","#556"];
  const rankBg    = ["rgba(212,175,55,0.12)","rgba(180,180,190,0.06)","rgba(160,120,80,0.07)","transparent"];

  const dragIdx = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const move = (i, dir) => {
    if (locked) return;
    const next = [...teams], t = i+dir;
    if (t<0||t>3) return;
    [next[i],next[t]]=[next[t],next[i]]; onReorder(next);
  };

  const onDragStart = (e, i) => {
    if (locked) { e.preventDefault(); return; }
    dragIdx.current = i;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnter = (e, i) => { e.preventDefault(); setDragOver(i); };
  const onDragOver  = (e)    => { e.preventDefault(); e.dataTransfer.dropEffect="move"; };
  const onDrop      = (e, i) => {
    e.preventDefault();
    if (dragIdx.current!==null && dragIdx.current!==i) {
      const next=[...teams];
      const [rem]=next.splice(dragIdx.current,1);
      next.splice(i,0,rem);
      onReorder(next);
    }
    dragIdx.current=null; setDragOver(null);
  };
  const onDragEnd = () => { dragIdx.current=null; setDragOver(null); };

  return (
    <div style={{ background:C.card, borderRadius:12, padding:14, border:`1px solid ${C.goldDim}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <div style={{ background:C.gold, color:C.bg, fontFamily:"'Bebas Neue',sans-serif", fontSize:14, width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>{groupId}</div>
        <span style={{ color:C.gold, fontFamily:"'Bebas Neue',sans-serif", fontSize:14, letterSpacing:1 }}>GROUP {groupId}</span>
        {!locked && <span style={{ marginLeft:"auto", color:C.dim, fontSize:11, fontFamily:"'Barlow',sans-serif" }}>drag · ▲▼</span>}
      </div>
      {teams.map((team, i) => {
        const isOver = dragOver===i && dragIdx.current!==null && dragIdx.current!==i;
        return (
          <div key={team.code}
            draggable={!locked}
            onDragStart={e=>onDragStart(e,i)} onDragEnter={e=>onDragEnter(e,i)}
            onDragOver={onDragOver} onDrop={e=>onDrop(e,i)} onDragEnd={onDragEnd}
            style={{ display:"flex", alignItems:"center", gap:8, background:isOver?"rgba(212,175,55,0.22)":rankBg[i], borderRadius:7, padding:"8px", marginBottom:i<3?5:0,
              border:isOver?`1.5px dashed ${C.gold}`:i===0?"1px solid rgba(212,175,55,0.25)":"1px solid transparent",
              cursor:locked?"default":"grab", transition:"background 0.1s,border 0.1s",
              userSelect:"none", WebkitUserSelect:"none",
              opacity:dragIdx.current===i&&dragOver!==null?0.3:1 }}>
            {!locked && <span style={{color:C.dim,fontSize:12,flexShrink:0}}>⠿</span>}
            <span style={{ color:rankColor[i], fontFamily:"'Bebas Neue',sans-serif", fontSize:12, width:26, flexShrink:0 }}>{rankLabel[i]}</span>
            <Flag code={team.code} size={22} />
            <span style={{ color:C.text, fontSize:12, fontFamily:"'Barlow',sans-serif", fontWeight:500, flex:1 }}>{team.name}</span>
            {!locked && (
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {[[-1,"▲"],[1,"▼"]].map(([dir,sym])=>(
                  <button key={sym} onClick={e=>{e.stopPropagation();move(i,dir);}}
                    disabled={(dir===-1&&i===0)||(dir===1&&i===3)}
                    style={{ background:"transparent", border:`1px solid ${C.goldDim}`, borderRadius:3, width:22, height:17, color:((dir===-1&&i===0)||(dir===1&&i===3))?C.dim:C.gold, cursor:"pointer", fontSize:9, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// GROUP STAGE PAGE
// ============================================================
function GroupStagePage({ groupPicks, setGroupPicks, locked, onNext }) {
  return (
    <div style={{ paddingBottom:90 }}>
      <div style={{ padding:"16px 16px 10px", background:C.bg, position:"sticky", top:58, zIndex:9, borderBottom:`1px solid ${C.goldDim}` }}>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:C.gold, margin:0, letterSpacing:1 }}>GROUP STAGE PICKS</h2>
        <p style={{ color:C.muted, fontSize:12, margin:"4px 0 0", fontFamily:"'Barlow',sans-serif" }}>
          Rank all 4 teams in each group. +3 exact · +1 if they advance · +6 perfect group bonus.
        </p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(275px,1fr))", gap:12, padding:14 }}>
        {Object.keys(WC_GROUPS).map(g => (
          <GroupCard key={g} groupId={g} teams={groupPicks[g]} locked={locked}
            onReorder={order=>setGroupPicks(prev=>({...prev,[g]:order}))} />
        ))}
      </div>
      {!locked && (
        <div style={{padding:"0 14px"}}>
          <button onClick={onNext} style={{...btn(true),width:"100%"}}>NEXT: WILDCARD PICKS →</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// WILDCARD PAGE
// ============================================================
function WildcardPage({ groupPicks, wildcardPicks, setWildcardPicks, locked, onNext, onBack }) {
  const thirds = Object.keys(WC_GROUPS).map(g => ({ group:g, team:groupPicks[g][2] }));
  const toggle = code => {
    if (locked) return;
    setWildcardPicks(prev => prev.includes(code) ? prev.filter(c=>c!==code) : prev.length<8 ? [...prev,code] : prev);
  };
  const remaining = 8 - wildcardPicks.length;
  return (
    <div style={{paddingBottom:90}}>
      <div style={{ padding:"16px 16px 10px", background:C.bg, position:"sticky", top:58, zIndex:9, borderBottom:`1px solid ${C.goldDim}` }}>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:C.gold, margin:0, letterSpacing:1 }}>WILDCARD PICKS</h2>
        <p style={{ color:C.muted, fontSize:12, margin:"4px 0 8px", fontFamily:"'Barlow',sans-serif" }}>
          Pick 8 third-place teams that advance. +3 pts each correct.
        </p>
        <span style={{ background:remaining===0?C.green:C.gold, color:C.bg, fontFamily:"'Bebas Neue',sans-serif", fontSize:13, padding:"3px 12px", borderRadius:20 }}>
          {wildcardPicks.length}/8{remaining>0?` — pick ${remaining} more`:" — complete!"}
        </span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(255px,1fr))", gap:10, padding:14 }}>
        {thirds.map(({group,team})=>{
          const sel=wildcardPicks.includes(team.code);
          const disabled=!sel&&wildcardPicks.length>=8;
          return (
            <button key={team.code} onClick={()=>toggle(team.code)} disabled={disabled||locked}
              style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:sel?"rgba(212,175,55,0.15)":C.card,border:`1.5px solid ${sel?C.gold:C.border}`,borderRadius:10,cursor:disabled||locked?"not-allowed":"pointer",opacity:disabled?0.38:1,textAlign:"left",transition:"all 0.15s" }}>
              <div style={{ width:22,height:22,borderRadius:"50%",border:`2px solid ${sel?C.gold:C.dim}`,background:sel?C.gold:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                {sel&&<span style={{color:C.bg,fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>}
              </div>
              <Flag code={team.code} size={28} />
              <div>
                <div style={{color:C.text,fontSize:13,fontFamily:"'Barlow',sans-serif",fontWeight:600}}>{team.name}</div>
                <div style={{color:C.muted,fontSize:11,fontFamily:"'Barlow',sans-serif"}}>3rd · Group {group}</div>
              </div>
            </button>
          );
        })}
      </div>
      {!locked && (
        <div style={{padding:"0 14px",display:"flex",gap:10}}>
          <button onClick={onBack} style={{...btn(false),flex:1}}>← BACK</button>
          <button onClick={onNext} disabled={wildcardPicks.length!==8} style={{...btn(true,wildcardPicks.length!==8),flex:2}}>BUILD BRACKET →</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MATCH CARD (knockout)
// ============================================================
function MatchCard({ num, team1, team2, winner, onPick, locked }) {
  const Team = ({ team }) => {
    if (!team) return (
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",opacity:0.3}}>
        <div style={{width:28,height:18,background:C.card2,borderRadius:2}}/>
        <span style={{color:C.dim,fontFamily:"'Barlow',sans-serif",fontSize:13}}>TBD</span>
      </div>
    );
    const isWinner=winner?.code===team.code, isLoser=winner&&!isWinner;
    return (
      <button onClick={()=>!locked&&onPick(team)}
        style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",background:isWinner?"rgba(212,175,55,0.18)":"transparent",border:isWinner?`1px solid ${C.goldDim}`:"1px solid transparent",borderRadius:8,cursor:locked?"default":"pointer",opacity:isLoser?0.35:1,transition:"all 0.15s",textAlign:"left" }}>
        <Flag code={team.code} size={26}/>
        <span style={{flex:1,color:isWinner?C.gold:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:isWinner?700:500}}>{team.name}</span>
        {isWinner&&<span style={{color:C.gold,fontSize:13}}>✓</span>}
      </button>
    );
  };
  return (
    <div style={{background:C.card,borderRadius:10,padding:"8px 6px",border:`1px solid ${C.border}`}}>
      <div style={{color:C.dim,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,letterSpacing:1,padding:"0 6px 6px"}}>MATCH {num}</div>
      <Team team={team1}/><div style={{height:1,background:C.border,margin:"2px 6px"}}/><Team team={team2}/>
    </div>
  );
}

// ============================================================
// KNOCKOUT PAGE
// ============================================================
function KnockoutPage({ groupPicks, wildcardPicks, knockoutPicks, setKnockoutPicks, locked, onBack }) {
  const [activeRound, setActiveRound] = useState("r32");
  const r32Teams = buildR32(groupPicks, wildcardPicks);

  const getTeams = (roundId, matchIdx) => {
    if (roundId==="r32") return r32Teams[matchIdx]||[null,null];
    const prevId = ROUNDS[ROUNDS.findIndex(r=>r.id===roundId)-1].id;
    return [knockoutPicks[prevId]?.[matchIdx*2]||null, knockoutPicks[prevId]?.[matchIdx*2+1]||null];
  };

  const pickWinner = (roundId, matchIdx, team) => {
    if (!team) return;
    setKnockoutPicks(prev => {
      const next={...prev,[roundId]:{...(prev[roundId]||{}),[matchIdx]:team}};
      const rIdx=ROUNDS.findIndex(r=>r.id===roundId);
      for(let i=rIdx+1;i<ROUNDS.length;i++){
        const aff=Math.floor(matchIdx/Math.pow(2,i-rIdx));
        if(next[ROUNDS[i].id]?.[aff]){next[ROUNDS[i].id]={...next[ROUNDS[i].id]};delete next[ROUNDS[i].id][aff];}
      }
      if(rIdx===ROUNDS.length-2&&next.champion){
        const [sf0,sf1]=[next.sf?.[0],next.sf?.[1]];
        if(next.champion?.code!==sf0?.code&&next.champion?.code!==sf1?.code) delete next.champion;
      }
      return next;
    });
  };

  const isUnlocked = roundId => {
    const idx=ROUNDS.findIndex(r=>r.id===roundId);
    if(idx===0)return true;
    const prev=ROUNDS[idx-1];
    return Object.keys(knockoutPicks[prev.id]||{}).length>=prev.n;
  };

  const sfComplete = Object.keys(knockoutPicks.sf||{}).length>=2;
  const finalT1=knockoutPicks.sf?.[0]||null, finalT2=knockoutPicks.sf?.[1]||null;
  const sfLosers=[0,1].map(i=>{
    const [t1,t2]=getTeams("sf",i);
    const w=knockoutPicks.sf?.[i];
    return [t1,t2].find(t=>t?.code!==w?.code)||null;
  });

  const currentRound=ROUNDS.find(r=>r.id===activeRound)||ROUNDS[0];
  const matches=Array.from({length:currentRound.n},(_,i)=>({idx:i,teams:getTeams(activeRound,i)}));
  const picked=Object.keys(knockoutPicks[activeRound]||{}).length;

  return (
    <div style={{paddingBottom:90}}>
      <div style={{ padding:"16px 16px 0", background:C.bg, position:"sticky", top:58, zIndex:9, borderBottom:`1px solid ${C.goldDim}` }}>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:C.gold, margin:"0 0 12px", letterSpacing:1 }}>KNOCKOUT BRACKET</h2>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:12}}>
          {[...ROUNDS,{id:"final",label:"Final",n:1}].map(r=>{
            const unlocked=r.id==="final"?sfComplete:isUnlocked(r.id);
            const complete=r.id==="final"?!!knockoutPicks.champion:Object.keys(knockoutPicks[r.id]||{}).length>=r.n;
            return (
              <button key={r.id} onClick={()=>unlocked&&setActiveRound(r.id)}
                style={{ flexShrink:0,padding:"6px 14px",background:activeRound===r.id?C.gold:unlocked?C.card:C.card2,color:activeRound===r.id?C.bg:unlocked?C.text:C.dim,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:0.5,border:`1px solid ${complete?C.green+"44":activeRound===r.id?C.gold:C.border}`,borderRadius:20,cursor:unlocked?"pointer":"not-allowed",whiteSpace:"nowrap" }}>
                {complete?"✓ ":""}{r.label}
              </button>
            );
          })}
        </div>
        {activeRound!=="final"&&<p style={{color:C.muted,fontSize:12,fontFamily:"'Barlow',sans-serif",paddingBottom:10}}>{picked}/{currentRound.n} picked</p>}
      </div>

      {activeRound!=="final"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:10,padding:14}}>
          {matches.map(({idx,teams:[t1,t2]})=>(
            <MatchCard key={idx} num={idx+1} team1={t1} team2={t2}
              winner={knockoutPicks[activeRound]?.[idx]}
              onPick={team=>pickWinner(activeRound,idx,team)} locked={locked}/>
          ))}
        </div>
      )}

      {activeRound==="final"&&(
        <div style={{padding:14,display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{fontSize:22}}>🏆</span>
              <h3 style={{color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:1,margin:0}}>WORLD CUP FINAL</h3>
              <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>+20 pts for champion</span>
            </div>
            <MatchCard num="Final" team1={finalT1} team2={finalT2}
              winner={knockoutPicks.champion||null}
              onPick={team=>setKnockoutPicks(prev=>({...prev,champion:team}))} locked={locked}/>
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{fontSize:20}}>🥉</span>
              <h3 style={{color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1,margin:0}}>3RD PLACE MATCH</h3>
              <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>+5 pts</span>
            </div>
            <MatchCard num="3rd" team1={sfLosers[0]} team2={sfLosers[1]}
              winner={knockoutPicks.thirdPlace||null}
              onPick={team=>setKnockoutPicks(prev=>({...prev,thirdPlace:team}))} locked={locked}/>
          </div>
          {knockoutPicks.champion&&(
            <div style={{background:"rgba(212,175,55,0.1)",border:`1px solid ${C.gold}44`,borderRadius:12,padding:16,textAlign:"center"}}>
              <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:8}}>YOUR CHAMPION</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
                <Flag code={knockoutPicks.champion.code} size={40}/>
                <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:C.gold,letterSpacing:2}}>{knockoutPicks.champion.name}</span>
              </div>
            </div>
          )}
        </div>
      )}
      {!locked&&(
        <div style={{padding:"0 14px"}}>
          <button onClick={onBack} style={{...btn(false),width:"100%"}}>← BACK TO WILDCARDS</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// LEADERBOARD PAGE
// ============================================================
function LeaderboardPage({ userId, bracketName, bracketComplete, allBrackets, results, locked }) {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    const target = new Date("2026-06-11T18:00:00Z");
    const tick = () => {
      const diff = target - new Date();
      if (diff<=0){setTimeLeft({days:0,hrs:0,min:0,sec:0});return;}
      setTimeLeft({days:Math.floor(diff/86400000),hrs:Math.floor((diff%86400000)/3600000),min:Math.floor((diff%3600000)/60000),sec:Math.floor((diff%60000)/1000)});
    };
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id);
  },[]);
  const td=v=>String(v).padStart(2,"0");

  const tournamentStarted = results && Object.keys(results.group_results||{}).length > 0;

  // Score all brackets
  const scored = allBrackets.map(b => ({
    ...b, score: calculateScore(b, results).total
  })).sort((a,b) => b.score - a.score);

  return (
    <div style={{padding:14,paddingBottom:90}}>
      {/* Hero */}
      <div style={{ background:"linear-gradient(160deg,#1a3a6b 0%,#0B1629 100%)", borderRadius:16, padding:22, marginBottom:18, border:`1px solid ${C.goldDim}`, textAlign:"center" }}>
        <FFLShield size={54}/>
        <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:C.gold,margin:"10px 0 4px",letterSpacing:3}}>FAIRMOUNT FANTASY LEAGUE</h1>
        <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13,margin:"0 0 16px"}}>2026 FIFA World Cup Challenge</p>
        {/* Countdown */}
        {!locked&&(
          <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:10}}>
            {[["DAYS",timeLeft.days],["HRS",timeLeft.hrs],["MIN",timeLeft.min],["SEC",timeLeft.sec]].map(([label,val],i)=>(
              <span key={label} style={{display:"flex",alignItems:"center"}}>
                <span style={{display:"flex",flexDirection:"column",alignItems:"center",background:"rgba(0,0,0,0.3)",borderRadius:8,padding:"6px 10px",minWidth:52}}>
                  <span style={{color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:28,lineHeight:1}}>{val!==undefined?td(val):"--"}</span>
                  <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,marginTop:2}}>{label}</span>
                </span>
                {i<3&&<span style={{color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,margin:"0 2px",opacity:0.5}}>:</span>}
              </span>
            ))}
          </div>
        )}
        {locked&&<span style={{background:"rgba(212,175,55,0.15)",color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,padding:"4px 14px",borderRadius:20,animation:"pulse 2s infinite"}}>🔴 TOURNAMENT LIVE</span>}
        <p style={{color:C.dim,fontFamily:"'Barlow',sans-serif",fontSize:11,marginTop:8}}>Picks lock June 11 · Tournament: June 11 – July 19, 2026</p>
        {!bracketComplete&&(
          <div style={{marginTop:12,padding:"8px 14px",background:"rgba(212,175,55,0.1)",borderRadius:8,display:"inline-block"}}>
            <span style={{color:C.gold,fontFamily:"'Barlow',sans-serif",fontSize:12,fontWeight:600}}>⚠ Your bracket is incomplete — finish your picks</span>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <h3 style={{color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1,margin:0}}>LEADERBOARD</h3>
          <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>{allBrackets.length} entries · {MAX_POSSIBLE} pts max</span>
        </div>
        <div style={{background:C.card,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
          <div style={{display:"grid",gridTemplateColumns:"32px 1fr 60px",gap:8,padding:"8px 14px",background:"rgba(212,175,55,0.1)",borderBottom:`1px solid ${C.goldDim}`}}>
            {["#","BRACKET","PTS"].map(h=>(
              <span key={h} style={{color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,textAlign:h==="PTS"?"right":"left"}}>{h}</span>
            ))}
          </div>
          {scored.length===0&&(
            <div style={{padding:"24px 14px",textAlign:"center",color:C.dim,fontFamily:"'Barlow',sans-serif",fontSize:13}}>
              No brackets submitted yet — be the first!
            </div>
          )}
          {scored.map((b,i)=>{
            const isMe=b.user_id===userId;
            return(
              <div key={b.id} style={{display:"grid",gridTemplateColumns:"32px 1fr 60px",gap:8,padding:"11px 14px",borderBottom:i<scored.length-1?`1px solid ${C.border}`:"none",background:isMe?"rgba(212,175,55,0.06)":"transparent"}}>
                <span style={{color:i===0?"#D4AF37":i===1?"#aab":i===2?"#a87":C.dim,fontFamily:"'Bebas Neue',sans-serif",fontSize:15}}>{i+1}</span>
                <div>
                  <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                    {b.bracket_name||"Unnamed Bracket"}
                    {isMe&&<span style={{color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:9,background:"rgba(212,175,55,0.15)",padding:"1px 6px",borderRadius:10}}>YOU</span>}
                  </div>
                  <div style={{color:C.dim,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{b.display_name||"—"}</div>
                </div>
                <span style={{color:tournamentStarted?C.text:C.dim,fontFamily:"'Bebas Neue',sans-serif",fontSize:15,textAlign:"right"}}>{tournamentStarted?b.score:"—"}</span>
              </div>
            );
          })}
        </div>
        {!tournamentStarted&&(
          <p style={{color:C.dim,fontFamily:"'Barlow',sans-serif",fontSize:11,textAlign:"center",marginTop:8}}>Scores appear after the first match · Jun 11 · Mexico vs South Africa</p>
        )}
      </div>

      {/* Scoring guide */}
      <div style={{background:C.card,borderRadius:12,padding:14,border:`1px solid ${C.border}`}}>
        <h4 style={{color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,margin:"0 0 12px"}}>SCORING</h4>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px 20px"}}>
          {[["Exact group rank","+3"],["Wrong rank, advanced","+1"],["Perfect group","+6 bonus"],["Wildcard correct","+3"],["R32 win","+2"],["R16 win","+4"],["Quarterfinal","+9"],["Semifinal","+13"],["3rd Place","+5"],["Champion","🏆 +20"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",gap:6}}>
              <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>{l}</span>
              <span style={{color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,flexShrink:0}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STATS PAGE
// ============================================================
function StatsPage({ allBrackets, userId, results }) {
  const [tab, setTab] = useState("popular");
  const { champDist, groupConsensus, contrarian } = computeStats(allBrackets);
  const myBracket = allBrackets.find(b=>b.user_id===userId);
  const rootingFor = computeRooting(myBracket, allBrackets, results);
  const n = allBrackets.length;

  return (
    <div style={{padding:14,paddingBottom:90}}>
      <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:C.gold,margin:"0 0 14px",letterSpacing:1}}>POOL STATS</h2>
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[["popular","🔥 Popular"],["unique","🎯 Contrarian"],["rooting","📣 Root For"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{flex:1,padding:"8px 4px",background:tab===id?C.gold:C.card,color:tab===id?C.bg:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:0.5,border:`1px solid ${tab===id?C.gold:C.border}`,borderRadius:8,cursor:"pointer"}}>
            {label}
          </button>
        ))}
      </div>

      {tab==="popular"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:C.card,borderRadius:12,padding:14,border:`1px solid ${C.border}`}}>
            <h4 style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:1,margin:"0 0 14px"}}>🏆 CHAMPION PICKS ({n} entries)</h4>
            {champDist.length===0&&<p style={{color:C.dim,fontFamily:"'Barlow',sans-serif",fontSize:13}}>No brackets submitted yet.</p>}
            {champDist.map(({team,pct})=>(
              <div key={team.code} style={{marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <Flag code={team.code} size={22}/>
                  <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,flex:1}}>{team.name}</span>
                  <span style={{color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>{pct}%</span>
                </div>
                <div style={{background:C.card2,borderRadius:4,height:7}}>
                  <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${C.gold},#b8962e)`,borderRadius:4}}/>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:C.card,borderRadius:12,padding:14,border:`1px solid ${C.border}`}}>
            <h4 style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:1,margin:"0 0 12px"}}>GROUP CONSENSUS — Most Popular 1st Place</h4>
            {groupConsensus.length===0&&<p style={{color:C.dim,fontFamily:"'Barlow',sans-serif",fontSize:13}}>No brackets submitted yet.</p>}
            {groupConsensus.map(({group,team,pct})=>team&&(
              <div key={group} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{background:C.gold,color:C.bg,fontFamily:"'Bebas Neue',sans-serif",fontSize:12,width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{group}</div>
                <Flag code={team.code} size={20}/>
                <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,flex:1}}>{team.name}</span>
                <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>{pct}% picked 1st</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="unique"&&(
        <div style={{background:C.card,borderRadius:12,padding:14,border:`1px solid ${C.border}`}}>
          <h4 style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:1,margin:"0 0 6px"}}>CONTRARIAN CHAMPION PICKS</h4>
          <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:14}}>Champions picked by 25% or fewer — big differentiators if they hit</p>
          {contrarian.length===0&&<p style={{color:C.dim,fontFamily:"'Barlow',sans-serif",fontSize:13}}>No contrarian picks yet — or not enough entries to analyze.</p>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {contrarian.map(({team,pct,count})=>(
              <div key={team.code} style={{background:C.card2,borderRadius:8,padding:12,border:`1px solid ${C.goldDim}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <Flag code={team.code} size={22}/>
                  <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600}}>{team.name}</span>
                </div>
                <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>Champion</div>
                <div style={{color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,marginTop:2}}>{count}/{n} picked · {pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="rooting"&&(
        <div style={{background:C.card,borderRadius:12,padding:16,border:`1px solid ${C.border}`}}>
          <h4 style={{color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1,margin:"0 0 6px"}}>WHO TO ROOT FOR</h4>
          <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,lineHeight:1.5,marginBottom:14}}>
            Teams in your knockout picks that most others <em>don't</em> have — if they win, you gain ground on the field.
          </p>
          {!myBracket&&<p style={{color:C.dim,fontFamily:"'Barlow',sans-serif",fontSize:13}}>Submit your bracket first to see your rooting guide.</p>}
          {myBracket&&rootingFor.length===0&&<p style={{color:C.dim,fontFamily:"'Barlow',sans-serif",fontSize:13}}>Your picks mirror the field — no unique differentiators yet. Check back after picks lock.</p>}
          {myBracket&&rootingFor.map(({team,uniqueness})=>(
            <div key={team.code} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <Flag code={team.code} size={28}/>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600}}>{team.name}</div>
                <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{uniqueness}% of the field doesn't have them this deep</div>
              </div>
              <span style={{color:C.green,fontFamily:"'Bebas Neue',sans-serif",fontSize:13}}>ROOT HARD</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// BRACKET WRAPPER (step nav)
// ============================================================
function BracketPage({ step, setStep, groupPicks, setGroupPicks, wildcardPicks, setWildcardPicks, knockoutPicks, setKnockoutPicks, locked }) {
  const steps=[{id:"groups",label:"Groups"},{id:"wildcards",label:"Wildcards"},{id:"knockout",label:"Bracket"}];
  const stepIdx=steps.findIndex(s=>s.id===step);
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",padding:"10px 14px 0",gap:0}}>
        {steps.map((s,i)=>(
          <span key={s.id} style={{display:"flex",alignItems:"center",flex:1}}>
            <span style={{display:"flex",alignItems:"center",gap:5,cursor:i<=stepIdx?"pointer":"default"}}
              onClick={()=>{if(i<stepIdx||(i===1&&wildcardPicks.length>0))setStep(s.id);}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:i<=stepIdx?C.gold:"#1a2a3a",color:i<=stepIdx?C.bg:C.dim,fontFamily:"'Bebas Neue',sans-serif",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {i<stepIdx?"✓":i+1}
              </span>
              <span style={{color:i===stepIdx?C.gold:i<stepIdx?"rgba(212,175,55,0.6)":C.dim,fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:0.5}}>{s.label}</span>
            </span>
            {i<steps.length-1&&<div style={{flex:1,height:1,background:i<stepIdx?C.gold:C.border,margin:"0 8px"}}/>}
          </span>
        ))}
      </div>
      {step==="groups"   &&<GroupStagePage   groupPicks={groupPicks}  setGroupPicks={setGroupPicks}  locked={locked} onNext={()=>setStep("wildcards")}/>}
      {step==="wildcards"&&<WildcardPage     groupPicks={groupPicks}  wildcardPicks={wildcardPicks} setWildcardPicks={setWildcardPicks} locked={locked} onNext={()=>setStep("knockout")} onBack={()=>setStep("groups")}/>}
      {step==="knockout" &&<KnockoutPage     groupPicks={groupPicks}  wildcardPicks={wildcardPicks} knockoutPicks={knockoutPicks} setKnockoutPicks={setKnockoutPicks} locked={locked} onBack={()=>setStep("wildcards")}/>}
    </div>
  );
}

// ============================================================
// ROOT APP — auth, persistence, subscriptions
// ============================================================
export default function App() {
  // ── Auth ──────────────────────────────────────────────────
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Bracket state ─────────────────────────────────────────
  const [bracketId,      setBracketId]      = useState(null);
  const [bracketName,    setBracketName]    = useState("My FFL Bracket");
  const [editingName,    setEditingName]    = useState(false);
  const [groupPicks,     setGroupPicks]     = useState(initGroupPicks);
  const [wildcardPicks,  setWildcardPicks]  = useState([]);
  const [knockoutPicks,  setKnockoutPicks]  = useState({});
  const [saveStatus,     setSaveStatus]     = useState("idle");

  // ── Leaderboard / results ─────────────────────────────────
  const [allBrackets,  setAllBrackets]  = useState([]);
  const [results,      setResults]      = useState(null);

  // ── UI ────────────────────────────────────────────────────
  const [page,        setPage]        = useState("home");
  const [bracketStep, setBracketStep] = useState("groups");

  const saveTimer = useRef(null);
  const locked = results?.tournament_locked || false;
  const bracketComplete = !!knockoutPicks.champion;

  // ── Auth init ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load bracket on login ─────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("brackets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setBracketId(data.id);
        setBracketName(data.bracket_name || "My FFL Bracket");
        if (data.group_picks)    setGroupPicks(data.group_picks);
        if (data.wildcard_picks) setWildcardPicks(data.wildcard_picks);
        if (data.knockout_picks) setKnockoutPicks(data.knockout_picks);
      } else if (error?.code === "PGRST116") {
        // No bracket yet — create one with display_name from Google/signup
        const displayName = user.user_metadata?.full_name || user.user_metadata?.display_name || user.email;
        const { data: created } = await supabase
          .from("brackets")
          .insert({ user_id:user.id, display_name:displayName })
          .select()
          .single();
        if (created) setBracketId(created.id);
      }
    };
    load();
  }, [user]);

  // ── Load all brackets (leaderboard) ──────────────────────
  useEffect(() => {
    if (!user) return;
    const loadAll = async () => {
      const { data } = await supabase
        .from("brackets")
        .select("id,user_id,display_name,bracket_name,group_picks,wildcard_picks,knockout_picks,locked");
      if (data) setAllBrackets(data);
    };
    loadAll();

    const channel = supabase.channel("brackets-feed")
      .on("postgres_changes",{ event:"*", schema:"public", table:"brackets" }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  // ── Load actual results ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase.from("actual_results").select("*").eq("id","00000000-0000-0000-0000-000000000001").single()
      .then(({ data }) => { if (data) setResults(data); });
  }, [user]);

  // ── Auto-save bracket (debounced 1.5s) ───────────────────
  const triggerSave = useCallback((overrides={}) => {
    if (locked || !user || !bracketId) return;
    setSaveStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const payload = {
        bracket_name:  overrides.bracketName  ?? bracketName,
        group_picks:   overrides.groupPicks   ?? groupPicks,
        wildcard_picks:overrides.wildcardPicks?? wildcardPicks,
        knockout_picks:overrides.knockoutPicks?? knockoutPicks,
      };
      const { error } = await supabase
        .from("brackets")
        .update(payload)
        .eq("user_id", user.id);
      setSaveStatus(error ? "error" : "saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }, 1500);
  }, [locked, user, bracketId, bracketName, groupPicks, wildcardPicks, knockoutPicks]);

  // Wrap setters to trigger save
  const setGP = useCallback(v => { setGroupPicks(v);    triggerSave({ groupPicks:typeof v==="function"?v(groupPicks):v }); }, [triggerSave, groupPicks]);
  const setWP = useCallback(v => { setWildcardPicks(v); triggerSave({ wildcardPicks:v }); }, [triggerSave]);
  const setKP = useCallback(v => { setKnockoutPicks(v); triggerSave({ knockoutPicks:typeof v==="function"?v(knockoutPicks):v }); }, [triggerSave, knockoutPicks]);
  const saveName = (name) => { setBracketName(name); triggerSave({ bracketName:name }); };

  const signOut = () => supabase.auth.signOut();

  const nav = [
    {id:"home",    icon:"🏆",label:"Standings"},
    {id:"bracket", icon:"⚽",label:"My Bracket"},
    {id:"stats",   icon:"📊",label:"Pool Stats"},
  ];

  if (loading) return <Spinner />;
  if (!user)   return <LoginScreen />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        body { background:#0B1629; margin:0; }
        button { outline:none; }
        input { outline:none; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#0B1629; }
        ::-webkit-scrollbar-thumb { background:#D4AF37; border-radius:2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>
      <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Barlow',sans-serif", maxWidth:900, margin:"0 auto", position:"relative", paddingTop:58 }}>

        {/* ── Header ── */}
        <div style={{ position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:900,zIndex:200,background:"#0d1a2e",borderBottom:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",gap:10,padding:"10px 14px",height:58 }}>
          <FFLShield size={32}/>
          <div style={{flex:1,overflow:"hidden",minWidth:0}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,color:C.gold,letterSpacing:2,lineHeight:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>FAIRMOUNT FANTASY LEAGUE</div>
            {page==="bracket"&&(
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
                <SaveBadge status={saveStatus}/>
                {saveStatus==="idle"&&(
                  editingName
                    ? <input autoFocus value={bracketName} onChange={e=>setBracketName(e.target.value)}
                        onBlur={()=>{setEditingName(false);saveName(bracketName);}}
                        onKeyDown={e=>e.key==="Enter"&&(setEditingName(false),saveName(bracketName))}
                        style={{background:"transparent",border:"none",borderBottom:`1px solid ${C.gold}`,color:C.gold,fontFamily:"'Barlow',sans-serif",fontSize:12,maxWidth:200}}/>
                    : <button onClick={()=>!locked&&setEditingName(true)}
                        style={{background:"transparent",border:"none",color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,cursor:locked?"default":"pointer",display:"flex",alignItems:"center",gap:4,padding:0}}>
                        {bracketName}{!locked&&" ✏"}
                      </button>
                )}
              </div>
            )}
          </div>
          {locked&&<span style={{background:"rgba(212,175,55,0.15)",color:C.gold,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,padding:"3px 8px",borderRadius:20,animation:"pulse 2s infinite",flexShrink:0}}>🔴 LIVE</span>}
          <button onClick={signOut} style={{background:"transparent",border:`1px solid ${C.goldDim}`,borderRadius:8,color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:0.5,padding:"5px 10px",cursor:"pointer",flexShrink:0}}>OUT</button>
        </div>

        {/* ── Pages ── */}
        {page==="home"    && <LeaderboardPage userId={user.id} bracketName={bracketName} bracketComplete={bracketComplete} allBrackets={allBrackets} results={results} locked={locked}/>}
        {page==="bracket" && <BracketPage step={bracketStep} setStep={setBracketStep} groupPicks={groupPicks} setGroupPicks={setGP} wildcardPicks={wildcardPicks} setWildcardPicks={setWP} knockoutPicks={knockoutPicks} setKnockoutPicks={setKP} locked={locked}/>}
        {page==="stats"   && <StatsPage allBrackets={allBrackets} userId={user.id} results={results}/>}

        {/* ── Bottom nav ── */}
        <nav style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:900,background:"#0d1a2e",borderTop:`1px solid ${C.goldDim}`,display:"flex",justifyContent:"space-around",padding:"6px 0 max(env(safe-area-inset-bottom),6px)",zIndex:200 }}>
          {nav.map(({id,icon,label})=>(
            <button key={id} onClick={()=>setPage(id)}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 16px",background:"transparent",border:"none",cursor:"pointer",color:page===id?C.gold:C.dim}}>
              <span style={{fontSize:22,lineHeight:1}}>{icon}</span>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:0.5}}>{label}</span>
              {page===id&&<div style={{width:20,height:2,background:C.gold,borderRadius:1,marginTop:1}}/>}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
