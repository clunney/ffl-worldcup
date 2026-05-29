// App.jsx — World Cup Challenge 2026 — Full Feature Build
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "./supabase";

// ── Constants ─────────────────────────────────────────────────
const ADMIN_EMAIL  = "clunney22@gmail.com";
const DEFAULT_POOL = "00000000-0000-0000-0000-000000000002";
const RESULTS_ROW  = "00000000-0000-0000-0000-000000000001";

const WC_GROUPS = {
  A:[{name:"Mexico",code:"mx"},{name:"South Africa",code:"za"},{name:"South Korea",code:"kr"},{name:"Czechia",code:"cz"}],
  B:[{name:"Canada",code:"ca"},{name:"Switzerland",code:"ch"},{name:"Qatar",code:"qa"},{name:"Bosnia & Herz.",code:"ba"}],
  C:[{name:"Brazil",code:"br"},{name:"Morocco",code:"ma"},{name:"Haiti",code:"ht"},{name:"Scotland",code:"gb-sct"}],
  D:[{name:"USA",code:"us"},{name:"Paraguay",code:"py"},{name:"Australia",code:"au"},{name:"Türkiye",code:"tr"}],
  E:[{name:"Germany",code:"de"},{name:"Curaçao",code:"cw"},{name:"Ivory Coast",code:"ci"},{name:"Ecuador",code:"ec"}],
  F:[{name:"Netherlands",code:"nl"},{name:"Japan",code:"jp"},{name:"Sweden",code:"se"},{name:"Tunisia",code:"tn"}],
  G:[{name:"Belgium",code:"be"},{name:"Egypt",code:"eg"},{name:"Iran",code:"ir"},{name:"New Zealand",code:"nz"}],
  H:[{name:"Spain",code:"es"},{name:"Cape Verde",code:"cv"},{name:"Saudi Arabia",code:"sa"},{name:"Uruguay",code:"uy"}],
  I:[{name:"France",code:"fr"},{name:"Senegal",code:"sn"},{name:"Norway",code:"no"},{name:"Iraq",code:"iq"}],
  J:[{name:"Argentina",code:"ar"},{name:"Algeria",code:"dz"},{name:"Austria",code:"at"},{name:"Jordan",code:"jo"}],
  K:[{name:"Portugal",code:"pt"},{name:"DR Congo",code:"cd"},{name:"Uzbekistan",code:"uz"},{name:"Colombia",code:"co"}],
  L:[{name:"England",code:"gb-eng"},{name:"Croatia",code:"hr"},{name:"Ghana",code:"gh"},{name:"Panama",code:"pa"}],
};
const ALL_TEAMS = Object.values(WC_GROUPS).flat();

const NAME_TO_CODE = {
  "Mexico":"mx","South Africa":"za","Korea Republic":"kr","South Korea":"kr","Czechia":"cz","Czech Republic":"cz",
  "Canada":"ca","Switzerland":"ch","Qatar":"qa","Bosnia and Herzegovina":"ba",
  "Brazil":"br","Morocco":"ma","Haiti":"ht","Scotland":"gb-sct",
  "United States":"us","USA":"us","Paraguay":"py","Australia":"au","Türkiye":"tr","Turkey":"tr",
  "Germany":"de","Curaçao":"cw","Curacao":"cw","Côte d'Ivoire":"ci","Ivory Coast":"ci","Ecuador":"ec",
  "Netherlands":"nl","Japan":"jp","Sweden":"se","Tunisia":"tn",
  "Belgium":"be","Egypt":"eg","Iran":"ir","IR Iran":"ir","New Zealand":"nz",
  "Spain":"es","Cape Verde":"cv","Saudi Arabia":"sa","Uruguay":"uy",
  "France":"fr","Senegal":"sn","Norway":"no","Iraq":"iq",
  "Argentina":"ar","Algeria":"dz","Austria":"at","Jordan":"jo",
  "Portugal":"pt","Congo DR":"cd","DR Congo":"cd","Uzbekistan":"uz","Colombia":"co",
  "England":"gb-eng","Croatia":"hr","Ghana":"gh","Panama":"pa",
};

const DEFAULT_SCORING = {
  exactPos:3,advancedWrong:1,wildcardCorrect:2,perfectGroup:6,
  r32:2,r16:4,qf:9,sf:13,third:5,champion:20,
};
const MAX_POSSIBLE = 368;

const ROUNDS = [
  {id:"r32",label:"R32",fullLabel:"Round of 32",n:16,pts:2},
  {id:"r16",label:"R16",fullLabel:"Round of 16",n:8,pts:4},
  {id:"qf", label:"QF", fullLabel:"Quarterfinals",n:4,pts:9},
  {id:"sf", label:"SF", fullLabel:"Semifinals",  n:2,pts:13},
];
const STAGE_TO_ROUND = {
  LAST_32:"r32",LAST_16:"r16",QUARTER_FINALS:"qf",SEMI_FINALS:"sf",FINAL:"final",
};

// ── Colors ────────────────────────────────────────────────────
const C = {
  bg:"#0a0e1a",card:"#111827",card2:"#0d1321",
  accent:"#06b6d4",accentDim:"rgba(6,182,212,0.18)",
  text:"#f1f5f9",muted:"#64748b",dim:"#1e3a5f",
  green:"#22C55E",red:"#ef4444",amber:"#f59e0b",
  border:"rgba(255,255,255,0.07)",borderAccent:"rgba(6,182,212,0.28)",
  navBg:"#0a0f1e",
};
const btn=(primary=true,disabled=false)=>({
  padding:"12px 18px",fontFamily:"'Bebas Neue',sans-serif",fontSize:16,
  letterSpacing:1.5,borderRadius:10,cursor:disabled?"not-allowed":"pointer",
  border:primary?"none":`1px solid ${C.accentDim}`,
  background:disabled?C.card2:primary?`linear-gradient(135deg,${C.accent},#0891b2)`:"transparent",
  color:disabled?C.muted:primary?"#0a0e1a":C.accent,transition:"all 0.15s",
});
const inp={
  width:"100%",padding:"11px 12px",background:C.card2,
  border:`1px solid ${C.border}`,borderRadius:8,color:C.text,
  fontFamily:"'Barlow',sans-serif",fontSize:14,
  marginBottom:10,boxSizing:"border-box",outline:"none",
};

// ── Logo & Icons ──────────────────────────────────────────────
const WCCLogo=({size=40})=>(
  <svg width={size} height={size} viewBox="0 0 90 90" fill="none">
    <circle cx="45" cy="45" r="41" fill="#0d1a2e" stroke="#06b6d4" strokeWidth="2.2"/>
    <path d="M4 45 Q22 30 45 45 Q68 60 86 45" stroke="#06b6d4" strokeWidth="1.8" fill="none" strokeOpacity=".65"/>
    <path d="M45 4 Q30 22 45 45 Q60 68 45 86"  stroke="#06b6d4" strokeWidth="1.8" fill="none" strokeOpacity=".65"/>
    <path d="M14 14 Q30 30 45 45 Q60 60 76 76"  stroke="#06b6d4" strokeWidth="1.4" fill="none" strokeOpacity=".4"/>
    <text x="45" y="51" textAnchor="middle" fontFamily="'Arial Black',Impact,sans-serif" fontSize="20" fill="white" fontWeight="900" letterSpacing="2">WCC</text>
  </svg>
);
const IcoTrophy =({s=22,c="currentColor"})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4H4a2 2 0 000 4c0 2.5 1.5 4.5 4 5M17 4h3a2 2 0 010 4c0 2.5-1.5 4.5-4 5"/><path d="M5 9V4h14v5a7 7 0 01-14 0z"/></svg>);
const IcoBall   =({s=22,c="currentColor"})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>);
const IcoLive   =({s=22,c="currentColor"})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M6.3 6.3a8 8 0 000 11.4M17.7 6.3a8 8 0 010 11.4M3.5 3.5a12 12 0 000 17M20.5 3.5a12 12 0 010 17"/></svg>);
const IcoChart  =({s=22,c="currentColor"})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="17" r="1.5"/><circle cx="12" cy="11" r="1.5"/><circle cx="17" cy="6" r="1.5"/><path d="M7 15.5l5-4.5 5-5M3 20h18"/></svg>);
const IcoShield =({s=22,c="currentColor"})=>(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>);

// ── Shared UI ─────────────────────────────────────────────────
const Flag=({code,size=28})=>(
  <img src={`https://flagcdn.com/w${size<=24?20:40}/${code}.png`}
    style={{width:size,height:Math.round(size*.66),objectFit:"cover",borderRadius:2,flexShrink:0,display:"inline-block",verticalAlign:"middle"}}
    alt="" onError={e=>{e.target.style.opacity=0;}}/>
);
const Card=({children,accent,style={}})=>(
  <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${accent?C.borderAccent:C.border}`,marginBottom:12,...style}}>{children}</div>
);
const SecHead=({label,sub,right})=>(
  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
    <div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:C.accent,letterSpacing:1.5,lineHeight:1}}>{label}</div>
      {sub&&<div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginTop:3}}>{sub}</div>}
    </div>
    {right}
  </div>
);
const SaveBadge=({status})=>{
  if(status==="idle") return null;
  const map={saving:[C.muted,"Saving…"],saved:[C.green,"✓ Saved"],error:[C.red,"✗ Failed"]};
  const[color,label]=map[status]||map.saved;
  return <span style={{color,fontFamily:"'Barlow',sans-serif",fontSize:11,fontWeight:600}}>{label}</span>;
};
const Spinner=()=>(
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:C.bg}}>
    <div style={{textAlign:"center"}}><WCCLogo size={72}/><p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",marginTop:16}}>Loading…</p></div>
  </div>
);
const PtsTag=({pts,pending})=>{
  if(pending) return <span style={{background:"rgba(100,116,139,.15)",color:C.muted,fontSize:10,fontWeight:600,padding:"1px 7px",borderRadius:5,flexShrink:0}}>—</span>;
  if(pts>=3)  return <span style={{background:"rgba(34,197,94,.15)",color:C.green,fontSize:10,fontWeight:600,padding:"1px 7px",borderRadius:5,flexShrink:0}}>+{pts}</span>;
  if(pts>=1)  return <span style={{background:"rgba(245,158,11,.15)",color:C.amber,fontSize:10,fontWeight:600,padding:"1px 7px",borderRadius:5,flexShrink:0}}>+{pts}</span>;
  return       <span style={{background:"rgba(239,68,68,.15)",color:C.red,fontSize:10,fontWeight:600,padding:"1px 7px",borderRadius:5,flexShrink:0}}>0</span>;
};
const ordinal=n=>n?`${n}${["st","nd","rd"][((n%100-11)%10)-1]||"th"}`:"—";

// ── Helpers ───────────────────────────────────────────────────
const initGroupPicks=()=>{const p={};Object.keys(WC_GROUPS).forEach(g=>{p[g]=[...WC_GROUPS[g]];});return p;};

const buildR32=(groupPicks,wildcardPicks)=>{
  const g=(grp,pos)=>groupPicks[grp]?.[pos]||null;
  const allThirds=Object.keys(WC_GROUPS).map(grp=>groupPicks[grp]?.[2]).filter(Boolean);
  const wcTeams=(wildcardPicks||[]).map(code=>allThirds.find(t=>t?.code===code)).filter(Boolean);
  const wc=i=>wcTeams[i]||null;
  return [
    [g("A",0),g("B",1)],[g("C",0),g("D",1)],[g("E",0),g("F",1)],[g("G",0),g("H",1)],
    [g("B",0),g("A",1)],[g("D",0),g("C",1)],[g("F",0),g("E",1)],[g("H",0),g("G",1)],
    [g("I",0),g("J",1)],[g("K",0),g("L",1)],[g("J",0),g("I",1)],[g("L",0),g("K",1)],
    [wc(0),wc(1)],[wc(2),wc(3)],[wc(4),wc(5)],[wc(6),wc(7)],
  ];
};

function getEliminatedCodes(results){
  const eliminated=new Set();
  const koR=results?.knockout_results||{};
  ["r32","r16","qf","sf"].forEach(round=>{
    const roundResults=koR[round]||{};
    // For each played match, the loser is eliminated
    Object.values(roundResults).forEach(winner=>{if(winner?.code) eliminated.add("__placeholder__");});
  });
  // Build set of winners at each stage
  const allWinners=new Set();
  ["r32","r16","qf","sf"].forEach(round=>{
    Object.values(koR[round]||{}).forEach(t=>{if(t?.code) allWinners.add(t.code);});
  });
  if(koR.champion?.code) allWinners.add(koR.champion.code);
  // Teams that appeared in knockout but didn't win any match they played
  const allPlayed=new Set();
  ["r32","r16","qf","sf"].forEach(round=>{
    const actualMatches=koR[round]||{};
    const prevRound=ROUNDS[ROUNDS.findIndex(r=>r.id===round)-1];
    // All teams that played in this round = winners of previous round + r32 starters
    Object.values(actualMatches).forEach(winner=>{
      // winner advanced, loser eliminated — but we don't track losers explicitly
      // so just mark teams that never appear as winners in any later round
      if(winner?.code) allPlayed.add(winner.code);
    });
  });
  return eliminated;
}

function getTeamsAlive(bracket,results){
  const koR=results?.knockout_results||{};
  const ko=bracket?.knockout_picks||{};
  if(!Object.keys(koR).length) return null; // tournament not started
  // Winners at each actual stage
  const actualWinners=new Set();
  ["r32","r16","qf","sf"].forEach(r=>{Object.values(koR[r]||{}).forEach(t=>{if(t?.code) actualWinners.add(t.code);});});
  if(koR.champion?.code) actualWinners.add(koR.champion.code);
  // Teams this user still has alive = picked teams that are still winning
  const pickedCodes=new Set();
  ["r16","qf","sf"].forEach(r=>{Object.values(ko[r]||{}).forEach(t=>{if(t?.code) pickedCodes.add(t.code);});});
  if(ko.champion?.code) pickedCodes.add(ko.champion.code);
  // A team is alive if it's a future pick OR it won its most recent actual match
  let alive=0;
  pickedCodes.forEach(code=>{
    // Find the furthest stage this team has been picked
    let furthestPicked="r16";
    ["r16","qf","sf"].forEach(r=>{if(Object.values(ko[r]||{}).some(t=>t?.code===code)) furthestPicked=r;});
    if(ko.champion?.code===code) furthestPicked="champion";
    // Is this team still in the actual tournament?
    const isActuallyEliminated=["r32","r16","qf","sf"].some(r=>{
      const actuals=Object.values(koR[r]||{});
      const nextRound=ROUNDS[ROUNDS.findIndex(x=>x.id===r)+1];
      if(!nextRound) return false;
      const nextWinners=Object.values(koR[nextRound.id]||{}).map(t=>t?.code);
      return actuals.some(t=>t?.code===code)&&!nextWinners.includes(code);
    });
    if(!isActuallyEliminated) alive++;
  });
  return alive;
}

function calculateScore(bracket,results,scoring=DEFAULT_SCORING){
  if(!results||!bracket) return{total:0};
  let total=0;
  const gPicks=bracket.group_picks||{},gResults=results.group_results||{},wcCodes=results.wildcard_codes||[];
  Object.keys(WC_GROUPS).forEach(g=>{
    const predicted=gPicks[g]||[],actual=gResults[g]||[];
    if(!actual.length) return;
    let gPts=0,exact=0;
    predicted.forEach((team,i)=>{
      const aIdx=actual.findIndex(t=>t.code===team.code);
      if(aIdx===i){gPts+=scoring.exactPos;exact++;}
      else if(aIdx<=1) gPts+=scoring.advancedWrong;
      else if(wcCodes.includes(team.code)&&aIdx===2) gPts+=scoring.wildcardCorrect;
    });
    if(exact===4) gPts+=scoring.perfectGroup;
    total+=gPts;
  });
  (bracket.wildcard_picks||[]).forEach(code=>{if(wcCodes.includes(code)) total+=scoring.wildcardCorrect;});
  const ko=bracket.knockout_picks||{},koR=results.knockout_results||{};
  ["r32","r16","qf","sf"].forEach(round=>{
    const actual=koR[round]||{},predicted=ko[round]||{};
    Object.keys(actual).forEach(idx=>{if(predicted[+idx]?.code===actual[idx]?.code) total+=scoring[round];});
  });
  if(ko.thirdPlace?.code&&koR.thirdPlace?.code===ko.thirdPlace.code) total+=scoring.third;
  if(ko.champion?.code&&koR.champion?.code===ko.champion.code) total+=scoring.champion;
  return{total};
}

function calculateProjected(bracket,results,oddsMap,scoring=DEFAULT_SCORING){
  const base=calculateScore(bracket,results,scoring).total;
  if(!bracket?.knockout_picks) return base;
  let proj=base;
  const ko=bracket.knockout_picks,koR=results?.knockout_results||{};
  ["r32","r16","qf","sf"].forEach(round=>{
    const actual=koR[round]||{},predicted=ko[round]||{};
    Object.keys(predicted).forEach(idx=>{
      if(actual[+idx]) return;
      const pick=predicted[+idx];
      if(pick&&oddsMap[pick.code]) proj+=scoring[round];
    });
  });
  if(!koR.champion&&ko.champion&&oddsMap[ko.champion.code]) proj+=scoring.champion;
  return proj;
}

function computeStats(allBrackets){
  const n=allBrackets.length;
  if(!n) return{champDist:[],groupConsensus:[],contrarian:[]};
  const champCounts={};
  allBrackets.forEach(b=>{const code=b.knockout_picks?.champion?.code;if(code) champCounts[code]=(champCounts[code]||0)+1;});
  const champDist=Object.entries(champCounts)
    .map(([code,count])=>({team:ALL_TEAMS.find(t=>t.code===code),pct:Math.round(count/n*100),count}))
    .filter(x=>x.team).sort((a,b)=>b.count-a.count);
  const groupConsensus=Object.keys(WC_GROUPS).map(g=>{
    const counts={};
    allBrackets.forEach(b=>{const code=b.group_picks?.[g]?.[0]?.code;if(code) counts[code]=(counts[code]||0)+1;});
    const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    if(!top) return null;
    return{group:g,team:WC_GROUPS[g].find(t=>t.code===top[0]),pct:Math.round(top[1]/n*100)};
  }).filter(Boolean);
  return{champDist,groupConsensus,contrarian:champDist.filter(x=>x.pct<=25&&x.pct>0)};
}

function computeRooting(myBracket,allBrackets){
  if(!myBracket||!allBrackets.length) return[];
  const ko=myBracket.knockout_picks||{};
  const allCodes=new Set();
  ["r32","r16","qf","sf"].forEach(r=>{Object.values(ko[r]||{}).forEach(t=>{if(t?.code) allCodes.add(t.code);});});
  if(ko.champion?.code) allCodes.add(ko.champion.code);
  const remaining=[];
  allCodes.forEach(code=>{
    const team=ALL_TEAMS.find(t=>t.code===code);if(!team) return;
    const othersHave=allBrackets.filter(b=>b.user_id!==myBracket.user_id&&(
      Object.values(b.knockout_picks?.sf||{}).some(t=>t?.code===code)||b.knockout_picks?.champion?.code===code
    )).length;
    const uniq=1-(othersHave/Math.max(allBrackets.length-1,1));
    if(uniq>0.3) remaining.push({team,uniqueness:Math.round(uniq*100)});
  });
  return remaining.sort((a,b)=>b.uniqueness-a.uniqueness).slice(0,6);
}

function computeMatchEdge(apiMatch,allBrackets,results,scoring=DEFAULT_SCORING){
  if(!apiMatch||!allBrackets.length) return null;
  const homeCode=NAME_TO_CODE[apiMatch.homeTeam?.name];
  const awayCode=NAME_TO_CODE[apiMatch.awayTeam?.name];
  const roundId=STAGE_TO_ROUND[apiMatch.stage];
  if(!roundId||roundId==="final"||!homeCode||!awayCode) return null;
  const roundPts=scoring[roundId]||0;
  const currentScores=allBrackets.map(b=>({...b,score:calculateScore(b,results,scoring).total}));
  const currentSorted=[...currentScores].sort((a,b)=>b.score-a.score);
  return [{code:homeCode,label:apiMatch.homeTeam?.shortName||apiMatch.homeTeam?.name},
          {code:awayCode,label:apiMatch.awayTeam?.shortName||apiMatch.awayTeam?.name}].map(winner=>{
    const withDelta=currentScores.map(b=>{
      const picked=Object.values(b.knockout_picks?.[roundId]||{}).some(t=>t?.code===winner.code);
      return{...b,delta:picked?roundPts:0,projected:b.score+(picked?roundPts:0)};
    });
    const sorted=[...withDelta].sort((a,b)=>b.projected-a.projected);
    return{winner,standings:sorted.map((b,newPos)=>({...b,newPos:newPos+1,
      oldPos:currentSorted.findIndex(x=>x.user_id===b.user_id)+1,
      posChange:(currentSorted.findIndex(x=>x.user_id===b.user_id)+1)-(newPos+1),
    }))};
  });
}

const toET=(utcStr)=>{
  if(!utcStr) return "";
  return new Date(utcStr).toLocaleString("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:true});
};
const toETTime=(utcStr)=>{
  if(!utcStr) return "";
  return new Date(utcStr).toLocaleString("en-US",{timeZone:"America/New_York",hour:"numeric",minute:"2-digit",hour12:true});
};
const msUntil=(utcStr)=>new Date(utcStr)-new Date();

// ── Login ─────────────────────────────────────────────────────
function LoginScreen({joinPool}){
  const[mode,setMode]=useState("login");
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[name,setName]=useState("");
  const[error,setError]=useState("");
  const[loading,setLoading]=useState(false);
  const[sent,setSent]=useState(false);

  const handleGoogle=async()=>{
    setLoading(true);setError("");
    const{error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+window.location.search}});
    if(error){setError(error.message);setLoading(false);}
  };
  const handleEmail=async()=>{
    setLoading(true);setError("");
    if(mode==="signup"){
      const{error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name}}});
      if(error) setError(error.message); else setSent(true);
    } else {
      const{error}=await supabase.auth.signInWithPassword({email,password});
      if(error) setError(error.message);
    }
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <WCCLogo size={80}/>
      <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:C.accent,margin:"16px 0 4px",letterSpacing:3,textAlign:"center"}}>WORLD CUP CHALLENGE</h1>
      <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:14,marginBottom:joinPool?16:32,textAlign:"center"}}>2026 FIFA · Make your picks, track live scores</p>
      {joinPool&&(
        <div style={{background:"rgba(6,182,212,.1)",border:`1px solid ${C.borderAccent}`,borderRadius:10,padding:"12px 20px",marginBottom:24,textAlign:"center",maxWidth:340,width:"100%"}}>
          <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,marginBottom:4}}>YOU'VE BEEN INVITED!</div>
          <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:14}}>Sign in to join <strong>{joinPool.name}</strong></div>
        </div>
      )}
      {sent?(
        <div style={{background:C.card,borderRadius:14,padding:28,maxWidth:340,width:"100%",textAlign:"center",border:`1px solid ${C.borderAccent}`}}>
          <div style={{fontSize:44,marginBottom:12}}>📧</div>
          <h3 style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,margin:"0 0 10px"}}>CHECK YOUR EMAIL</h3>
          <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13,lineHeight:1.6}}>Confirmation sent to <strong style={{color:C.text}}>{email}</strong>.</p>
        </div>
      ):(
        <div style={{background:C.card,borderRadius:14,padding:24,maxWidth:340,width:"100%",border:`1px solid ${C.borderAccent}`}}>
          <button onClick={handleGoogle} disabled={loading} style={{width:"100%",padding:13,background:"#fff",color:"#333",border:"none",borderRadius:10,fontFamily:"'Barlow',sans-serif",fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:20}}>
            <img src="https://www.google.com/favicon.ico" width={18} height={18} alt=""/>Continue with Google
          </button>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
            <div style={{flex:1,height:1,background:C.border}}/><span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>or email</span><div style={{flex:1,height:1,background:C.border}}/>
          </div>
          <div style={{display:"flex",marginBottom:16}}>
            {["login","signup"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:8,background:mode===m?C.accent:C.card2,color:mode===m?"#0a0e1a":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:.5,border:`1px solid ${C.borderAccent}`,borderRadius:m==="login"?"8px 0 0 8px":"0 8px 8px 0",cursor:"pointer"}}>
                {m==="login"?"SIGN IN":"CREATE ACCOUNT"}
              </button>
            ))}
          </div>
          {mode==="signup"&&<input placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} style={inp}/>}
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={inp}/>
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleEmail()} style={{...inp,marginBottom:14}}/>
          {error&&<p style={{color:C.red,fontFamily:"'Barlow',sans-serif",fontSize:13,marginBottom:12}}>{error}</p>}
          <button onClick={handleEmail} disabled={loading||!email||!password||(mode==="signup"&&!name)} style={{...btn(true,loading||!email||!password||(mode==="signup"&&!name)),width:"100%"}}>
            {loading?"…":mode==="login"?"SIGN IN":"CREATE ACCOUNT"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Dynamic Hero ──────────────────────────────────────────────
function DynamicHero({matches,locked,currentPool,displayName,bracketComplete,bracketName}){
  const[timeLeft,setTimeLeft]=useState({});
  const[nextMatchTime,setNextMatchTime]=useState(null);
  const[liveMatch,setLiveMatch]=useState(null);

  useEffect(()=>{
    const live=matches.find(m=>["IN_PLAY","PAUSED","HALFTIME"].includes(m.status));
    setLiveMatch(live||null);
    const upcoming=matches.filter(m=>["SCHEDULED","TIMED"].includes(m.status)).sort((a,b)=>new Date(a.utcDate)-new Date(b.utcDate));
    if(upcoming[0]) setNextMatchTime(upcoming[0].utcDate);
  },[matches]);

  useEffect(()=>{
    const target=!locked?new Date("2026-06-11T18:00:00Z"):nextMatchTime?new Date(nextMatchTime):null;
    if(!target) return;
    const tick=()=>{
      const diff=target-new Date();
      if(diff<=0){setTimeLeft({expired:true});return;}
      setTimeLeft({days:Math.floor(diff/86400000),hrs:Math.floor((diff%86400000)/3600000),min:Math.floor((diff%3600000)/60000),sec:Math.floor((diff%60000)/1000)});
    };
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[locked,nextMatchTime]);

  const td=v=>String(v??0).padStart(2,"0");
  const firstName=displayName?.split(" ")[0]||"there";

  const renderCountdown=()=>{
    // Live match
    if(liveMatch){
      const hCode=NAME_TO_CODE[liveMatch.homeTeam?.name]||"";
      const aCode=NAME_TO_CODE[liveMatch.awayTeam?.name]||"";
      const min=liveMatch.minute;
      const status=liveMatch.status==="HALFTIME"?"HT":liveMatch.status==="PAUSED"?"PAUSED":`${min||""}′`;
      return(
        <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",borderRadius:12,padding:"12px 16px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,justifyContent:"center"}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:C.red,display:"inline-block"}}/>
            <span style={{color:C.red,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1}}>LIVE · {status}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
            {hCode&&<Flag code={hCode} size={28}/>}
            <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:15,fontWeight:600}}>{liveMatch.homeTeam?.shortName||liveMatch.homeTeam?.name}</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:24}}>{liveMatch.score?.fullTime?.home??liveMatch.score?.halfTime?.home??0}</span>
              <span style={{color:C.muted}}>:</span>
              <span style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:24}}>{liveMatch.score?.fullTime?.away??liveMatch.score?.halfTime?.away??0}</span>
            </div>
            <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:15,fontWeight:600}}>{liveMatch.awayTeam?.shortName||liveMatch.awayTeam?.name}</span>
            {aCode&&<Flag code={aCode} size={28}/>}
          </div>
        </div>
      );
    }
    // Between matches — show next match countdown
    if(locked&&nextMatchTime&&!timeLeft.expired){
      const nextM=matches.find(m=>m.utcDate===nextMatchTime);
      const hCode=nextM?NAME_TO_CODE[nextM.homeTeam?.name]||"":"";
      const aCode=nextM?NAME_TO_CODE[nextM.awayTeam?.name]||"":"";
      return(
        <div style={{marginBottom:8}}>
          <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,marginBottom:6,textAlign:"center"}}>NEXT MATCH</div>
          {nextM&&(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8}}>
              {hCode&&<Flag code={hCode} size={22}/>}
              <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13}}>{nextM.homeTeam?.name}</span>
              <span style={{color:C.muted,fontSize:12}}>vs</span>
              <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13}}>{nextM.awayTeam?.name}</span>
              {aCode&&<Flag code={aCode} size={22}/>}
            </div>
          )}
          <div style={{display:"flex",justifyContent:"center",gap:4}}>
            {[["HRS",timeLeft.hrs],["MIN",timeLeft.min],["SEC",timeLeft.sec]].map(([label,val],i)=>(
              <span key={label} style={{display:"flex",alignItems:"center"}}>
                <span style={{display:"flex",flexDirection:"column",alignItems:"center",background:"rgba(0,0,0,.4)",borderRadius:8,padding:"5px 10px",minWidth:46}}>
                  <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,lineHeight:1}}>{td(val)}</span>
                  <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:9,marginTop:2}}>{label}</span>
                </span>
                {i<2&&<span style={{color:C.accent,fontSize:16,margin:"0 2px",opacity:.4}}>:</span>}
              </span>
            ))}
          </div>
          <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,marginTop:6,textAlign:"center"}}>{toET(nextMatchTime)} ET</div>
        </div>
      );
    }
    // Pre-tournament countdown
    if(!locked){
      return(
        <>
          <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:8}}>
            {[["DAYS",timeLeft.days],["HRS",timeLeft.hrs],["MIN",timeLeft.min],["SEC",timeLeft.sec]].map(([label,val],i)=>(
              <span key={label} style={{display:"flex",alignItems:"center"}}>
                <span style={{display:"flex",flexDirection:"column",alignItems:"center",background:"rgba(0,0,0,.4)",borderRadius:8,padding:"6px 10px",minWidth:50}}>
                  <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:24,lineHeight:1}}>{td(val)}</span>
                  <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:9,marginTop:2}}>{label}</span>
                </span>
                {i<3&&<span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:18,margin:"0 2px",opacity:.35}}>:</span>}
              </span>
            ))}
          </div>
          <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>Picks lock Jun 11 · Tournament Jun 11 – Jul 19</div>
        </>
      );
    }
    return <span style={{display:"inline-block",background:"rgba(239,68,68,.15)",color:C.red,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,padding:"5px 18px",borderRadius:20}}>🔴 TOURNAMENT LIVE</span>;
  };

  return(
    <div style={{textAlign:"center",padding:"22px 16px 18px",marginBottom:12,borderBottom:`1px solid ${C.borderAccent}`}}>
      <WCCLogo size={64}/>
      <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,letterSpacing:2,marginTop:10,marginBottom:4}}>WORLD CUP CHALLENGE · 2026</div>
      <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:22,fontWeight:600,marginBottom:2}}>Welcome back, {firstName}</div>
      <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:16}}>{currentPool?.name||"World Cup Challenge"}</div>
      {renderCountdown()}
    </div>
  );
}

// ── Head-to-Head Modal ────────────────────────────────────────
function HeadToHeadModal({myBracket,opponent,results,onClose}){
  const[tab,setTab]=useState("groups");
  if(!myBracket||!opponent) return null;
  const scoring=results?.scoring_config||DEFAULT_SCORING;
  const gResults=results?.group_results||{};
  const koR=results?.knockout_results||{};

  const GroupsView=()=>(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:8}}>
      {Object.keys(WC_GROUPS).map(g=>{
        const myPicks=myBracket.group_picks?.[g]||WC_GROUPS[g];
        const opPicks=opponent.group_picks?.[g]||WC_GROUPS[g];
        const actual=gResults[g]||[];
        return(
          <div key={g} style={{background:C.card2,borderRadius:8,padding:10,border:`.5px solid ${C.border}`}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,color:C.accent,marginBottom:6,display:"flex",justifyContent:"space-between"}}>
              <span>Group {g}</span>
              <div style={{display:"flex",gap:12}}>
                <span style={{color:C.muted,fontSize:10}}>YOU</span>
                <span style={{color:C.muted,fontSize:10}}>{opponent.bracket_name?.split(" ")[0]||"THEM"}</span>
              </div>
            </div>
            {[0,1,2,3].map(i=>{
              const rankLabel=["1st","2nd","3rd","4th"][i];
              const myTeam=myPicks[i],opTeam=opPicks[i];
              const myMatch=actual.length?actual[i]?.code===myTeam?.code:null;
              const opMatch=actual.length?actual[i]?.code===opTeam?.code:null;
              const same=myTeam?.code===opTeam?.code;
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:i<3?`.5px solid ${C.border}`:"none",background:!same?"rgba(245,158,11,.04)":"transparent",borderRadius:4}}>
                  <span style={{color:C.muted,fontSize:9,width:20,flexShrink:0}}>{rankLabel}</span>
                  <Flag code={myTeam?.code||""} size={16}/>
                  <span style={{color:myMatch===true?C.green:myMatch===false?C.red:C.text,fontSize:10,fontFamily:"'Barlow',sans-serif",flex:1}}>{myTeam?.name||"?"}</span>
                  {!same&&<span style={{color:C.amber,fontSize:9,flexShrink:0}}>≠</span>}
                  {same&&<span style={{color:C.muted,fontSize:9,flexShrink:0}}>✓</span>}
                  <span style={{color:opMatch===true?C.green:opMatch===false?C.red:C.text,fontSize:10,fontFamily:"'Barlow',sans-serif",flex:1,textAlign:"right"}}>{opTeam?.name||"?"}</span>
                  <Flag code={opTeam?.code||""} size={16}/>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  const KnockoutView=()=>(
    <div>
      {ROUNDS.map(round=>{
        const myPicks=myBracket.knockout_picks?.[round.id]||{};
        const opPicks=opponent.knockout_picks?.[round.id]||{};
        const actual=koR[round.id]||{};
        const allIdx=[...new Set([...Object.keys(myPicks),...Object.keys(opPicks)])].sort((a,b)=>+a-+b);
        if(!allIdx.length) return null;
        return(
          <div key={round.id} style={{marginBottom:12}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:C.accent,letterSpacing:1,marginBottom:6}}>{round.fullLabel}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:6}}>
              {allIdx.map(idx=>{
                const myPick=myPicks[+idx],opPick=opPicks[+idx],act=actual[+idx];
                const same=myPick?.code===opPick?.code;
                return(
                  <div key={idx} style={{background:C.card2,borderRadius:7,padding:"8px 10px",border:`.5px solid ${same?C.border:C.amber+"44"}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:same?0:4}}>
                      {myPick&&<><Flag code={myPick.code} size={18}/><span style={{color:act?.code===myPick.code?C.green:act?C.red:C.text,fontSize:11,fontFamily:"'Barlow',sans-serif",flex:1}}>{myPick.name}</span></>}
                      {!same&&opPick&&<><span style={{color:C.amber,fontSize:10}}>vs</span><span style={{color:act?.code===opPick.code?C.green:act?C.red:C.text,fontSize:11,fontFamily:"'Barlow',sans-serif",flex:1,textAlign:"right"}}>{opPick.name}</span><Flag code={opPick.code} size={18}/></>}
                      {same&&<span style={{color:C.muted,fontSize:10,marginLeft:"auto"}}>same pick</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{display:"flex",gap:10,marginTop:8}}>
        {[myBracket,opponent].map((b,idx)=>{
          const champ=b.knockout_picks?.champion;
          const actual=koR.champion;
          const correct=actual&&champ&&actual.code===champ.code;
          return champ?(
            <div key={idx} style={{flex:1,background:C.card2,borderRadius:8,padding:"10px 12px",textAlign:"center",border:`1px solid ${correct?C.green+"44":C.borderAccent}`}}>
              <div style={{color:C.muted,fontSize:10,marginBottom:6}}>🏆 {idx===0?"YOUR":"THEIR"} CHAMPION</div>
              <Flag code={champ.code} size={28}/>
              <div style={{color:correct?C.green:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,marginTop:4}}>{champ.name}</div>
              {b.champion_goal_diff_pick!=null&&<div style={{color:C.muted,fontSize:11,marginTop:2}}>GD guess: {b.champion_goal_diff_pick>0?"+":""}{b.champion_goal_diff_pick}</div>}
            </div>
          ):null;
        })}
      </div>
    </div>
  );

  const myScore=calculateScore(myBracket,results,scoring).total;
  const opScore=calculateScore(opponent,results,scoring).total;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:600,overflowY:"auto"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:12,paddingBottom:80}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:C.accent,letterSpacing:1}}>HEAD TO HEAD</div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,padding:"8px 16px",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",fontSize:13}}>CLOSE</button>
        </div>
        {/* Score summary */}
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,marginBottom:14,alignItems:"center"}}>
          <div style={{background:C.card,borderRadius:10,padding:"12px",textAlign:"center",border:`1px solid ${myScore>opScore?C.green+"44":C.borderAccent}`}}>
            <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,marginBottom:4}}>{myBracket.bracket_name}</div>
            <div style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:28}}>{myScore}</div>
            <div style={{color:C.muted,fontSize:11,fontFamily:"'Barlow',sans-serif"}}>YOU</div>
          </div>
          <div style={{color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:18}}>VS</div>
          <div style={{background:C.card,borderRadius:10,padding:"12px",textAlign:"center",border:`1px solid ${opScore>myScore?C.green+"44":C.borderAccent}`}}>
            <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,marginBottom:4}}>{opponent.bracket_name}</div>
            <div style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:28}}>{opScore}</div>
            <div style={{color:C.muted,fontSize:11,fontFamily:"'Barlow',sans-serif"}}>{opponent.display_name||"—"}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[["groups","Groups"],["knockout","Knockout"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"8px",background:tab===id?C.accent:C.card,color:tab===id?"#0a0e1a":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:.5,border:`1px solid ${tab===id?C.accent:C.border}`,borderRadius:8,cursor:"pointer"}}>{label}</button>
          ))}
        </div>
        <div style={{fontSize:10,color:C.muted,fontFamily:"'Barlow',sans-serif",marginBottom:10,display:"flex",gap:12}}>
          <span style={{color:C.green}}>■</span> correct &nbsp;
          <span style={{color:C.red}}>■</span> wrong &nbsp;
          <span style={{color:C.amber}}>≠</span> different pick
        </div>
        {tab==="groups"&&<GroupsView/>}
        {tab==="knockout"&&<KnockoutView/>}
      </div>
    </div>
  );
}

// ── Standings History Chart ───────────────────────────────────
function StandingsChart({history,userId,allBrackets}){
  if(!history||history.length<2) return(
    <div style={{textAlign:"center",padding:"20px 0",color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>
      Standings history builds up as matches are played. Check back after several match days.
    </div>
  );
  const n=allBrackets.length;
  const W=320,H=120,padL=24,padR=8,padT=10,padB=20;
  const iW=W-padL-padR,iH=H-padT-padB;
  const xScale=i=>(i/(history.length-1))*iW+padL;
  const yScale=rank=>padT+(rank-1)/(n-1)*iH;
  const COLORS=["#06b6d4","#f59e0b","#22C55E","#a855f7","#ef4444","#f97316","#ec4899","#8b5cf6","#14b8a6","#84cc16","#fb923c","#06b6d4"];

  return(
    <div style={{overflowX:"auto"}}>
      <svg width={W} height={H} style={{display:"block",maxWidth:"100%"}}>
        {/* Grid */}
        {[1,Math.ceil(n/2),n].map(rank=>(
          <g key={rank}>
            <line x1={padL} y1={yScale(rank)} x2={W-padR} y2={yScale(rank)} stroke={C.border} strokeWidth=".5"/>
            <text x={padL-4} y={yScale(rank)+4} textAnchor="end" fontSize="9" fill={C.muted} fontFamily="sans-serif">{rank}</text>
          </g>
        ))}
        {/* Lines per bracket */}
        {allBrackets.map((b,bIdx)=>{
          const isMe=b.user_id===userId;
          const points=history.map(snap=>{
            const entry=snap.rankings?.find(r=>r.user_id===b.user_id);
            return entry?.rank||null;
          }).filter(r=>r!==null);
          if(points.length<2) return null;
          const validHistory=history.filter((_,i)=>history[i].rankings?.find(r=>r.user_id===b.user_id));
          const d=points.map((rank,i)=>`${i===0?"M":"L"}${xScale(validHistory.indexOf(validHistory[i]))} ${yScale(rank)}`).join(" ");
          return(
            <path key={b.user_id} d={d} fill="none"
              stroke={isMe?C.accent:COLORS[bIdx%COLORS.length]}
              strokeWidth={isMe?2.5:1}
              strokeOpacity={isMe?1:.4}/>
          );
        })}
        {/* Date labels */}
        {history.filter((_,i)=>i===0||i===history.length-1||i===Math.floor(history.length/2)).map((snap,_,arr)=>{
          const i=history.indexOf(snap);
          return(
            <text key={i} x={xScale(i)} y={H-4} textAnchor="middle" fontSize="8" fill={C.muted} fontFamily="sans-serif">
              {new Date(snap.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
            </text>
          );
        })}
      </svg>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
        {allBrackets.map((b,i)=>(
          <div key={b.user_id} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,fontFamily:"'Barlow',sans-serif",color:b.user_id===userId?C.accent:C.muted}}>
            <div style={{width:12,height:2,background:COLORS[i%COLORS.length],opacity:b.user_id===userId?1:.5,borderRadius:1}}/>
            {b.bracket_name?.split(" ")[0]||"—"}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Group Card ────────────────────────────────────────────────
function GroupCard({groupId,teams,onReorder,locked,actualGroup}){
  const rankLabel=["1st","2nd","3rd","4th"];
  const rankColor=["#06b6d4","#94a3b8","#92400e","#334155"];
  const rankBg=["rgba(6,182,212,0.1)","rgba(148,163,184,0.06)","rgba(120,80,30,0.07)","transparent"];
  const dragIdx=useRef(null);
  const[dragOver,setDragOver]=useState(null);

  const move=(i,dir)=>{
    if(locked) return;
    const next=[...teams],t=i+dir;
    if(t<0||t>3) return;
    [next[i],next[t]]=[next[t],next[i]];onReorder(next);
  };
  const onDragStart=(e,i)=>{if(locked){e.preventDefault();return;}dragIdx.current=i;e.dataTransfer.effectAllowed="move";};
  const onDragEnter=(e,i)=>{e.preventDefault();setDragOver(i);};
  const onDragOver=(e)=>{e.preventDefault();e.dataTransfer.dropEffect="move";};
  const onDrop=(e,i)=>{
    e.preventDefault();
    if(dragIdx.current!==null&&dragIdx.current!==i){const next=[...teams];const[rem]=next.splice(dragIdx.current,1);next.splice(i,0,rem);onReorder(next);}
    dragIdx.current=null;setDragOver(null);
  };
  const onDragEnd=()=>{dragIdx.current=null;setDragOver(null);};
  const hasLive=actualGroup&&actualGroup.length>0;

  return(
    <div style={{background:C.card,borderRadius:12,padding:12,border:`1px solid ${C.borderAccent}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <div style={{background:C.accent,color:"#0a0e1a",fontFamily:"'Bebas Neue',sans-serif",fontSize:13,width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{groupId}</div>
        <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1}}>GROUP {groupId}</span>
        {hasLive&&<span style={{marginLeft:"auto",color:C.green,fontFamily:"'Barlow',sans-serif",fontSize:10,fontWeight:600}}>FINAL</span>}
        {!locked&&!hasLive&&<span style={{marginLeft:"auto",color:C.muted,fontSize:10,fontFamily:"'Barlow',sans-serif"}}>drag · ▲▼</span>}
      </div>
      {hasLive&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:6,marginBottom:4,paddingRight:4}}>
          <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:9,letterSpacing:.5}}>YOUR PICK</span>
          <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:9,letterSpacing:.5}}>ACTUAL</span>
        </div>
      )}
      {teams.map((team,i)=>{
        const isOver=dragOver===i&&dragIdx.current!==null&&dragIdx.current!==i;
        const actualPos=hasLive?actualGroup.findIndex(t=>t.code===team.code):-1;
        const correct=hasLive&&actualPos===i;
        const actualTeam=hasLive?actualGroup[i]:null;
        return(
          <div key={team.code} draggable={!locked&&!hasLive}
            onDragStart={e=>onDragStart(e,i)} onDragEnter={e=>onDragEnter(e,i)}
            onDragOver={onDragOver} onDrop={e=>onDrop(e,i)} onDragEnd={onDragEnd}
            style={{display:"flex",alignItems:"center",gap:7,background:isOver?"rgba(6,182,212,0.2)":rankBg[i],borderRadius:7,padding:"7px 8px",marginBottom:i<3?4:0,
              border:isOver?`1.5px dashed ${C.accent}`:i===0?`1px solid ${C.accentDim}`:"1px solid transparent",
              cursor:locked||hasLive?"default":"grab",userSelect:"none",WebkitUserSelect:"none"}}>
            {!locked&&!hasLive&&<span style={{color:C.muted,fontSize:11,flexShrink:0}}>⠿</span>}
            <span style={{color:rankColor[i],fontFamily:"'Bebas Neue',sans-serif",fontSize:11,width:22,flexShrink:0}}>{rankLabel[i]}</span>
            <Flag code={team.code} size={20}/>
            <span style={{color:C.text,fontSize:11,fontFamily:"'Barlow',sans-serif",fontWeight:500,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{team.name}</span>
            {hasLive&&(
              <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                <span style={{fontSize:12,color:correct?C.green:C.red}}>{correct?"✓":"✗"}</span>
                {actualTeam&&actualTeam.code!==team.code&&(
                  <div style={{display:"flex",alignItems:"center",gap:3,opacity:.55}}>
                    <Flag code={actualTeam.code} size={16}/>
                    <span style={{fontSize:9,color:C.muted}}>{actualTeam.name.split(" ")[0]}</span>
                  </div>
                )}
              </div>
            )}
            {!locked&&!hasLive&&(
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {[[-1,"▲"],[1,"▼"]].map(([dir,sym])=>(
                  <button key={sym} onClick={e=>{e.stopPropagation();move(i,dir);}} disabled={(dir===-1&&i===0)||(dir===1&&i===3)}
                    style={{background:"transparent",border:`1px solid ${C.accentDim}`,borderRadius:3,width:20,height:16,color:((dir===-1&&i===0)||(dir===1&&i===3))?C.muted:C.accent,cursor:"pointer",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
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

// ── Group Stage Page ──────────────────────────────────────────
function GroupStagePage({groupPicks,setGroupPicks,locked,onNext,results}){
  return(
    <div style={{paddingBottom:90}}>
      <div style={{padding:"14px 14px 10px",background:C.bg,position:"sticky",top:58,zIndex:9,borderBottom:`1px solid ${C.borderAccent}`}}>
        <SecHead label="GROUP STAGE PICKS" sub="Rank all 4 teams 1–4. +3 exact · +1 if they advance · +6 perfect group bonus."/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:10,padding:12}}>
        {Object.keys(WC_GROUPS).map(g=>(
          <GroupCard key={g} groupId={g} teams={groupPicks[g]} locked={locked}
            actualGroup={results?.group_results?.[g]}
            onReorder={order=>setGroupPicks(prev=>({...prev,[g]:order}))}/>
        ))}
      </div>
      {!locked&&<div style={{padding:"0 12px"}}><button onClick={onNext} style={{...btn(true),width:"100%"}}>NEXT: WILDCARD PICKS →</button></div>}
    </div>
  );
}

// ── Wildcard Page ─────────────────────────────────────────────
function WildcardPage({groupPicks,wildcardPicks,setWildcardPicks,locked,onNext,onBack,results}){
  const thirds=Object.keys(WC_GROUPS).map(g=>({group:g,team:groupPicks[g][2]}));
  const actualWC=results?.wildcard_codes||[];
  const hasActual=actualWC.length>0;
  const toggle=code=>{
    if(locked) return;
    setWildcardPicks(prev=>prev.includes(code)?prev.filter(c=>c!==code):prev.length<8?[...prev,code]:prev);
  };
  const remaining=8-wildcardPicks.length;
  return(
    <div style={{paddingBottom:90}}>
      <div style={{padding:"14px 14px 10px",background:C.bg,position:"sticky",top:58,zIndex:9,borderBottom:`1px solid ${C.borderAccent}`}}>
        <SecHead label="WILDCARD PICKS" sub="Pick 8 third-place teams that advance. +2 pts each correct."/>
        {!hasActual&&<span style={{background:remaining===0?C.green:C.accent,color:"#0a0e1a",fontFamily:"'Bebas Neue',sans-serif",fontSize:12,padding:"3px 12px",borderRadius:20}}>
          {wildcardPicks.length}/8{remaining>0?` — pick ${remaining} more`:" — complete!"}
        </span>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:10,padding:12}}>
        {thirds.map(({group,team})=>{
          const sel=wildcardPicks.includes(team.code);
          const disabled=!sel&&wildcardPicks.length>=8;
          const correct=hasActual&&actualWC.includes(team.code);
          return(
            <button key={team.code} onClick={()=>toggle(team.code)} disabled={disabled||locked}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:sel?"rgba(6,182,212,0.13)":C.card,border:`1.5px solid ${sel?C.accent:C.border}`,borderRadius:10,cursor:disabled||locked?"not-allowed":"pointer",opacity:disabled?0.38:1,textAlign:"left",transition:"all .15s"}}>
              {!hasActual&&<div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${sel?C.accent:C.muted}`,background:sel?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {sel&&<span style={{color:"#0a0e1a",fontSize:10,fontWeight:700}}>✓</span>}
              </div>}
              {hasActual&&<span style={{fontSize:14,flexShrink:0,color:correct?C.green:C.red}}>{correct?"✓":"✗"}</span>}
              <Flag code={team.code} size={28}/>
              <div>
                <div style={{color:C.text,fontSize:13,fontFamily:"'Barlow',sans-serif",fontWeight:600}}>{team.name}</div>
                <div style={{color:C.muted,fontSize:11,fontFamily:"'Barlow',sans-serif"}}>3rd · Group {group}</div>
              </div>
              {hasActual&&sel&&<PtsTag pts={correct?2:0} pending={false}/>}
            </button>
          );
        })}
      </div>
      {!locked&&(
        <div style={{padding:"0 12px",display:"flex",gap:10}}>
          <button onClick={onBack} style={{...btn(false),flex:1}}>← BACK</button>
          <button onClick={onNext} disabled={wildcardPicks.length!==8} style={{...btn(true,wildcardPicks.length!==8),flex:2}}>BUILD BRACKET →</button>
        </div>
      )}
    </div>
  );
}

// ── Match Pick Card ───────────────────────────────────────────
function MatchPickCard({num,team1,team2,winner,onPick,locked,actualWinner}){
  const Team=({team})=>{
    if(!team) return(<div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",opacity:.3}}><div style={{width:26,height:17,background:C.card2,borderRadius:2}}/><span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>TBD</span></div>);
    const isW=winner?.code===team.code,isL=winner&&!isW;
    return(
      <button onClick={()=>!locked&&onPick(team)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",background:isW?"rgba(6,182,212,0.15)":"transparent",border:isW?`1px solid ${C.accentDim}`:"1px solid transparent",borderRadius:8,cursor:locked?"default":"pointer",opacity:isL?.35:1,transition:"all .15s",textAlign:"left"}}>
        <Flag code={team.code} size={26}/><span style={{flex:1,color:isW?C.accent:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:isW?700:500}}>{team.name}</span>
        {isW&&<span style={{color:C.accent,fontSize:13}}>✓</span>}
      </button>
    );
  };
  return(
    <div style={{background:C.card,borderRadius:10,padding:"6px",border:`1px solid ${C.border}`}}>
      <div style={{color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:9,letterSpacing:1,padding:"0 6px 5px"}}>MATCH {num}</div>
      <Team team={team1}/><div style={{height:1,background:C.border,margin:"2px 6px"}}/><Team team={team2}/>
      {actualWinner&&winner&&(
        <div style={{padding:"4px 12px"}}>
          {winner.code===actualWinner.code
            ?<span style={{color:C.green,fontSize:10,fontFamily:"'Barlow',sans-serif"}}>✓ Correct +{ROUNDS.find(r=>r.id==="r32")?.pts||2} pts</span>
            :<span style={{color:C.red,fontSize:10,fontFamily:"'Barlow',sans-serif"}}>✗ {actualWinner.name} won</span>
          }
        </div>
      )}
    </div>
  );
}

// ── Knockout Page ─────────────────────────────────────────────
function KnockoutPage({groupPicks,wildcardPicks,knockoutPicks,setKnockoutPicks,locked,onBack,results,championGoalDiff,setChampionGoalDiff}){
  const[activeRound,setActiveRound]=useState("r32");
  const r32Teams=buildR32(groupPicks,wildcardPicks);
  const koR=results?.knockout_results||{};

  const getTeams=(roundId,matchIdx)=>{
    if(roundId==="r32") return r32Teams[matchIdx]||[null,null];
    const prevId=ROUNDS[ROUNDS.findIndex(r=>r.id===roundId)-1].id;
    return[knockoutPicks[prevId]?.[matchIdx*2]||null,knockoutPicks[prevId]?.[matchIdx*2+1]||null];
  };
  const pickWinner=(roundId,matchIdx,team)=>{
    if(!team) return;
    setKnockoutPicks(prev=>{
      const next={...prev,[roundId]:{...(prev[roundId]||{}),[matchIdx]:team}};
      const rIdx=ROUNDS.findIndex(r=>r.id===roundId);
      for(let i=rIdx+1;i<ROUNDS.length;i++){
        const aff=Math.floor(matchIdx/Math.pow(2,i-rIdx));
        if(next[ROUNDS[i].id]?.[aff]){next[ROUNDS[i].id]={...next[ROUNDS[i].id]};delete next[ROUNDS[i].id][aff];}
      }
      return next;
    });
  };
  const isUnlocked=roundId=>{
    const idx=ROUNDS.findIndex(r=>r.id===roundId);if(idx===0) return true;
    const prev=ROUNDS[idx-1];return Object.keys(knockoutPicks[prev.id]||{}).length>=prev.n;
  };
  const sfComplete=Object.keys(knockoutPicks.sf||{}).length>=2;
  const finalT1=knockoutPicks.sf?.[0]||null,finalT2=knockoutPicks.sf?.[1]||null;
  const sfLosers=[0,1].map(i=>{const[t1,t2]=getTeams("sf",i);const w=knockoutPicks.sf?.[i];return[t1,t2].find(t=>t?.code!==w?.code)||null;});
  const currentRound=ROUNDS.find(r=>r.id===activeRound)||ROUNDS[0];
  const matches=Array.from({length:currentRound.n},(_,i)=>({idx:i,teams:getTeams(activeRound,i)}));
  const picked=Object.keys(knockoutPicks[activeRound]||{}).length;

  return(
    <div style={{paddingBottom:90}}>
      <div style={{padding:"14px 14px 0",background:C.bg,position:"sticky",top:58,zIndex:9,borderBottom:`1px solid ${C.borderAccent}`}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:C.accent,letterSpacing:1.5,marginBottom:10}}>KNOCKOUT BRACKET</div>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:12}}>
          {[...ROUNDS,{id:"final",label:"Final",n:1}].map(r=>{
            const unlocked=r.id==="final"?sfComplete:isUnlocked(r.id);
            const complete=r.id==="final"?!!knockoutPicks.champion:Object.keys(knockoutPicks[r.id]||{}).length>=r.n;
            return(
              <button key={r.id} onClick={()=>unlocked&&setActiveRound(r.id)}
                style={{flexShrink:0,padding:"6px 14px",background:activeRound===r.id?C.accent:unlocked?C.card:C.card2,color:activeRound===r.id?"#0a0e1a":unlocked?C.text:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:.5,border:`1px solid ${complete?C.green+"55":activeRound===r.id?C.accent:C.border}`,borderRadius:20,cursor:unlocked?"pointer":"not-allowed",whiteSpace:"nowrap"}}>
                {complete?"✓ ":""}{r.label}
              </button>
            );
          })}
        </div>
        {activeRound!=="final"&&<p style={{color:C.muted,fontSize:12,fontFamily:"'Barlow',sans-serif",paddingBottom:10}}>{picked}/{currentRound.n} picked</p>}
      </div>
      {activeRound!=="final"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10,padding:12}}>
          {matches.map(({idx,teams:[t1,t2]})=>(
            <MatchPickCard key={idx} num={idx+1} team1={t1} team2={t2}
              winner={knockoutPicks[activeRound]?.[idx]}
              actualWinner={koR[activeRound]?.[idx]||null}
              onPick={team=>pickWinner(activeRound,idx,team)} locked={locked}/>
          ))}
        </div>
      )}
      {activeRound==="final"&&(
        <div style={{padding:12,display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{fontSize:22}}>🏆</span>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:C.accent,letterSpacing:1}}>WORLD CUP FINAL</div>
              <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>+20 pts</span>
            </div>
            <MatchPickCard num="F" team1={finalT1} team2={finalT2}
              winner={knockoutPicks.champion||null}
              actualWinner={koR.champion||null}
              onPick={team=>setKnockoutPicks(prev=>({...prev,champion:team}))} locked={locked}/>
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{fontSize:20}}>🥉</span>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,color:C.muted,letterSpacing:1}}>3RD PLACE</div>
              <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>+5 pts</span>
            </div>
            <MatchPickCard num="3" team1={sfLosers[0]} team2={sfLosers[1]}
              winner={knockoutPicks.thirdPlace||null}
              actualWinner={koR.thirdPlace||null}
              onPick={team=>setKnockoutPicks(prev=>({...prev,thirdPlace:team}))} locked={locked}/>
          </div>
          {knockoutPicks.champion&&(
            <Card accent style={{textAlign:"center",padding:20}}>
              <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:8}}>YOUR CHAMPION</div>
              <Flag code={knockoutPicks.champion.code} size={44}/>
              <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:2,margin:"8px 0 6px"}}>{knockoutPicks.champion.name}</div>
              {koR.champion&&<div style={{fontSize:13,fontFamily:"'Barlow',sans-serif",color:koR.champion.code===knockoutPicks.champion.code?C.green:C.red,marginBottom:10}}>
                {koR.champion.code===knockoutPicks.champion.code?"✓ Champion! +20 pts":"✗ "+koR.champion.name+" won"}
              </div>}
              {/* Tiebreaker input */}
              <div style={{marginTop:12,padding:"12px",background:C.card2,borderRadius:10,textAlign:"left"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:C.accent,letterSpacing:1,marginBottom:4}}>TIEBREAKER</div>
                <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:8,lineHeight:1.5}}>
                  Predict the total goal differential for <strong style={{color:C.text}}>{knockoutPicks.champion.name}</strong> across all their tournament matches (goals scored minus conceded). Used to break ties.
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                    <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>Goal diff:</span>
                    <input type="number" value={championGoalDiff??""} onChange={e=>setChampionGoalDiff(e.target.value===""?null:+e.target.value)}
                      placeholder="e.g. +12"
                      disabled={locked}
                      style={{width:80,padding:"8px 10px",background:C.bg,border:`1px solid ${C.borderAccent}`,borderRadius:8,color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:18,textAlign:"center",outline:"none"}}/>
                  </div>
                  {results?.actual_champion_goal_diff!=null&&(
                    <div style={{textAlign:"right"}}>
                      <div style={{color:C.muted,fontSize:11,fontFamily:"'Barlow',sans-serif"}}>Actual</div>
                      <div style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:18}}>{results.actual_champion_goal_diff>0?"+":""}{results.actual_champion_goal_diff}</div>
                    </div>
                  )}
                </div>
                {championGoalDiff!=null&&results?.actual_champion_goal_diff!=null&&(
                  <div style={{marginTop:8,fontSize:12,fontFamily:"'Barlow',sans-serif",color:C.muted}}>
                    Your gap: <strong style={{color:Math.abs(championGoalDiff-results.actual_champion_goal_diff)<=2?C.green:C.amber}}>{Math.abs(championGoalDiff-results.actual_champion_goal_diff)} off</strong>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
      {!locked&&<div style={{padding:"0 12px"}}><button onClick={onBack} style={{...btn(false),width:"100%"}}>← BACK TO WILDCARDS</button></div>}
    </div>
  );
}

// ── Bracket Viewer Modal ──────────────────────────────────────
function BracketViewer({bracket,results,onClose}){
  const[tab,setTab]=useState("groups");
  if(!bracket) return null;
  const gp=bracket.group_picks||{};
  const ko=bracket.knockout_picks||{};
  const scoring=results?.scoring_config||DEFAULT_SCORING;
  const gResults=results?.group_results||{};
  const koR=results?.knockout_results||{};

  const LEGEND=(
    <div style={{display:"flex",gap:10,padding:"8px 0",marginBottom:10,flexWrap:"wrap"}}>
      {[[C.green,"+3","exact"],[C.amber,"+1","advanced"],[C.red,"0","eliminated"],[C.muted,"—","pending"]].map(([c,pts,label])=>(
        <div key={label} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,fontFamily:"'Barlow',sans-serif",color:C.muted}}>
          <span style={{background:`rgba(${c===C.green?"34,197,94":c===C.amber?"245,158,11":c===C.red?"239,68,68":"100,116,139"},.15)`,color:c,fontSize:10,fontWeight:600,padding:"1px 6px",borderRadius:4}}>{pts}</span>
          {label}
        </div>
      ))}
    </div>
  );

  const GroupsTab=()=>(
    <div>
      {LEGEND}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
        {Object.keys(WC_GROUPS).map(g=>{
          const picks=gp[g]||WC_GROUPS[g];
          const actual=gResults[g]||[];
          const gPts=picks.reduce((acc,team,i)=>{
            const aIdx=actual.findIndex(t=>t.code===team.code);
            if(aIdx===i) return acc+scoring.exactPos;
            if(aIdx<=1) return acc+scoring.advancedWrong;
            return acc;
          },0);
          const perfect=actual.length>0&&picks.every((t,i)=>actual[i]?.code===t.code);
          return(
            <div key={g} style={{background:C.card2,borderRadius:8,padding:10,border:`1px solid ${C.borderAccent}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{background:C.accent,color:"#0a0e1a",fontFamily:"'Bebas Neue',sans-serif",fontSize:10,width:18,height:18,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{g}</div>
                  <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:11}}>Group {g}</span>
                </div>
                {actual.length>0&&<span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13}}>+{gPts}{perfect?"+6":""}</span>}
              </div>
              {picks.map((team,i)=>{
                const aIdx=actual.findIndex(t=>t.code===team.code);
                const pts=actual.length===0?null:aIdx===i?scoring.exactPos:aIdx<=1?scoring.advancedWrong:0;
                return(
                  <div key={team.code} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:i<3?`.5px solid ${C.border}`:"none"}}>
                    <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:9,width:22}}>{"1st,2nd,3rd,4th".split(",")[i]}</span>
                    <Flag code={team.code} size={18}/>
                    <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:11,flex:1}}>{team.name}</span>
                    <PtsTag pts={pts} pending={actual.length===0}/>
                  </div>
                );
              })}
              {perfect&&<div style={{color:C.green,fontFamily:"'Barlow',sans-serif",fontSize:10,marginTop:5,textAlign:"center"}}>+6 perfect!</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const KnockoutTab=()=>{
    let correct=0,pending=0;
    return(
      <div>
        {LEGEND}
        {ROUNDS.map(round=>{
          const picks=ko[round.id]||{};
          const actual=koR[round.id]||{};
          return(
            <div key={round.id} style={{marginBottom:12}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:C.accent,letterSpacing:1,marginBottom:6}}>{round.fullLabel}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:6}}>
                {Array.from({length:round.n},(_,i)=>{
                  const pick=picks[i],act=actual[i];
                  if(!pick) return null;
                  const isCorrect=act&&pick.code===act.code;
                  const isPending=!act;
                  if(isPending) pending++; else if(isCorrect) correct++;
                  return(
                    <div key={i} style={{background:C.card2,borderRadius:7,padding:"7px 10px",display:"flex",alignItems:"center",gap:8,border:`.5px solid ${C.border}`}}>
                      <Flag code={pick.code} size={20}/>
                      <span style={{color:isCorrect?C.accent:act?C.muted:C.text,fontFamily:"'Barlow',sans-serif",fontSize:11,flex:1,fontWeight:isCorrect?600:400}}>{pick.name}</span>
                      {act&&!isCorrect&&<><span style={{color:C.muted,fontSize:9}}>→</span><Flag code={act.code} size={16}/></>}
                      <PtsTag pts={isPending?null:isCorrect?round.pts:0} pending={isPending}/>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
          {[[correct,C.green,"correct"],[pending,C.muted,"pending/wrong"]].map(([v,c,l])=>(
            <div key={l} style={{background:C.card2,borderRadius:8,padding:10,textAlign:"center"}}>
              <div style={{color:c,fontSize:20,fontWeight:500}}>{v}</div>
              <div style={{color:C.muted,fontSize:10,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ChampionTab=()=>{
    const champ=ko.champion;
    const actual=koR.champion;
    const correct=actual&&champ&&actual.code===champ.code;
    const score=calculateScore(bracket,results,scoring);
    return(
      <div>
        {champ?(
          <Card accent style={{textAlign:"center",padding:20,marginBottom:12}}>
            <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:10}}>CHAMPION PICK</div>
            <Flag code={champ.code} size={52}/>
            <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:2,margin:"10px 0 6px"}}>{champ.name}</div>
            {actual?<div style={{fontSize:14,color:correct?C.green:C.red,fontFamily:"'Barlow',sans-serif"}}>{correct?"✓ Champion! +20 pts":"✗ "+actual.name+" won"}</div>:<div style={{color:C.muted,fontSize:12,fontFamily:"'Barlow',sans-serif"}}>Tournament in progress</div>}
            {bracket.champion_goal_diff_pick!=null&&(
              <div style={{marginTop:10,padding:"8px",background:C.card2,borderRadius:8}}>
                <div style={{color:C.muted,fontSize:11,fontFamily:"'Barlow',sans-serif"}}>Tiebreaker goal diff guess: <strong style={{color:C.accent}}>{bracket.champion_goal_diff_pick>0?"+":""}{bracket.champion_goal_diff_pick}</strong></div>
                {results?.actual_champion_goal_diff!=null&&<div style={{color:C.muted,fontSize:11,fontFamily:"'Barlow',sans-serif",marginTop:4}}>Gap: {Math.abs(bracket.champion_goal_diff_pick-results.actual_champion_goal_diff)} off actual ({results.actual_champion_goal_diff>0?"+":""}{results.actual_champion_goal_diff})</div>}
              </div>
            )}
          </Card>
        ):<div style={{color:C.muted,textAlign:"center",padding:20,fontFamily:"'Barlow',sans-serif"}}>No champion picked yet</div>}
        <Card style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,textAlign:"center"}}>
          <div><div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:26}}>{score.total}</div><div style={{color:C.muted,fontSize:11}}>current pts</div></div>
          <div><div style={{color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:26}}>—</div><div style={{color:C.muted,fontSize:11}}>projected</div></div>
        </Card>
      </div>
    );
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:500,overflowY:"auto"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:12,paddingBottom:80}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:C.accent,letterSpacing:1}}>{bracket.bracket_name}</div>
            <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>{bracket.display_name}</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,padding:"8px 16px",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",fontSize:13}}>CLOSE</button>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[["groups","Groups"],["knockout","Knockout"],["champion","Champion"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"8px",background:tab===id?C.accent:C.card,color:tab===id?"#0a0e1a":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:.5,border:`1px solid ${tab===id?C.accent:C.border}`,borderRadius:8,cursor:"pointer"}}>{label}</button>
          ))}
        </div>
        {tab==="groups"&&<GroupsTab/>}
        {tab==="knockout"&&<KnockoutTab/>}
        {tab==="champion"&&<ChampionTab/>}
      </div>
    </div>
  );
}

// ── Leaderboard Page ──────────────────────────────────────────
function LeaderboardPage({userId,displayName,bracketComplete,bracketName,allBrackets,results,locked,picksVisible,onViewBracket,onH2H,oddsMap,currentPool,matches}){
  const[copied,setCopied]=useState(false);
  const scoring=results?.scoring_config||DEFAULT_SCORING;
  const tournamentStarted=results&&Object.keys(results.group_results||{}).length>0;
  const scored=useMemo(()=>allBrackets.map(b=>({
    ...b,
    score:calculateScore(b,results,scoring).total,
    proj:calculateProjected(b,results,oddsMap,scoring),
    teamsAlive:getTeamsAlive(b,results),
  })).sort((a,b)=>b.score-a.score),[allBrackets,results,oddsMap,scoring]);

  const myEntry=scored.find(b=>b.user_id===userId);
  const myPos=myEntry?scored.indexOf(myEntry)+1:null;
  const firstName=displayName?.split(" ")[0]||"there";

  const shareMyBracket=()=>{
    const url=`${window.location.origin}?viewbracket=${userId}`;
    navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };

  return(
    <div style={{padding:12,paddingBottom:90}}>
      <DynamicHero matches={matches} locked={locked} currentPool={currentPool} displayName={displayName} bracketComplete={bracketComplete} bracketName={bracketName}/>

      {/* My standing card */}
      <Card accent style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:C.accent,letterSpacing:1}}>YOUR STANDING</div>
          <button onClick={shareMyBracket} style={{background:"transparent",border:`1px solid ${C.accentDim}`,borderRadius:8,color:copied?C.green:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,padding:"4px 10px",cursor:"pointer",letterSpacing:.5}}>
            {copied?"✓ COPIED":"SHARE BRACKET"}
          </button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
          <div style={{background:C.card2,borderRadius:8,padding:"10px 6px",textAlign:"center"}}>
            <div style={{color:C.amber,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,lineHeight:1}}>{ordinal(myPos)}</div>
            <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,marginTop:3}}>position</div>
          </div>
          <div style={{background:C.card2,borderRadius:8,padding:"10px 6px",textAlign:"center"}}>
            <div style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,lineHeight:1}}>{tournamentStarted&&myEntry?myEntry.score:"—"}</div>
            <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,marginTop:3}}>points</div>
          </div>
          <div style={{background:C.card2,borderRadius:8,padding:"10px 6px",textAlign:"center"}}>
            <div style={{color:C.green,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,lineHeight:1}}>{tournamentStarted&&myEntry?myEntry.proj:"—"}</div>
            <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,marginTop:3}}>projected</div>
          </div>
        </div>
        <div style={{padding:"8px 12px",background:C.card2,borderRadius:8,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13}}>{bracketComplete?"✓":"⚠"}</span>
          <span style={{color:bracketComplete?C.text:C.amber,fontFamily:"'Barlow',sans-serif",fontSize:12,flex:1}}>
            {bracketComplete?<>{bracketName} · <span style={{color:C.green}}>complete</span></>:"Your bracket is incomplete — tap Picks to finish"}
          </span>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,color:C.accent,letterSpacing:1}}>STANDINGS</div>
          <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{allBrackets.length} entries · {MAX_POSSIBLE} pts max</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"26px 1fr 46px 54px",gap:6,padding:"6px 10px",background:"rgba(6,182,212,.1)",borderRadius:7,marginBottom:4}}>
          {["#","BRACKET","PTS","PROJ"].map(h=>(
            <span key={h} style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,textAlign:h==="PTS"||h==="PROJ"?"right":"left"}}>{h}</span>
          ))}
        </div>
        {scored.length===0&&<div style={{padding:"20px",textAlign:"center",color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>No brackets yet — be the first!</div>}
        {scored.map((b,i)=>{
          const isMe=b.user_id===userId;
          const canView=picksVisible&&!isMe;
          return(
            <div key={b.id} style={{padding:"10px",borderBottom:i<scored.length-1?`1px solid ${C.border}`:"none",background:isMe?"rgba(6,182,212,.06)":"transparent",borderRadius:6}}>
              <div style={{display:"grid",gridTemplateColumns:"26px 1fr 46px 54px",gap:6,alignItems:"center"}}>
                <span style={{color:i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#cd7f32":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:15}}>{i+1}</span>
                <div onClick={()=>canView&&onViewBracket(b)} style={{cursor:canView?"pointer":"default"}}>
                  <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    {b.bracket_name||"Unnamed"}
                    {isMe&&<span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:9,background:"rgba(6,182,212,.15)",padding:"1px 6px",borderRadius:10}}>YOU</span>}
                    {canView&&<span style={{color:C.muted,fontSize:10}}>↗</span>}
                  </div>
                  <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,display:"flex",alignItems:"center",gap:8}}>
                    <span>{b.display_name||"—"}</span>
                    {b.teamsAlive!=null&&<span style={{color:b.teamsAlive>4?C.green:b.teamsAlive>1?C.amber:C.red}}>· {b.teamsAlive} alive</span>}
                  </div>
                </div>
                <span style={{color:tournamentStarted?C.text:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:15,textAlign:"right"}}>{tournamentStarted?b.score:"—"}</span>
                <span style={{color:tournamentStarted?C.green:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,textAlign:"right"}}>{tournamentStarted?b.proj:"—"}</span>
              </div>
              {/* H2H button for others */}
              {canView&&(
                <div style={{marginTop:6,display:"flex",gap:6}}>
                  <button onClick={()=>onH2H(b)} style={{background:"transparent",border:`1px solid ${C.accentDim}`,borderRadius:6,color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,padding:"3px 10px",cursor:"pointer",letterSpacing:.5}}>H2H</button>
                  <button onClick={()=>onViewBracket(b)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,padding:"3px 10px",cursor:"pointer",letterSpacing:.5}}>VIEW</button>
                </div>
              )}
            </div>
          );
        })}
        {!picksVisible&&<p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,textAlign:"center",marginTop:10,padding:"0 4px"}}>Picks hidden until first match kicks off Jun 11</p>}
      </Card>

      {/* Scoring guide */}
      <Card>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:10}}>SCORING GUIDE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 16px"}}>
          {[["Exact group rank","+3"],["Advanced (wrong rank)","+1"],["Perfect group","+6 bonus"],["Wildcard advance","+2"],["Round of 32","+2"],["Round of 16","+4"],["Quarterfinal","+9"],["Semifinal","+13"],["3rd place","+5"],["Champion","🏆 +20"],["Tiebreaker","Goal diff"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",gap:6}}>
              <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>{l}</span>
              <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,flexShrink:0}}>{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Matches Page ──────────────────────────────────────────────
function MatchesPage({matches,loading}){
  const[odds,setOdds]=useState([]);
  useEffect(()=>{fetch("/api/odds").then(r=>r.ok?r.json():null).then(d=>{if(d&&Array.isArray(d)) setOdds(d);}).catch(()=>{});}, []);

  const getOdds=(homeTeam,awayTeam)=>{
    const m=odds.find(o=>o.home_team?.toLowerCase().includes(homeTeam?.toLowerCase()?.split(" ")[0]||"xxx"));
    if(!m) return null;
    const book=m.bookmakers?.[0]?.markets?.[0]?.outcomes;if(!book) return null;
    return{home:book.find(o=>o.name===m.home_team)?.price,away:book.find(o=>o.name===m.away_team)?.price,draw:book.find(o=>o.name==="Draw")?.price};
  };
  const fmtOdds=v=>{if(!v) return null;return v>0?`+${v}`:String(v);};

  const live=matches.filter(m=>["IN_PLAY","PAUSED","HALFTIME"].includes(m.status));
  const today=new Date().toDateString();
  const upcoming=matches.filter(m=>["SCHEDULED","TIMED"].includes(m.status));
  const todayUpcoming=upcoming.filter(m=>new Date(m.utcDate).toDateString()===today);
  const futureUpcoming=upcoming.filter(m=>new Date(m.utcDate).toDateString()!==today);
  const completed=[...matches.filter(m=>m.status==="FINISHED")].reverse();

  const MatchRow=({m,showScore})=>{
    const hCode=NAME_TO_CODE[m.homeTeam?.name]||"";
    const aCode=NAME_TO_CODE[m.awayTeam?.name]||"";
    const isLive=["IN_PLAY","PAUSED","HALFTIME"].includes(m.status);
    const status=isLive?(m.status==="HALFTIME"?"HT":`${m.minute||""}′`):"FT";
    const o=!showScore?getOdds(m.homeTeam?.name,m.awayTeam?.name):null;
    return(
      <div style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
          {isLive&&<span style={{width:6,height:6,borderRadius:"50%",background:C.red,display:"inline-block",flexShrink:0}}/>}
          <span style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:isLive?C.red:C.muted}}>{showScore?status:toET(m.utcDate)}</span>
          <span style={{marginLeft:"auto",color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{m.group||""}</span>
        </div>
        {m.venue&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:C.muted,marginBottom:5,paddingLeft:14}}>📍 {m.venue}</div>}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {hCode&&<Flag code={hCode} size={22}/>}
          <span style={{fontFamily:"'Barlow',sans-serif",fontSize:14,fontWeight:600,color:C.text,flex:1}}>{m.homeTeam?.name||"TBD"}</span>
          {showScore?(
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:C.text,minWidth:18,textAlign:"center"}}>{m.score?.fullTime?.home??m.score?.halfTime?.home??"-"}</span>
              <span style={{color:C.muted,fontSize:14}}>:</span>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:C.text,minWidth:18,textAlign:"center"}}>{m.score?.fullTime?.away??m.score?.halfTime?.away??"-"}</span>
            </div>
          ):o?(
            <div style={{display:"flex",gap:8,flexShrink:0,fontFamily:"'Bebas Neue',sans-serif",fontSize:12}}>
              <span style={{color:C.accent}}>{fmtOdds(o.home)}</span>
              {o.draw&&<span style={{color:C.muted}}>{fmtOdds(o.draw)}</span>}
              <span style={{color:C.accent}}>{fmtOdds(o.away)}</span>
            </div>
          ):(
            <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,flexShrink:0}}>vs</span>
          )}
          <span style={{fontFamily:"'Barlow',sans-serif",fontSize:14,fontWeight:600,color:C.text,flex:1,textAlign:"right"}}>{m.awayTeam?.name||"TBD"}</span>
          {aCode&&<Flag code={aCode} size={22}/>}
        </div>
      </div>
    );
  };

  if(loading) return<div style={{padding:40,textAlign:"center",color:C.muted,fontFamily:"'Barlow',sans-serif"}}>Loading matches…</div>;

  return(
    <div style={{padding:12,paddingBottom:90}}>
      {live.length>0&&(
        <Card accent style={{marginBottom:12,border:"1px solid rgba(239,68,68,.3)"}}>
          <SecHead label={`🔴 LIVE NOW (${live.length})`}/>
          {live.map(m=><MatchRow key={m.id} m={m} showScore={true}/>)}
        </Card>
      )}
      {todayUpcoming.length>0&&(
        <Card><SecHead label="TODAY" sub="Eastern time · odds where available"/>
          {todayUpcoming.map(m=><MatchRow key={m.id} m={m} showScore={false}/>)}
        </Card>
      )}
      {futureUpcoming.length>0&&(
        <Card><SecHead label="UPCOMING" sub="Eastern time"/>
          {futureUpcoming.slice(0,20).map(m=><MatchRow key={m.id} m={m} showScore={false}/>)}
        </Card>
      )}
      {completed.length>0&&(
        <Card><SecHead label="COMPLETED"/>
          {completed.slice(0,20).map(m=><MatchRow key={m.id} m={m} showScore={true}/>)}
        </Card>
      )}
      {matches.length===0&&(
        <div style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:40,marginBottom:12}}>📅</div>
          <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:14}}>World Cup kicks off June 11. Schedule loads closer to the tournament.</p>
        </div>
      )}
    </div>
  );
}

// ── Insights Page ─────────────────────────────────────────────
function InsightsPage({allBrackets,userId,results,picksVisible,matches}){
  const[tab,setTab]=useState("edge");
  const[whatIfTeam,setWhatIfTeam]=useState(null);
  const myBracket=allBrackets.find(b=>b.user_id===userId);
  const scoring=results?.scoring_config||DEFAULT_SCORING;
  const{champDist,groupConsensus,contrarian}=computeStats(allBrackets);
  const rootingFor=computeRooting(myBracket,allBrackets);
  const n=allBrackets.length;

  const today=new Date().toDateString();
  const todayKnockout=matches.filter(m=>{
    const isToday=new Date(m.utcDate).toDateString()===today;
    const isKO=["LAST_32","LAST_16","QUARTER_FINALS","SEMI_FINALS"].includes(m.stage);
    return isToday&&isKO&&["SCHEDULED","TIMED","IN_PLAY","PAUSED"].includes(m.status);
  });

  // What-if simulator — must be before any early return
  const whatIfScores=useMemo(()=>{
    if(!whatIfTeam) return null;
    const simulatedResults={
      ...(results||{}),
      knockout_results:{...(results?.knockout_results||{}),champion:{code:whatIfTeam.code,name:whatIfTeam.name}},
    };
    return allBrackets.map(b=>({
      ...b,
      score:calculateScore(b,simulatedResults,scoring).total,
      wouldWin:b.knockout_picks?.champion?.code===whatIfTeam.code,
    })).sort((a,b)=>b.score-a.score);
  },[whatIfTeam,allBrackets,results,scoring]);

  if(!picksVisible) return(
    <div style={{padding:24,textAlign:"center",paddingBottom:90}}>
      <div style={{fontSize:44,marginBottom:16}}>🔒</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:C.accent,marginBottom:10,letterSpacing:1}}>INSIGHTS UNLOCK AT KICKOFF</div>
      <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:14,lineHeight:1.6,maxWidth:320,margin:"0 auto"}}>Pool stats and analysis become available when picks lock on June 11.</p>
    </div>
  );

  const today=new Date().toDateString();
  const todayKnockoutFiltered=matches.filter(m=>{
    const isToday=new Date(m.utcDate).toDateString()===today;
    const isKO=["LAST_32","LAST_16","QUARTER_FINALS","SEMI_FINALS"].includes(m.stage);
    return isToday&&isKO&&["SCHEDULED","TIMED","IN_PLAY","PAUSED"].includes(m.status);
  });

  return(
    <div style={{padding:12,paddingBottom:90}}>
      <div style={{display:"flex",gap:4,marginBottom:14,overflowX:"auto"}}>
        {[["edge","⚡ Edge"],["whatif","🔮 What-If"],["pool","📊 Picks"],["root","📣 Root For"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"8px 12px",background:tab===id?C.accent:C.card,color:tab===id?"#0a0e1a":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:.5,border:`1px solid ${tab===id?C.accent:C.border}`,borderRadius:8,cursor:"pointer"}}>{label}</button>
        ))}
      </div>

      {tab==="edge"&&(
        <div>
          <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:12,lineHeight:1.5}}>How today's knockout results would shift the standings.</p>
          {todayKnockoutFiltered.length===0&&<Card><div style={{textAlign:"center",padding:20}}><div style={{fontSize:36,marginBottom:10}}>⚽</div><p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>No knockout matches today. Check back during the knockout rounds.</p></div></Card>}
          {todayKnockoutFiltered.map(m=>{
            const edges=computeMatchEdge(m,allBrackets,results,scoring);
            if(!edges) return null;
            const hCode=NAME_TO_CODE[m.homeTeam?.name]||"";
            const aCode=NAME_TO_CODE[m.awayTeam?.name]||"";
            return(
              <Card key={m.id} accent style={{marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                  {hCode&&<Flag code={hCode} size={22}/>}
                  <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:14,fontWeight:600}}>{m.homeTeam?.shortName||m.homeTeam?.name}</span>
                  <span style={{color:C.muted,fontSize:12}}>vs</span>
                  <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:14,fontWeight:600}}>{m.awayTeam?.shortName||m.awayTeam?.name}</span>
                  {aCode&&<Flag code={aCode} size={22}/>}
                  <span style={{marginLeft:"auto",color:C.accent,fontFamily:"'Barlow',sans-serif",fontSize:12}}>{toETTime(m.utcDate)}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {edges.map(({winner,standings})=>(
                    <div key={winner.code} style={{background:C.card2,borderRadius:8,padding:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                        <Flag code={winner.code} size={18}/>
                        <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:12}}>{winner.label} wins</span>
                      </div>
                      {standings.slice(0,6).map(b=>{
                        const isMe=b.user_id===userId;
                        return(
                          <div key={b.user_id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 0",borderBottom:`1px solid ${C.border}`}}>
                            <span style={{color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,width:14}}>{b.newPos}</span>
                            <span style={{color:isMe?C.accent:C.text,fontFamily:"'Barlow',sans-serif",fontSize:10,flex:1,fontWeight:isMe?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(b.bracket_name||"—").split(" ")[0]}</span>
                            {b.posChange>0&&<span style={{color:C.green,fontSize:10,fontFamily:"'Bebas Neue',sans-serif",flexShrink:0}}>▲{b.posChange}</span>}
                            {b.posChange<0&&<span style={{color:C.red,fontSize:10,fontFamily:"'Bebas Neue',sans-serif",flexShrink:0}}>▼{Math.abs(b.posChange)}</span>}
                            {b.posChange===0&&<span style={{color:C.muted,fontSize:10,flexShrink:0}}>—</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab==="whatif"&&(
        <div>
          <Card accent>
            <SecHead label="🔮 WHAT-IF SIMULATOR" sub="Pick any team to win the tournament — see how the standings would look"/>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.muted,fontFamily:"'Barlow',sans-serif",marginBottom:8}}>SELECT A CHAMPION</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {ALL_TEAMS.slice(0,16).map(team=>(
                  <button key={team.code} onClick={()=>setWhatIfTeam(whatIfTeam?.code===team.code?null:team)}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:whatIfTeam?.code===team.code?"rgba(6,182,212,.2)":C.card2,border:`1px solid ${whatIfTeam?.code===team.code?C.accent:C.border}`,borderRadius:8,cursor:"pointer",transition:"all .15s"}}>
                    <Flag code={team.code} size={18}/>
                    <span style={{color:whatIfTeam?.code===team.code?C.accent:C.text,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{team.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {whatIfTeam&&whatIfScores&&(
              <div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:C.accent,letterSpacing:1,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                  <Flag code={whatIfTeam.code} size={20}/>IF {whatIfTeam.name.toUpperCase()} WIN
                </div>
                {whatIfScores.map((b,i)=>{
                  const isMe=b.user_id===userId;
                  return(
                    <div key={b.user_id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${C.border}`,background:isMe?"rgba(6,182,212,.05)":"transparent",borderRadius:4}}>
                      <span style={{color:i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#cd7f32":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,width:20}}>{i+1}</span>
                      <div style={{flex:1}}>
                        <div style={{color:isMe?C.accent:C.text,fontFamily:"'Barlow',sans-serif",fontSize:12,fontWeight:isMe?600:400}}>{b.bracket_name}</div>
                        {b.wouldWin&&<span style={{color:C.green,fontFamily:"'Barlow',sans-serif",fontSize:10}}>picked them! 🏆</span>}
                      </div>
                      <span style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>{b.score}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab==="pool"&&(
        <div>
          <Card accent>
            <SecHead label={`🏆 CHAMPION PICKS — ${n} entries`}/>
            {champDist.length===0&&<p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>No data yet.</p>}
            {champDist.map(({team,pct,count})=>(
              <div key={team.code} style={{marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <Flag code={team.code} size={22}/><span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,flex:1}}>{team.name}</span>
                  <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>{pct}%</span>
                  <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{count}/{n}</span>
                </div>
                <div style={{background:C.card2,borderRadius:4,height:6}}>
                  <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${C.accent},#0891b2)`,borderRadius:4}}/>
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <SecHead label="GROUP CONSENSUS" sub="Most popular 1st-place picks"/>
            {groupConsensus.map(({group,team,pct})=>team&&(
              <div key={group} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{background:C.accent,color:"#0a0e1a",fontFamily:"'Bebas Neue',sans-serif",fontSize:11,width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{group}</div>
                <Flag code={team.code} size={20}/>
                <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,flex:1}}>{team.name}</span>
                <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>{pct}% 1st</span>
              </div>
            ))}
          </Card>
          {contrarian.length>0&&(
            <Card>
              <SecHead label="🎯 CONTRARIAN" sub="≤25% picked them as champion"/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
                {contrarian.map(({team,pct,count})=>(
                  <div key={team.code} style={{background:C.card2,borderRadius:8,padding:10,border:`1px solid ${C.accentDim}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><Flag code={team.code} size={20}/><span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:12,fontWeight:600}}>{team.name}</span></div>
                    <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>{count}/{n} · {pct}%</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab==="root"&&(
        <Card accent>
          <SecHead label="📣 WHO TO ROOT FOR" sub="Teams in your bracket most others don't have — wins here give you the biggest edge"/>
          {!myBracket&&<p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>Submit your bracket first.</p>}
          {myBracket&&rootingFor.length===0&&<p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>Your picks mirror the field — no unique differentiators.</p>}
          {myBracket&&rootingFor.map(({team,uniqueness})=>(
            <div key={team.code} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <Flag code={team.code} size={32}/>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:14,fontWeight:600}}>{team.name}</div>
                <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{uniqueness}% of the field doesn't have them this deep</div>
              </div>
              <span style={{color:C.green,fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:.5}}>ROOT HARD</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── Manager Page ──────────────────────────────────────────────
function ManagerPage({allBrackets,results,onResultsUpdate,pools,onPoolCreated}){
  const scoring=results?.scoring_config||{...DEFAULT_SCORING};
  const[sc,setSc]=useState(scoring);
  const[saving,setSaving]=useState(false);
  const[msg,setMsg]=useState("");
  const[selUser,setSelUser]=useState("");
  const[editB,setEditB]=useState(null);
  const[newPoolName,setNewPoolName]=useState("");
  const[newPoolCode,setNewPoolCode]=useState("");
  const[newPoolPrivate,setNewPoolPrivate]=useState(false);
  const[copied,setCopied]=useState(null);

  const save=async(key,value)=>{
    setSaving(true);
    const updates={};
    if(key==="lock") updates.tournament_locked=value;
    else if(key==="visible") updates.picks_visible=value;
    else if(key==="scoring") updates.scoring_config=sc;
    else if(key==="goalDiff") updates.actual_champion_goal_diff=value;
    const{error}=await supabase.from("actual_results").update(updates).eq("id",RESULTS_ROW);
    setSaving(false);
    if(!error){setMsg("Saved!");onResultsUpdate();setTimeout(()=>setMsg(""),2500);}
    else setMsg("Error: "+error.message);
  };

  const createPool=async()=>{
    if(!newPoolName||!newPoolCode) return;
    setSaving(true);
    const{error}=await supabase.from("pools").insert({name:newPoolName,code:newPoolCode.toUpperCase(),is_private:newPoolPrivate}).select().single();
    setSaving(false);
    if(error) setMsg("Error: "+error.message);
    else{setMsg("Pool created!");setNewPoolName("");setNewPoolCode("");onPoolCreated();}
    setTimeout(()=>setMsg(""),3000);
  };

  const copyLink=(code)=>{
    navigator.clipboard.writeText(`${window.location.origin}?join=${code}`).then(()=>{setCopied(code);setTimeout(()=>setCopied(null),2000);});
  };

  const Toggle=({val,onChange})=>(
    <button onClick={()=>onChange(!val)} style={{width:44,height:24,borderRadius:12,border:"none",background:val?C.green:C.card2,position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
      <div style={{width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:3,left:val?23:3,transition:"left .2s"}}/>
    </button>
  );
  const PtsIn=({label,field})=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
      <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13}}>{label}</span>
      <input type="number" value={sc[field]} onChange={e=>setSc(prev=>({...prev,[field]:+e.target.value}))}
        style={{width:52,padding:"4px 8px",background:C.card2,border:`1px solid ${C.borderAccent}`,borderRadius:6,color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,textAlign:"center",outline:"none"}}/>
    </div>
  );
  const Row=({label,sub,children})=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:`1px solid ${C.border}`,gap:12}}>
      <div><div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600}}>{label}</div>{sub&&<div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,marginTop:2}}>{sub}</div>}</div>
      {children}
    </div>
  );

  return(
    <div style={{padding:12,paddingBottom:90}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <IcoShield s={24} c={C.accent}/>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:C.accent,letterSpacing:1.5}}>MANAGER MODE</div>
        <span style={{background:"rgba(6,182,212,.15)",color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,padding:"2px 10px",borderRadius:12}}>ADMIN</span>
        {msg&&<span style={{color:msg.includes("Error")?C.red:C.green,fontFamily:"'Barlow',sans-serif",fontSize:12,marginLeft:"auto"}}>{msg}</span>}
      </div>

      <Card accent>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:4}}>TOURNAMENT SETTINGS</div>
        <Row label="Picks locked" sub="No edits once on"><Toggle val={results?.tournament_locked||false} onChange={v=>save("lock",v)}/></Row>
        <Row label="Show all picks publicly" sub="Auto-enables when locked"><Toggle val={results?.picks_visible||false} onChange={v=>save("visible",v)}/></Row>
        <Row label="Actual champion goal diff" sub="Enter after tournament ends">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <input type="number" defaultValue={results?.actual_champion_goal_diff??""} placeholder="e.g. 12"
              onBlur={e=>save("goalDiff",+e.target.value)}
              style={{width:60,padding:"4px 8px",background:C.card2,border:`1px solid ${C.borderAccent}`,borderRadius:6,color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,textAlign:"center",outline:"none"}}/>
          </div>
        </Row>
      </Card>

      <Card>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:10}}>POOLS & INVITE LINKS</div>
        {pools.map(p=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{flex:1}}>
              <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600}}>{p.name}</div>
              <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>Code: {p.code} · {p.is_private?"Private":"Public"}</div>
            </div>
            <button onClick={()=>copyLink(p.code)} style={{background:"transparent",border:`1px solid ${C.accentDim}`,borderRadius:8,color:copied===p.code?C.green:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:12,padding:"6px 12px",cursor:"pointer",flexShrink:0}}>
              {copied===p.code?"✓ COPIED":"COPY LINK"}
            </button>
          </div>
        ))}
        <div style={{marginTop:14}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,color:C.muted,letterSpacing:1,marginBottom:8}}>CREATE NEW POOL</div>
          <input placeholder="Pool name" value={newPoolName} onChange={e=>setNewPoolName(e.target.value)} style={inp}/>
          <input placeholder="Invite code (e.g. WORK2026)" value={newPoolCode} onChange={e=>setNewPoolCode(e.target.value.toUpperCase())} style={{...inp,marginBottom:10}}/>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <Toggle val={newPoolPrivate} onChange={setNewPoolPrivate}/>
            <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>Private pool</span>
          </div>
          <button onClick={createPool} disabled={saving||!newPoolName||!newPoolCode} style={{...btn(true,saving||!newPoolName||!newPoolCode),width:"100%"}}>{saving?"CREATING…":"CREATE POOL"}</button>
        </div>
      </Card>

      <Card>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:4}}>SCORING CONFIG</div>
        <PtsIn label="Exact group rank" field="exactPos"/>
        <PtsIn label="Advanced (wrong rank)" field="advancedWrong"/>
        <PtsIn label="Perfect group bonus" field="perfectGroup"/>
        <PtsIn label="Wildcard correct" field="wildcardCorrect"/>
        <PtsIn label="Round of 32" field="r32"/>
        <PtsIn label="Round of 16" field="r16"/>
        <PtsIn label="Quarterfinal" field="qf"/>
        <PtsIn label="Semifinal" field="sf"/>
        <PtsIn label="3rd place" field="third"/>
        <PtsIn label="Champion" field="champion"/>
        <button onClick={()=>save("scoring")} disabled={saving} style={{...btn(true,saving),width:"100%",marginTop:12}}>{saving?"SAVING…":"SAVE SCORING"}</button>
      </Card>

      <Card>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:10}}>EDIT A USER'S BRACKET</div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <select value={selUser} onChange={e=>setSelUser(e.target.value)} style={{flex:1,padding:"10px 12px",background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,outline:"none"}}>
            <option value="">Select participant…</option>
            {allBrackets.map(b=><option key={b.user_id} value={b.user_id}>{b.display_name||b.bracket_name}</option>)}
          </select>
          <button onClick={()=>setEditB(allBrackets.find(b=>b.user_id===selUser)||null)} disabled={!selUser} style={{...btn(false,!selUser),padding:"10px 16px",fontSize:14}}>LOAD</button>
        </div>
        {editB&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>Bracket name:</span>
              <input value={editB.bracket_name||""} onChange={e=>setEditB(prev=>({...prev,bracket_name:e.target.value}))} style={{...inp,marginBottom:0,flex:1}}/>
            </div>
            <button onClick={async()=>{setSaving(true);await supabase.from("brackets").update({bracket_name:editB.bracket_name}).eq("user_id",editB.user_id);setSaving(false);setMsg("Saved!");setTimeout(()=>setMsg(""),2500);}} disabled={saving} style={{...btn(true,saving),width:"100%"}}>{saving?"SAVING…":"SAVE"}</button>
          </div>
        )}
      </Card>

      <Card>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:10}}>STANDINGS HISTORY CHART</div>
        <StandingsChart history={results?.standings_history||[]} userId="" allBrackets={allBrackets}/>
        <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,marginTop:8}}>History snapshots are stored automatically in actual_results.standings_history as you update results each match day.</div>
      </Card>
    </div>
  );
}

// ── Bracket Step Wrapper ──────────────────────────────────────
function BracketPage({step,setStep,groupPicks,setGroupPicks,wildcardPicks,setWildcardPicks,knockoutPicks,setKnockoutPicks,locked,results,championGoalDiff,setChampionGoalDiff}){
  const steps=[{id:"groups",label:"Groups"},{id:"wildcards",label:"Wildcards"},{id:"knockout",label:"Bracket"}];
  const stepIdx=steps.findIndex(s=>s.id===step);
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",padding:"10px 14px 0"}}>
        {steps.map((s,i)=>(
          <span key={s.id} style={{display:"flex",alignItems:"center",flex:1}}>
            <span style={{display:"flex",alignItems:"center",gap:5,cursor:i<=stepIdx?"pointer":"default"}} onClick={()=>{if(i<stepIdx||(i===1&&wildcardPicks.length>0)) setStep(s.id);}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:i<=stepIdx?C.accent:C.card2,color:i<=stepIdx?"#0a0e1a":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i<stepIdx?"✓":i+1}</span>
              <span style={{color:i===stepIdx?C.accent:i<stepIdx?"rgba(6,182,212,.6)":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:.5}}>{s.label}</span>
            </span>
            {i<steps.length-1&&<div style={{flex:1,height:1,background:i<stepIdx?C.accent:C.border,margin:"0 6px"}}/>}
          </span>
        ))}
      </div>
      {step==="groups"    &&<GroupStagePage groupPicks={groupPicks} setGroupPicks={setGroupPicks} locked={locked} onNext={()=>setStep("wildcards")} results={results}/>}
      {step==="wildcards" &&<WildcardPage groupPicks={groupPicks} wildcardPicks={wildcardPicks} setWildcardPicks={setWildcardPicks} locked={locked} onNext={()=>setStep("knockout")} onBack={()=>setStep("groups")} results={results}/>}
      {step==="knockout"  &&<KnockoutPage groupPicks={groupPicks} wildcardPicks={wildcardPicks} knockoutPicks={knockoutPicks} setKnockoutPicks={setKnockoutPicks} locked={locked} onBack={()=>setStep("wildcards")} results={results} championGoalDiff={championGoalDiff} setChampionGoalDiff={setChampionGoalDiff}/>}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────
export default function App(){
  // Auth
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(true);
  // Pool join
  const[joinCode,setJoinCode]=useState(null);
  const[joinPool,setJoinPool]=useState(null);
  const[joinStatus,setJoinStatus]=useState("idle");
  // Share bracket view
  const[viewSharedUserId,setViewSharedUserId]=useState(null);
  // Bracket state
  const[bracketId,setBracketId]=useState(null);
  const[bracketName,setBracketName]=useState("My WCC Bracket");
  const[editingName,setEditingName]=useState(false);
  const[groupPicks,setGroupPicks]=useState(initGroupPicks);
  const[wildcardPicks,setWildcardPicks]=useState([]);
  const[knockoutPicks,setKnockoutPicks]=useState({});
  const[championGoalDiff,setChampionGoalDiff]=useState(null);
  const[saveStatus,setSaveStatus]=useState("idle");
  // Global data
  const[allBrackets,setAllBrackets]=useState([]);
  const[results,setResults]=useState(null);
  const[oddsMap,setOddsMap]=useState({});
  const[matches,setMatches]=useState([]);
  const[matchesLoading,setMatchesLoading]=useState(true);
  // UI
  const[page,setPage]=useState("home");
  const[bracketStep,setBracketStep]=useState("groups");
  const[viewingBracket,setViewingBracket]=useState(null);
  const[h2hBracket,setH2hBracket]=useState(null);
  const[pools,setPools]=useState([]);
  const[activePool,setActivePool]=useState(DEFAULT_POOL);
  const[showPoolSwitcher,setShowPoolSwitcher]=useState(false);
  const saveTimer=useRef(null);

  const isAdmin=user?.email===ADMIN_EMAIL;
  const locked=results?.tournament_locked||false;
  const picksVisible=results?.picks_visible||false;
  const bracketComplete=!!knockoutPicks.champion&&championGoalDiff!=null;
  const currentPool=pools.find(p=>p.id===activePool)||{name:"World Cup Challenge"};

  // Match day badge
  const today=new Date().toDateString();
  const hasMatchesToday=matches.some(m=>new Date(m.utcDate).toDateString()===today);
  const hasLiveMatch=matches.some(m=>["IN_PLAY","PAUSED","HALFTIME"].includes(m.status));

  // Auth
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setUser(session?.user??null);setLoading(false);});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>setUser(session?.user??null));
    return()=>subscription.unsubscribe();
  },[]);

  // URL params
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const code=params.get("join");
    const view=params.get("viewbracket");
    if(code) setJoinCode(code.toUpperCase());
    if(view) setViewSharedUserId(view);
  },[]);

  // Resolve join pool
  useEffect(()=>{
    if(!joinCode) return;
    supabase.from("pools").select("*").eq("code",joinCode).single().then(({data})=>{if(data) setJoinPool(data);});
  },[joinCode]);

  // Auto-join pool after login
  useEffect(()=>{
    if(!user||!joinPool||joinStatus!=="idle") return;
    const doJoin=async()=>{
      setJoinStatus("joining");
      const{data:existing}=await supabase.from("pool_members").select("*").eq("pool_id",joinPool.id).eq("user_id",user.id).single();
      if(existing){setJoinStatus("done");setActivePool(joinPool.id);window.history.replaceState({},"","/");return;}
      const{error}=await supabase.from("pool_members").insert({pool_id:joinPool.id,user_id:user.id});
      if(!error){
        setJoinStatus("done");setActivePool(joinPool.id);
        const displayName=user.user_metadata?.full_name||user.user_metadata?.display_name||user.email;
        await supabase.from("brackets").upsert({user_id:user.id,display_name:displayName,pool_id:joinPool.id},{onConflict:"user_id,pool_id"});
        window.history.replaceState({},"","/");
      } else setJoinStatus("error");
    };
    doJoin();
  },[user,joinPool,joinStatus]);

  // Load own bracket
  useEffect(()=>{
    if(!user) return;
    const load=async()=>{
      const{data,error}=await supabase.from("brackets").select("*").eq("user_id",user.id).eq("pool_id",activePool).single();
      if(data){
        setBracketId(data.id);setBracketName(data.bracket_name||"My WCC Bracket");
        if(data.group_picks) setGroupPicks(data.group_picks);
        if(data.wildcard_picks) setWildcardPicks(data.wildcard_picks);
        if(data.knockout_picks) setKnockoutPicks(data.knockout_picks);
        if(data.champion_goal_diff_pick!=null) setChampionGoalDiff(data.champion_goal_diff_pick);
      } else if(error?.code==="PGRST116"){
        const displayName=user.user_metadata?.full_name||user.user_metadata?.display_name||user.email;
        const{data:created}=await supabase.from("brackets").insert({user_id:user.id,display_name:displayName,pool_id:activePool}).select().single();
        if(created) setBracketId(created.id);
      }
    };
    load();
  },[user,activePool]);

  // All brackets for this pool
  useEffect(()=>{
    if(!user) return;
    const loadAll=async()=>{
      const{data}=await supabase.from("brackets").select("id,user_id,display_name,bracket_name,group_picks,wildcard_picks,knockout_picks,champion_goal_diff_pick,locked").eq("pool_id",activePool);
      if(data) setAllBrackets(data);
    };
    loadAll();
    const ch=supabase.channel("brackets-rt").on("postgres_changes",{event:"*",schema:"public",table:"brackets"},loadAll).subscribe();
    return()=>supabase.removeChannel(ch);
  },[user,activePool]);

  // Pools
  const loadPools=useCallback(async()=>{
    if(!user) return;
    const{data}=await supabase.from("pool_members").select("pool_id, pools(id,name,code,is_private)").eq("user_id",user.id);
    if(data?.length) setPools(data.map(d=>d.pools).filter(Boolean));
    else setPools([{id:DEFAULT_POOL,name:"Fairmount Fantasy League",code:"FFL2026",is_private:false}]);
  },[user]);
  useEffect(()=>{loadPools();},[loadPools]);

  // Results
  const loadResults=useCallback(async()=>{
    const{data}=await supabase.from("actual_results").select("*").eq("id",RESULTS_ROW).single();
    if(data) setResults(data);
  },[]);
  useEffect(()=>{if(user) loadResults();},[user,loadResults]);

  // Matches — shared globally (for nav badge + dynamic hero)
  const fetchMatches=useCallback(async()=>{
    try{const r=await fetch("/api/matches");if(r.ok){const d=await r.json();setMatches(d.matches||[]);}}catch(e){}
    finally{setMatchesLoading(false);}
  },[]);
  useEffect(()=>{fetchMatches();const id=setInterval(fetchMatches,60000);return()=>clearInterval(id);},[fetchMatches]);

  // Odds
  useEffect(()=>{
    fetch("/api/odds").then(r=>r.ok?r.json():null).then(data=>{
      if(!data||!Array.isArray(data)) return;
      const map={};
      data.forEach(match=>{
        const book=match.bookmakers?.[0]?.markets?.[0]?.outcomes;if(!book) return;
        const sorted=[...book].sort((a,b)=>a.price-b.price);
        const fav=sorted[0];const code=NAME_TO_CODE[fav?.name];
        if(code) map[code]=true;
      });
      setOddsMap(map);
    }).catch(()=>{});
  },[]);

  // Shared bracket view
  useEffect(()=>{
    if(!viewSharedUserId||!allBrackets.length) return;
    const b=allBrackets.find(x=>x.user_id===viewSharedUserId);
    if(b) setViewingBracket(b);
  },[viewSharedUserId,allBrackets]);

  // Auto-save
  const triggerSave=useCallback((overrides={})=>{
    if(locked||!user||!bracketId) return;
    setSaveStatus("saving");clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      const payload={
        bracket_name:overrides.bracketName??bracketName,
        group_picks:overrides.groupPicks??groupPicks,
        wildcard_picks:overrides.wildcardPicks??wildcardPicks,
        knockout_picks:overrides.knockoutPicks??knockoutPicks,
        champion_goal_diff_pick:overrides.championGoalDiff??championGoalDiff,
      };
      const{error}=await supabase.from("brackets").update(payload).eq("user_id",user.id).eq("pool_id",activePool);
      setSaveStatus(error?"error":"saved");setTimeout(()=>setSaveStatus("idle"),2500);
    },1500);
  },[locked,user,bracketId,bracketName,groupPicks,wildcardPicks,knockoutPicks,championGoalDiff,activePool]);

  const setGP=useCallback(v=>{setGroupPicks(v);triggerSave({groupPicks:typeof v==="function"?v(groupPicks):v});},[triggerSave,groupPicks]);
  const setWP=useCallback(v=>{setWildcardPicks(v);triggerSave({wildcardPicks:v});},[triggerSave]);
  const setKP=useCallback(v=>{setKnockoutPicks(v);triggerSave({knockoutPicks:typeof v==="function"?v(knockoutPicks):v});},[triggerSave,knockoutPicks]);
  const setCGD=useCallback(v=>{setChampionGoalDiff(v);triggerSave({championGoalDiff:v});},[triggerSave]);
  const saveName=name=>{setBracketName(name);triggerSave({bracketName:name});};
  const signOut=()=>supabase.auth.signOut();

  const myBracket=allBrackets.find(b=>b.user_id===user?.id);
  const displayName=user?.user_metadata?.full_name||user?.user_metadata?.display_name||user?.email||"";

  const navItems=[
    {id:"home",    label:"Standings",Icon:IcoTrophy},
    {id:"bracket", label:"Picks",    Icon:IcoBall},
    {id:"matches", label:"Matches",  Icon:IcoLive},
    {id:"insights",label:"Insights", Icon:IcoChart},
    ...(isAdmin?[{id:"manager",label:"Manager",Icon:IcoShield}]:[]),
  ];

  if(loading) return<Spinner/>;
  if(!user)   return<LoginScreen joinPool={joinPool}/>;

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        body{background:#0a0e1a;margin:0;}
        button{outline:none;}input{outline:none;}select{appearance:none;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#0a0e1a;}
        ::-webkit-scrollbar-thumb{background:#06b6d4;border-radius:2px;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes livepulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}
      `}</style>
      <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Barlow',sans-serif",maxWidth:900,margin:"0 auto",position:"relative",paddingTop:60}}>

        {/* Header */}
        <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:900,zIndex:200,background:C.navBg,borderBottom:`1px solid ${C.borderAccent}`,display:"flex",alignItems:"center",gap:10,padding:"8px 14px",height:60}}>
          <WCCLogo size={36}/>
          <div style={{flex:1,overflow:"hidden",minWidth:0}}>
            <button onClick={()=>pools.length>1&&setShowPoolSwitcher(v=>!v)} style={{background:"transparent",border:"none",padding:0,cursor:pools.length>1?"pointer":"default",textAlign:"left",width:"100%"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,color:C.accent,letterSpacing:2,lineHeight:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"flex",alignItems:"center",gap:4}}>
                WORLD CUP CHALLENGE {pools.length>1&&<span style={{fontSize:12}}>▾</span>}
              </div>
              <div style={{fontSize:10,color:C.muted,fontFamily:"'Barlow',sans-serif"}}>{currentPool.name}</div>
            </button>
            {page==="bracket"&&saveStatus!=="idle"&&<SaveBadge status={saveStatus}/>}
            {page==="bracket"&&saveStatus==="idle"&&(
              editingName
                ?<input autoFocus value={bracketName} onChange={e=>setBracketName(e.target.value)} onBlur={()=>{setEditingName(false);saveName(bracketName);}} onKeyDown={e=>e.key==="Enter"&&(setEditingName(false),saveName(bracketName))} style={{background:"transparent",border:"none",borderBottom:`1px solid ${C.accent}`,color:C.accent,fontFamily:"'Barlow',sans-serif",fontSize:11,maxWidth:180}}/>
                :<button onClick={()=>!locked&&setEditingName(true)} style={{background:"transparent",border:"none",color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,cursor:locked?"default":"pointer",padding:0}}>{bracketName}{!locked&&" ✏"}</button>
            )}
          </div>
          {locked&&<span style={{background:"rgba(239,68,68,.15)",color:C.red,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,padding:"3px 8px",borderRadius:16,animation:"pulse 2s infinite",flexShrink:0}}>🔴 LIVE</span>}
          <button onClick={signOut} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:.5,padding:"5px 10px",cursor:"pointer",flexShrink:0}}>OUT</button>
        </div>

        {/* Pool switcher */}
        {showPoolSwitcher&&pools.length>1&&(
          <div style={{position:"fixed",top:60,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:900,background:C.card2,borderBottom:`1px solid ${C.borderAccent}`,zIndex:190,padding:12}}>
            {pools.map(p=>(
              <div key={p.id} onClick={()=>{setActivePool(p.id);setShowPoolSwitcher(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,cursor:"pointer",background:p.id===activePool?"rgba(6,182,212,.1)":"transparent",marginBottom:4}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:p.id===activePool?C.accent:C.muted,flexShrink:0}}/>
                <span style={{color:p.id===activePool?C.accent:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600,flex:1}}>{p.name}</span>
                <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{p.code}</span>
              </div>
            ))}
          </div>
        )}

        {/* Join banner */}
        {joinCode&&joinPool&&joinStatus==="joining"&&<div style={{background:"rgba(6,182,212,.15)",borderBottom:`1px solid ${C.borderAccent}`,padding:"10px 14px",textAlign:"center"}}><span style={{color:C.accent,fontFamily:"'Barlow',sans-serif",fontSize:13}}>Joining <strong>{joinPool.name}</strong>…</span></div>}
        {joinCode&&joinPool&&joinStatus==="done"&&<div style={{background:"rgba(34,197,94,.1)",borderBottom:`1px solid rgba(34,197,94,.3)`,padding:"10px 14px",textAlign:"center"}}><span style={{color:C.green,fontFamily:"'Barlow',sans-serif",fontSize:13}}>✓ Joined <strong>{joinPool.name}</strong>! Make your picks.</span></div>}

        {/* Pages */}
        {page==="home"    &&<LeaderboardPage userId={user.id} displayName={displayName} bracketComplete={bracketComplete} bracketName={bracketName} allBrackets={allBrackets} results={results} locked={locked} picksVisible={picksVisible} onViewBracket={setViewingBracket} onH2H={b=>{setH2hBracket(b);}} oddsMap={oddsMap} currentPool={currentPool} matches={matches}/>}
        {page==="bracket" &&<BracketPage step={bracketStep} setStep={setBracketStep} groupPicks={groupPicks} setGroupPicks={setGP} wildcardPicks={wildcardPicks} setWildcardPicks={setWP} knockoutPicks={knockoutPicks} setKnockoutPicks={setKP} locked={locked} results={results} championGoalDiff={championGoalDiff} setChampionGoalDiff={setCGD}/>}
        {page==="matches" &&<MatchesPage matches={matches} loading={matchesLoading}/>}
        {page==="insights"&&<InsightsPage allBrackets={allBrackets} userId={user.id} results={results} picksVisible={picksVisible} matches={matches}/>}
        {page==="manager" &&isAdmin&&<ManagerPage allBrackets={allBrackets} results={results} onResultsUpdate={loadResults} pools={pools} onPoolCreated={loadPools}/>}

        {/* Bottom nav */}
        <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:900,background:C.navBg,borderTop:`1px solid ${C.borderAccent}`,display:"flex",justifyContent:"space-around",padding:"6px 0 max(env(safe-area-inset-bottom),6px)",zIndex:200}}>
          {navItems.map(({id,label,Icon})=>(
            <button key={id} onClick={()=>{setPage(id);setShowPoolSwitcher(false);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 12px",background:"transparent",border:"none",cursor:"pointer",color:page===id?C.accent:C.muted,minWidth:0,position:"relative"}}>
              <Icon s={22} c={page===id?C.accent:C.muted}/>
              {/* Match day badge */}
              {id==="matches"&&(hasLiveMatch||hasMatchesToday)&&page!=="matches"&&(
                <div style={{position:"absolute",top:2,right:8,width:7,height:7,borderRadius:"50%",background:hasLiveMatch?C.red:C.accent,animation:hasLiveMatch?"livepulse 1.5s infinite":"none"}}/>
              )}
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:10,letterSpacing:.5,whiteSpace:"nowrap"}}>{label}</span>
              {page===id&&<div style={{width:18,height:2,background:C.accent,borderRadius:1}}/>}
            </button>
          ))}
        </nav>

        {/* Modals */}
        {viewingBracket&&<BracketViewer bracket={viewingBracket} results={results} onClose={()=>{setViewingBracket(null);if(viewSharedUserId) window.history.replaceState({},"","/");}}/>}
        {h2hBracket&&myBracket&&<HeadToHeadModal myBracket={myBracket} opponent={h2hBracket} results={results} onClose={()=>setH2hBracket(null)}/>}
      </div>
    </>
  );
}
