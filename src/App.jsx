// App.jsx - World Cup Challenge 2026 - v3
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "./supabase";

const ADMIN_EMAIL = "clunney22@gmail.com";
const RESULTS_ROW = "00000000-0000-0000-0000-000000000001";
const KICKOFF     = new Date("2026-06-11T18:00:00Z");

// FIFA Rankings - Official April 1, 2026 release (most recent pre-tournament)
// Source: FIFA.com / Wikipedia. Next update: June 9, 2026
const FIFA_RANKINGS = {
  "fr":1,"es":2,"ar":3,"gb-eng":4,"pt":5,"br":6,"nl":7,"ma":8,"be":9,"de":10,
  "hr":11,"co":13,"sn":14,"mx":15,"us":16,"uy":17,"jp":18,"ch":19,
  "ir":21,"au":23,"kr":24,"at":25,"no":27,"tn":30,"se":31,
  "eg":33,"dz":35,"cz":36,"gb-sct":39,"ec":40,"ca":41,
  "qa":42,"tr":47,"ci":48,"pa":49,"py":52,"cd":53,"ba":55,"sa":56,
  "cv":60,"gh":63,"za":67,"iq":70,"jo":78,"uz":82,"ht":86,"cw":95,"nz":97,
};

// Groups pre-sorted best to worst by FIFA ranking
const WC_GROUPS = {
  A:[{name:"Mexico",code:"mx"},{name:"South Korea",code:"kr"},{name:"Czechia",code:"cz"},{name:"South Africa",code:"za"}],
  B:[{name:"Switzerland",code:"ch"},{name:"Canada",code:"ca"},{name:"Qatar",code:"qa"},{name:"Bosnia & Herz.",code:"ba"}],
  C:[{name:"Brazil",code:"br"},{name:"Morocco",code:"ma"},{name:"Scotland",code:"gb-sct"},{name:"Haiti",code:"ht"}],
  D:[{name:"USA",code:"us"},{name:"Australia",code:"au"},{name:"Turkiye",code:"tr"},{name:"Paraguay",code:"py"}],
  E:[{name:"Germany",code:"de"},{name:"Ecuador",code:"ec"},{name:"Ivory Coast",code:"ci"},{name:"Curacao",code:"cw"}],
  F:[{name:"Netherlands",code:"nl"},{name:"Japan",code:"jp"},{name:"Tunisia",code:"tn"},{name:"Sweden",code:"se"}],
  G:[{name:"Belgium",code:"be"},{name:"Iran",code:"ir"},{name:"Egypt",code:"eg"},{name:"New Zealand",code:"nz"}],
  H:[{name:"Spain",code:"es"},{name:"Uruguay",code:"uy"},{name:"Saudi Arabia",code:"sa"},{name:"Cape Verde",code:"cv"}],
  I:[{name:"France",code:"fr"},{name:"Senegal",code:"sn"},{name:"Norway",code:"no"},{name:"Iraq",code:"iq"}],
  J:[{name:"Argentina",code:"ar"},{name:"Austria",code:"at"},{name:"Algeria",code:"dz"},{name:"Jordan",code:"jo"}],
  K:[{name:"Portugal",code:"pt"},{name:"Colombia",code:"co"},{name:"DR Congo",code:"cd"},{name:"Uzbekistan",code:"uz"}],
  L:[{name:"England",code:"gb-eng"},{name:"Croatia",code:"hr"},{name:"Panama",code:"pa"},{name:"Ghana",code:"gh"}],
};
const ALL_TEAMS = Object.values(WC_GROUPS).flat();

// Name normalisation for odds/match API
const normName = n => (n||"").toLowerCase()
  .replace("united states","usa").replace("turkiye","turkey")
  .replace("korea republic","south korea").replace("ir iran","iran")
  .replace("congo dr","dr congo").replace("curacao","curacao");

const NAME_TO_CODE = {
  "Mexico":"mx","South Africa":"za","Korea Republic":"kr","South Korea":"kr",
  "Czechia":"cz","Czech Republic":"cz","Canada":"ca","Switzerland":"ch",
  "Qatar":"qa","Bosnia and Herzegovina":"ba","Bosnia & Herz.":"ba",
  "Brazil":"br","Morocco":"ma","Haiti":"ht","Scotland":"gb-sct",
  "United States":"us","USA":"us","Paraguay":"py","Australia":"au",
  "Turkiye":"tr","Turkey":"tr","Germany":"de","Curacao":"cw",
  "Ivory Coast":"ci","Cote d Ivoire":"ci","Ecuador":"ec",
  "Netherlands":"nl","Japan":"jp","Sweden":"se","Tunisia":"tn",
  "Belgium":"be","Egypt":"eg","Iran":"ir","IR Iran":"ir","New Zealand":"nz",
  "Spain":"es","Cape Verde":"cv","Saudi Arabia":"sa","Uruguay":"uy",
  "France":"fr","Senegal":"sn","Norway":"no","Iraq":"iq",
  "Argentina":"ar","Algeria":"dz","Austria":"at","Jordan":"jo",
  "Portugal":"pt","Congo DR":"cd","DR Congo":"cd","Uzbekistan":"uz",
  "Colombia":"co","England":"gb-eng","Croatia":"hr","Ghana":"gh","Panama":"pa",
};

// Official 2026 WC venue map - fallback if API doesn't return venue
const MATCH_VENUES = {
  "Mexico-South Africa":"Estadio Azteca, Mexico City",
  "South Korea-Czechia":"Estadio Guadalajara",
  "Canada-Bosnia & Herz.":"BMO Field, Toronto",
  "USA-Paraguay":"SoFi Stadium, Los Angeles",
  "Brazil-Morocco":"AT&T Stadium, Arlington",
  "Netherlands-Japan":"Lumen Field, Seattle",
  "Belgium-Iran":"BC Place, Vancouver",
  "Spain-Uruguay":"Hard Rock Stadium, Miami",
  "France-Senegal":"MetLife Stadium, East Rutherford",
  "Argentina-Austria":"Rose Bowl, Pasadena",
  "Portugal-Colombia":"Levi's Stadium, Santa Clara",
  "England-Croatia":"Mercedes-Benz Stadium, Atlanta",
};
const getVenue=(m)=>{
  if(m.venue) return m.venue;
  const key=m.homeTeam?.name+"-"+m.awayTeam?.name;
  const key2=m.awayTeam?.name+"-"+m.homeTeam?.name;
  return MATCH_VENUES[key]||MATCH_VENUES[key2]||null;
};

const DEFAULT_SCORING = {exactPos:3,advancedWrong:1,wildcardCorrect:2,perfectGroup:6,r32:2,r16:4,qf:9,sf:13,third:5,champion:20};
const MAX_POSSIBLE = 368;
const ROUNDS = [
  {id:"r32",label:"R32",fullLabel:"Round of 32",n:16,pts:2},
  {id:"r16",label:"R16",fullLabel:"Round of 16",n:8,pts:4},
  {id:"qf",label:"QF",fullLabel:"Quarterfinals",n:4,pts:9},
  {id:"sf",label:"SF",fullLabel:"Semifinals",n:2,pts:13},
];
const STAGE_TO_ROUND = {LAST_32:"r32",LAST_16:"r16",QUARTER_FINALS:"qf",SEMI_FINALS:"sf",FINAL:"final"};

const C = {
  bg:"#0a0e1a",card:"#111827",card2:"#0d1321",
  accent:"#06b6d4",accentDim:"rgba(6,182,212,0.18)",
  text:"#f1f5f9",muted:"#64748b",
  green:"#22C55E",red:"#ef4444",amber:"#f59e0b",
  border:"rgba(255,255,255,0.07)",borderAccent:"rgba(6,182,212,0.28)",
  navBg:"#0a0f1e",
};
const btn = (primary=true,disabled=false) => ({
  padding:"12px 18px",fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1.5,
  borderRadius:10,cursor:disabled?"not-allowed":"pointer",
  border:primary?"none":"1px solid "+C.accentDim,
  background:disabled?C.card2:primary?"linear-gradient(135deg,"+C.accent+",#0891b2)":"transparent",
  color:disabled?C.muted:primary?"#0a0e1a":C.accent,transition:"all .15s",
});
const inp = {
  width:"100%",padding:"11px 12px",background:C.card2,border:"1px solid "+C.border,
  borderRadius:8,color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:14,
  marginBottom:10,boxSizing:"border-box",outline:"none",
};

// ---- Helpers ----
const ordinal = n => { if(!n) return "---"; const s=["th","st","nd","rd"],v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); };
const toET    = u => u?new Date(u).toLocaleString("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:true}):"";
const toETTime= u => u?new Date(u).toLocaleString("en-US",{timeZone:"America/New_York",hour:"numeric",minute:"2-digit",hour12:true}):"";
const isMobile = () => window.innerWidth<600||("ontouchstart" in window);
const codeFromName = n => n.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8)||"POOL"+Math.random().toString(36).slice(2,6).toUpperCase();
const initGroupPicks = () => { const p={}; Object.keys(WC_GROUPS).forEach(g=>{p[g]=[...WC_GROUPS[g]];}); return p; };
const initWildcardRanking = (picks,groupPicks) => {
  const allThirds = Object.keys(WC_GROUPS).map(g=>groupPicks[g]?.[2]).filter(Boolean);
  const selected  = picks.map(code=>allThirds.find(t=>t?.code===code)).filter(Boolean);
  return selected.sort((a,b)=>(FIFA_RANKINGS[a.code]||99)-(FIFA_RANKINGS[b.code]||99));
};

// Build Round of 32 using ranked wildcards (WC1 vs WC2, WC3 vs WC4, etc.)
// Official 2026 FIFA World Cup Round of 32 bracket (Wikipedia/FIFA confirmed)
// 8 group winners face wildcards, 8 runner-up pairs face each other.
// Wildcards NEVER play each other.
// Source: wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage
const buildR32 = (gp, wp, wcRanking) => {
  const g = (grp,pos) => gp[grp]?.[pos]||null;
  const allThirds = Object.keys(WC_GROUPS).map(grp=>gp[grp]?.[2]).filter(Boolean);
  let wcTeams;
  if(wcRanking&&wcRanking.length>0){
    wcTeams = wcRanking.filter(t=>t&&wp.includes(t.code));
  } else {
    wcTeams = wp.map(code=>allThirds.find(t=>t?.code===code)).filter(Boolean)
               .sort((a,b)=>(FIFA_RANKINGS[a.code]||99)-(FIFA_RANKINGS[b.code]||99));
  }
  const wc = i => wcTeams[i]||null;
  return [
    // Match 73: 2A vs 2B
    [g("A",1), g("B",1)],
    // Match 74: 1E vs WC1 (best wildcard)
    [g("E",0), wc(0)],
    // Match 75: 1F vs 2C
    [g("F",0), g("C",1)],
    // Match 76: 1C vs 2F
    [g("C",0), g("F",1)],
    // Match 77: 1I vs WC2
    [g("I",0), wc(1)],
    // Match 78: 2E vs 2I
    [g("E",1), g("I",1)],
    // Match 79: 1A vs WC3
    [g("A",0), wc(2)],
    // Match 80: 1L vs WC4
    [g("L",0), wc(3)],
    // Match 81: 1D vs WC5
    [g("D",0), wc(4)],
    // Match 82: 1G vs WC6
    [g("G",0), wc(5)],
    // Match 83: 2K vs 2L
    [g("K",1), g("L",1)],
    // Match 84: 1H vs 2J
    [g("H",0), g("J",1)],
    // Match 85: 1B vs WC7
    [g("B",0), wc(6)],
    // Match 86: 1J vs 2H
    [g("J",0), g("H",1)],
    // Match 87: 1K vs WC8 (weakest wildcard)
    [g("K",0), wc(7)],
    // Match 88: 2D vs 2G
    [g("D",1), g("G",1)],
  ];
};

function calculateScore(bracket,results,scoring=DEFAULT_SCORING){
  if(!results||!bracket) return {total:0};
  let total=0;
  const gP=bracket.group_picks||{},gR=results.group_results||{},wc=results.wildcard_codes||[];
  Object.keys(WC_GROUPS).forEach(g=>{
    const pred=gP[g]||[],act=gR[g]||[];
    if(!act.length) return;
    let gPts=0,exact=0;
    pred.forEach((team,i)=>{
      const aIdx=act.findIndex(t=>t.code===team.code);
      if(aIdx===i){gPts+=scoring.exactPos;exact++;}
      else if(aIdx<=1) gPts+=scoring.advancedWrong;
      else if(wc.includes(team.code)&&aIdx===2) gPts+=scoring.wildcardCorrect;
    });
    if(exact===4) gPts+=scoring.perfectGroup;
    total+=gPts;
  });
  (bracket.wildcard_picks||[]).forEach(code=>{if(wc.includes(code))total+=scoring.wildcardCorrect;});
  const ko=bracket.knockout_picks||{},koR=results.knockout_results||{};
  ["r32","r16","qf","sf"].forEach(round=>{
    const act=koR[round]||{},pred=ko[round]||{};
    Object.keys(act).forEach(idx=>{if(pred[+idx]?.code===act[idx]?.code)total+=scoring[round];});
  });
  if(ko.thirdPlace?.code&&koR.thirdPlace?.code===ko.thirdPlace.code) total+=scoring.third;
  if(ko.champion?.code&&koR.champion?.code===ko.champion.code) total+=scoring.champion;
  return {total};
}

function calculateProjected(bracket,results,oddsMap,scoring=DEFAULT_SCORING){
  const base=calculateScore(bracket,results,scoring).total;
  if(!bracket?.knockout_picks) return base;
  let proj=base;
  const ko=bracket.knockout_picks,koR=results?.knockout_results||{};
  ["r32","r16","qf","sf"].forEach(round=>{
    const act=koR[round]||{},pred=ko[round]||{};
    Object.keys(pred).forEach(idx=>{if(act[+idx])return;const pick=pred[+idx];if(pick&&oddsMap[pick.code])proj+=scoring[round];});
  });
  if(!koR.champion&&ko.champion&&oddsMap[ko.champion.code]) proj+=scoring.champion;
  return proj;
}

function calculateMaxPoints(bracket,results,scoring=DEFAULT_SCORING){
  // Current score + points still earnable from each alive pick in remaining rounds
  const current=calculateScore(bracket,results,scoring).total;
  const ko=bracket?.knockout_picks||{};
  const koR=results?.knockout_results||{};
  let extra=0;
  // For each knockout round, add pts for picks where actual result not yet decided
  ["r32","r16","qf","sf"].forEach(round=>{
    const act=koR[round]||{};
    const pred=ko[round]||{};
    Object.entries(pred).forEach(([idx,pick])=>{
      if(!pick) return;
      if(act[+idx]) return; // already decided - points already in current score or lost
      extra+=scoring[round]||0; // still earnable
    });
  });
  // Tiebreaker final matches
  if(!koR.thirdPlace&&ko.thirdPlace) extra+=scoring.third||0;
  if(!koR.champion&&ko.champion) extra+=scoring.champion||0;
  return current+extra;
}

function getTeamsAlive(bracket,results){
  const koR=results?.knockout_results||{},ko=bracket?.knockout_picks||{};
  if(!Object.keys(koR).length) return null;
  const pickedCodes=new Set();
  ["r16","qf","sf"].forEach(r=>{Object.values(ko[r]||{}).forEach(t=>{if(t?.code)pickedCodes.add(t.code);});});
  if(ko.champion?.code) pickedCodes.add(ko.champion.code);
  let alive=0;
  pickedCodes.forEach(code=>{
    const isElim=["r32","r16","qf","sf"].some(r=>{
      const acts=Object.values(koR[r]||{});
      const rIdx=ROUNDS.findIndex(x=>x.id===r);
      const nextR=ROUNDS[rIdx+1];if(!nextR)return false;
      const nextW=Object.values(koR[nextR.id]||{}).map(t=>t?.code);
      return acts.some(t=>t?.code===code)&&!nextW.includes(code);
    });
    if(!isElim) alive++;
  });
  return alive;
}

// Chalk %: for each knockout pick, did you pick the better-ranked team?
function calcChalkPct(knockoutPicks,r32Teams){
  let chalk=0,total=0;
  // R32
  Object.entries(knockoutPicks.r32||{}).forEach(([idx,pick])=>{
    const match=r32Teams[+idx];if(!match||!pick) return;
    const[t1,t2]=match;if(!t1||!t2) return;
    const r1=FIFA_RANKINGS[t1.code]||99,r2=FIFA_RANKINGS[t2.code]||99;
    const fav=r1<=r2?t1:t2;
    total++;
    if(pick.code===fav.code) chalk++;
  });
  // R16,QF,SF,champion
  ["r16","qf","sf"].forEach(round=>{
    Object.entries(knockoutPicks[round]||{}).forEach(([idx,pick])=>{
      const prev=ROUNDS[ROUNDS.findIndex(r=>r.id===round)-1]?.id;
      if(!prev) return;
      const t1=knockoutPicks[prev]?.[+idx*2],t2=knockoutPicks[prev]?.[+idx*2+1];
      if(!t1||!t2||!pick) return;
      const r1=FIFA_RANKINGS[t1.code]||99,r2=FIFA_RANKINGS[t2.code]||99;
      const fav=r1<=r2?t1:t2;
      total++;if(pick.code===fav.code) chalk++;
    });
  });
  if(knockoutPicks.champion&&knockoutPicks.sf){
    const t1=knockoutPicks.sf?.[0],t2=knockoutPicks.sf?.[1];
    if(t1&&t2){
      const r1=FIFA_RANKINGS[t1.code]||99,r2=FIFA_RANKINGS[t2.code]||99;
      const fav=r1<=r2?t1:t2;total++;
      if(knockoutPicks.champion.code===fav.code) chalk++;
    }
  }
  return total>0?Math.round((chalk/total)*100):0;
}

function computeStats(allBrackets){
  const n=allBrackets.length;if(!n)return{champDist:[],groupConsensus:[],contrarian:[]};
  const cc={};
  allBrackets.forEach(b=>{const code=b.knockout_picks?.champion?.code;if(code)cc[code]=(cc[code]||0)+1;});
  const champDist=Object.entries(cc).map(([code,count])=>({team:ALL_TEAMS.find(t=>t.code===code),pct:Math.round(count/n*100),count})).filter(x=>x.team).sort((a,b)=>b.count-a.count);
  const groupConsensus=Object.keys(WC_GROUPS).map(g=>{
    const counts={};
    allBrackets.forEach(b=>{const code=b.group_picks?.[g]?.[0]?.code;if(code)counts[code]=(counts[code]||0)+1;});
    const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];if(!top)return null;
    return{group:g,team:WC_GROUPS[g].find(t=>t.code===top[0]),pct:Math.round(top[1]/n*100)};
  }).filter(Boolean);
  return{champDist,groupConsensus,contrarian:champDist.filter(x=>x.pct<=25&&x.pct>0)};
}

function computeRooting(myBracket,allBrackets){
  if(!myBracket||!allBrackets.length)return[];
  const ko=myBracket.knockout_picks||{},allCodes=new Set();
  ["r32","r16","qf","sf"].forEach(r=>{Object.values(ko[r]||{}).forEach(t=>{if(t?.code)allCodes.add(t.code);});});
  if(ko.champion?.code)allCodes.add(ko.champion.code);
  const remaining=[];
  allCodes.forEach(code=>{
    const team=ALL_TEAMS.find(t=>t.code===code);if(!team)return;
    const othersHave=allBrackets.filter(b=>b.user_id!==myBracket.user_id&&(Object.values(b.knockout_picks?.sf||{}).some(t=>t?.code===code)||b.knockout_picks?.champion?.code===code)).length;
    const uniq=1-(othersHave/Math.max(allBrackets.length-1,1));
    if(uniq>0.3)remaining.push({team,uniqueness:Math.round(uniq*100)});
  });
  return remaining.sort((a,b)=>b.uniqueness-a.uniqueness).slice(0,6);
}

function computeMatchEdge(apiMatch,allBrackets,results,scoring=DEFAULT_SCORING){
  if(!apiMatch||!allBrackets.length)return null;
  const homeCode=NAME_TO_CODE[apiMatch.homeTeam?.name],awayCode=NAME_TO_CODE[apiMatch.awayTeam?.name];
  const roundId=STAGE_TO_ROUND[apiMatch.stage];
  if(!roundId||roundId==="final"||!homeCode||!awayCode)return null;
  const roundPts=scoring[roundId]||0;
  const currentScores=allBrackets.map(b=>({...b,score:calculateScore(b,results,scoring).total}));
  const currentSorted=[...currentScores].sort((a,b)=>b.score-a.score);
  return[{code:homeCode,label:apiMatch.homeTeam?.shortName||apiMatch.homeTeam?.name},{code:awayCode,label:apiMatch.awayTeam?.shortName||apiMatch.awayTeam?.name}].map(winner=>{
    const withDelta=currentScores.map(b=>{const picked=Object.values(b.knockout_picks?.[roundId]||{}).some(t=>t?.code===winner.code);return{...b,projected:b.score+(picked?roundPts:0)};});
    const sorted=[...withDelta].sort((a,b)=>b.projected-a.projected);
    return{winner,standings:sorted.map((b,newPos)=>({...b,newPos:newPos+1,oldPos:currentSorted.findIndex(x=>x.user_id===b.user_id)+1,posChange:(currentSorted.findIndex(x=>x.user_id===b.user_id)+1)-(newPos+1)}))};
  });
}

// ---- Shared UI ----
const WCCLogo = ({size=40}) => (
  <svg width={size} height={size} viewBox="0 0 90 90" fill="none">
    <circle cx="45" cy="45" r="41" fill="#0d1a2e" stroke="#06b6d4" strokeWidth="2.2"/>
    <path d="M4 45 Q22 30 45 45 Q68 60 86 45" stroke="#06b6d4" strokeWidth="1.8" fill="none" strokeOpacity=".65"/>
    <path d="M45 4 Q30 22 45 45 Q60 68 45 86" stroke="#06b6d4" strokeWidth="1.8" fill="none" strokeOpacity=".65"/>
    <path d="M14 14 Q30 30 45 45 Q60 60 76 76" stroke="#06b6d4" strokeWidth="1.4" fill="none" strokeOpacity=".4"/>
    <text x="45" y="51" textAnchor="middle" fontFamily="Arial Black,Impact,sans-serif" fontSize="20" fill="white" fontWeight="900" letterSpacing="2">WCC</text>
  </svg>
);
const IcoTrophy = ({s=22,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 21h8M12 17v4M7 4H4a2 2 0 000 4c0 2.5 1.5 4.5 4 5M17 4h3a2 2 0 010 4c0 2.5-1.5 4.5-4 5"/>
    <path d="M5 9V4h14v5a7 7 0 01-14 0z"/>
  </svg>
);
const IcoBall = ({s=22,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    <path d="M2 12h20"/>
  </svg>
);
const IcoLive = ({s=22,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2"/>
    <path d="M6.3 6.3a8 8 0 000 11.4M17.7 6.3a8 8 0 010 11.4M3.5 3.5a12 12 0 000 17M20.5 3.5a12 12 0 010 17"/>
  </svg>
);
const IcoChart = ({s=22,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="17" r="1.5"/><circle cx="12" cy="11" r="1.5"/><circle cx="17" cy="6" r="1.5"/>
    <path d="M7 15.5l5-4.5 5-5M3 20h18"/>
  </svg>
);
const IcoShield = ({s=22,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);
const IcoPencil = ({s=14,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const Flag = ({code,size=28}) => (
  <img src={"https://flagcdn.com/w"+(size<=24?"20":"40")+"/"+code+".png"}
    style={{width:size,height:Math.round(size*.66),objectFit:"cover",borderRadius:2,flexShrink:0,display:"inline-block",verticalAlign:"middle"}}
    alt="" onError={e=>{e.target.style.opacity=0;}}/>
);
const FifaRank = ({code,showLabel=false}) => {
  const r = FIFA_RANKINGS[code];
  if(!r) return null;
  return (
    <span style={{color:"#475569",fontSize:9,fontFamily:"'Barlow',sans-serif",marginLeft:3,flexShrink:0,display:"inline-flex",alignItems:"center",gap:1}}>
      {showLabel&&<span style={{color:"#334155",fontSize:8}}>FIFA </span>}
      {"#"+r}
    </span>
  );
};
const Card = ({children,accent,style={}}) => (
  <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:"1px solid "+(accent?C.borderAccent:C.border),marginBottom:12,...style}}>
    {children}
  </div>
);
const SecHead = ({label,sub,right}) => (
  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
    <div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:C.accent,letterSpacing:1.5,lineHeight:1}}>{label}</div>
      {sub&&<div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginTop:3}}>{sub}</div>}
    </div>
    {right}
  </div>
);
const SaveBadge = ({status}) => {
  if(status==="idle") return null;
  const map={saving:[C.muted,"Saving..."],saved:[C.green,"Saved"],error:[C.red,"Failed"]};
  const[color,label]=map[status]||map.saved;
  return <span style={{color,fontFamily:"'Barlow',sans-serif",fontSize:11,fontWeight:600}}>{label}</span>;
};
const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:C.bg}}>
    <div style={{textAlign:"center"}}><WCCLogo size={72}/><p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",marginTop:16}}>Loading...</p></div>
  </div>
);
const PtsTag = ({pts,pending}) => {
  const base={fontSize:10,fontWeight:600,padding:"1px 7px",borderRadius:5,flexShrink:0};
  if(pending) return <span style={{...base,background:"rgba(100,116,139,.15)",color:C.muted}}>---</span>;
  if(pts>=3)  return <span style={{...base,background:"rgba(34,197,94,.15)",color:C.green}}>+{pts}</span>;
  if(pts>=1)  return <span style={{...base,background:"rgba(245,158,11,.15)",color:C.amber}}>+{pts}</span>;
  return        <span style={{...base,background:"rgba(239,68,68,.15)",color:C.red}}>0</span>;
};
const Toggle = ({val,onChange}) => (
  <button onClick={()=>onChange(!val)} style={{width:44,height:24,borderRadius:12,border:"none",background:val?C.green:C.card2,position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
    <div style={{width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:3,left:val?23:3,transition:"left .2s"}}/>
  </button>
);

// ---- Login ----
function LoginScreen({joinPool}){
  const[mode,setMode]=useState("login");
  const[email,setEmail]=useState(""),[ password,setPassword]=useState(""),[ name,setName]=useState("");
  const[error,setError]=useState(""),[ loading,setLoading]=useState(false),[ sent,setSent]=useState(false);
  const handleGoogle=async()=>{
    setLoading(true);setError("");
    const{error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+window.location.search}});
    if(error){setError(error.message);setLoading(false);}
  };
  const handleEmail=async()=>{
    setLoading(true);setError("");
    if(mode==="signup"){
      const{error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name}}});
      if(error)setError(error.message);else setSent(true);
    }else if(mode==="forgot"){
      const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"?reset=1"});
      if(error)setError(error.message);else setSent(true);
    }else{
      const{error}=await supabase.auth.signInWithPassword({email,password});
      if(error)setError(error.message);
    }
    setLoading(false);
  };
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <WCCLogo size={80}/>
      <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:C.accent,margin:"16px 0 4px",letterSpacing:3,textAlign:"center"}}>WORLD CUP CHALLENGE</h1>
      <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:14,marginBottom:joinPool?16:32,textAlign:"center"}}>2026 FIFA - Make your picks, track live scores</p>
      {joinPool&&(
        <div style={{background:"rgba(6,182,212,.1)",border:"1px solid "+C.borderAccent,borderRadius:10,padding:"12px 20px",marginBottom:24,textAlign:"center",maxWidth:340,width:"100%"}}>
          <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,marginBottom:4}}>YOU HAVE BEEN INVITED!</div>
          <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:14}}>Sign in to join <strong>{joinPool.name}</strong></div>
        </div>
      )}
      {sent?(
        <div style={{background:C.card,borderRadius:14,padding:28,maxWidth:340,width:"100%",textAlign:"center",border:"1px solid "+C.borderAccent}}>
          <h3 style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,margin:"0 0 10px"}}>CHECK YOUR EMAIL</h3>
          <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13,lineHeight:1.6}}>
            {mode==="forgot"?"Password reset link sent to":"Confirmation sent to"} <strong style={{color:C.text}}>{email}</strong>.
          </p>
          {mode==="forgot"&&<p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginTop:8,lineHeight:1.5}}>Click the link in your email to set a new password.</p>}
          <button onClick={()=>{setSent(false);setMode("login");}} style={{...btn(false),marginTop:16,width:"100%",fontSize:13}}>BACK TO SIGN IN</button>
        </div>
      ):(
        <div style={{background:C.card,borderRadius:14,padding:24,maxWidth:340,width:"100%",border:"1px solid "+C.borderAccent}}>
          <button onClick={handleGoogle} disabled={loading} style={{width:"100%",padding:13,background:"#fff",color:"#333",border:"none",borderRadius:10,fontFamily:"'Barlow',sans-serif",fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:20}}>
            <img src="https://www.google.com/favicon.ico" width={18} height={18} alt=""/>Continue with Google
          </button>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
            <div style={{flex:1,height:1,background:C.border}}/>
            <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>or email</span>
            <div style={{flex:1,height:1,background:C.border}}/>
          </div>
          {mode!=="forgot"&&(
            <div style={{display:"flex",marginBottom:16}}>
              {["login","signup"].map(m=>(
                <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:8,background:mode===m?C.accent:C.card2,color:mode===m?"#0a0e1a":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:.5,border:"1px solid "+C.borderAccent,borderRadius:m==="login"?"8px 0 0 8px":"0 8px 8px 0",cursor:"pointer"}}>
                  {m==="login"?"SIGN IN":"CREATE ACCOUNT"}
                </button>
              ))}
            </div>
          )}
          {mode==="forgot"&&(
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:C.accent,letterSpacing:1,marginBottom:6}}>RESET PASSWORD</div>
              <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13,marginBottom:12,lineHeight:1.5}}>Enter your email and we will send you a reset link.</p>
            </div>
          )}
          {mode==="signup"&&<input placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} style={inp}/>}
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={inp}/>
          {mode!=="forgot"&&<input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleEmail()} style={{...inp,marginBottom:14}}/>}
          {mode==="forgot"&&<div style={{height:4}}/>}
          {error&&<p style={{color:C.red,fontFamily:"'Barlow',sans-serif",fontSize:13,marginBottom:12}}>{error}</p>}
          <button onClick={handleEmail} disabled={loading||!email||(mode!=="forgot"&&!password)||(mode==="signup"&&!name)} style={{...btn(true,loading||!email||(mode!=="forgot"&&!password)||(mode==="signup"&&!name)),width:"100%",marginBottom:10}}>
            {loading?"...":(mode==="login"?"SIGN IN":mode==="signup"?"CREATE ACCOUNT":"SEND RESET LINK")}
          </button>
          {mode==="login"&&(
            <button onClick={()=>{setMode("forgot");setError("");setPassword("");}} style={{background:"transparent",border:"none",color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,cursor:"pointer",width:"100%",textAlign:"center",textDecoration:"underline"}}>
              Forgot password?
            </button>
          )}
          {mode==="forgot"&&(
            <button onClick={()=>{setMode("login");setError("");}} style={{background:"transparent",border:"none",color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,cursor:"pointer",width:"100%",textAlign:"center",textDecoration:"underline"}}>
              Back to sign in
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Bracket Name Modal (fires after joining) ----
function BracketNameModal({defaultName,onConfirm}){
  const[name,setName]=useState(defaultName||"");
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.card,borderRadius:16,padding:28,maxWidth:380,width:"100%",border:"1px solid "+C.borderAccent,textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:12}}>🏆</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:C.accent,letterSpacing:1.5,marginBottom:8}}>NAME YOUR BRACKET</div>
        <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13,lineHeight:1.6,marginBottom:20}}>This is how you appear on the leaderboard. You can change it any time before picks lock.</p>
        <input autoFocus value={name} onChange={e=>setName(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&name.trim()&&onConfirm(name.trim())}
          placeholder="e.g. Charlie's Chalk Picks"
          style={{...inp,fontSize:16,textAlign:"center",marginBottom:16}}/>
        <button onClick={()=>name.trim()&&onConfirm(name.trim())} disabled={!name.trim()} style={{...btn(true,!name.trim()),width:"100%"}}>
          LOCK IT IN
        </button>
      </div>
    </div>
  );
}

// ---- Pool Landing ----
function PoolLanding({userId,pools,poolsLoading,onSelectPool,onCreatePool}){
  const[joinInput,setJoinInput]=useState(""),[ joinPassword,setJoinPassword]=useState(""),[ joinError,setJoinError]=useState(""),[ joining,setJoining]=useState(false);
  const handleJoin=async()=>{
    if(!joinInput.trim())return;
    setJoining(true);setJoinError("");
    const code=joinInput.trim().toUpperCase();
    const{data:pool,error}=await supabase.from("pools").select("*").eq("code",code).single();
    if(error||!pool){setJoinError("Pool not found. Check the code and try again.");setJoining(false);return;}
    if(pool.invite_expires_at&&new Date()>new Date(pool.invite_expires_at)){setJoinError("This pool's invite link has expired.");setJoining(false);return;}
    if(pool.password&&pool.password!==joinPassword){setJoinError("Incorrect password.");setJoining(false);return;}
    const{error:joinErr}=await supabase.from("pool_members").insert({pool_id:pool.id,user_id:userId});
    if(joinErr&&!joinErr.message.includes("duplicate")){setJoinError(joinErr.message);setJoining(false);return;}
    await supabase.from("brackets").upsert({user_id:userId,pool_id:pool.id},{onConflict:"user_id,pool_id"});
    setJoining(false);onSelectPool(pool.id);
  };
  if(poolsLoading)return<Spinner/>;
  return(
    <div style={{minHeight:"100vh",background:C.bg,padding:20,paddingTop:80}}>
      <div style={{maxWidth:500,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <WCCLogo size={60}/>
          <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,letterSpacing:2,marginTop:10,marginBottom:4}}>WORLD CUP CHALLENGE - 2026</div>
          <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:20,fontWeight:600}}>{pools.length>0?"Your pools":"You are not in any pools yet"}</div>
          {pools.length===0&&<div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13,marginTop:6,lineHeight:1.5}}>Join a friend's pool with an invite link, or create your own.</div>}
        </div>
        {pools.map(p=>(
          <div key={p.id} onClick={()=>onSelectPool(p.id)} style={{background:C.card,borderRadius:12,padding:"14px 16px",marginBottom:10,border:"1.5px solid "+C.borderAccent,cursor:"pointer"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,background:"rgba(6,182,212,.15)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:C.accent,letterSpacing:1}}>{p.code.slice(0,3)}</div>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:14,fontWeight:600}}>{p.name}</div>
                <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,marginTop:2}}>{p.my_role==="manager"?"You manage this pool":"Member"}{p.scoring_config?" - Custom scoring":""}</div>
              </div>
              <span style={{color:C.accent,fontSize:18}}>{">"}</span>
            </div>
          </div>
        ))}
        <button onClick={onCreatePool} style={{width:"100%",border:"1.5px dashed rgba(6,182,212,.3)",borderRadius:12,padding:"14px 16px",background:"transparent",cursor:"pointer",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:1}}>+ CREATE A NEW POOL</span>
          {pools.length>0&&<span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{pools.length}/3 used</span>}
        </button>
        <div style={{background:C.card,borderRadius:12,padding:"14px 16px",border:"1px solid "+C.border,marginTop:16}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:10}}>JOIN WITH INVITE CODE</div>
          <input placeholder="Enter pool code (e.g. FFL2026)" value={joinInput} onChange={e=>setJoinInput(e.target.value.toUpperCase())} style={inp}/>
          <input type="password" placeholder="Password (if required)" value={joinPassword} onChange={e=>setJoinPassword(e.target.value)} style={{...inp,marginBottom:10}}/>
          {joinError&&<p style={{color:C.red,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:8}}>{joinError}</p>}
          <button onClick={handleJoin} disabled={joining||!joinInput.trim()} style={{...btn(true,joining||!joinInput.trim()),width:"100%"}}>{joining?"JOINING...":"JOIN POOL"}</button>
        </div>
      </div>
    </div>
  );
}

// ---- Create Pool Modal ----
function CreatePoolModal({userId,displayName,onCreated,onClose}){
  const[name,setName]=useState(""),[ code,setCode]=useState(""),[ password,setPassword]=useState(""),[ saving,setSaving]=useState(false),[ error,setError]=useState("");
  useEffect(()=>{if(name)setCode(codeFromName(name));},[name]);
  const inviteUrl=window.location.origin+"?join="+code;
  const create=async()=>{
    if(!name.trim()||!code.trim()){setError("Pool name and invite code are required.");return;}
    setSaving(true);setError("");
    const{data:pool,error:poolErr}=await supabase.from("pools").insert({name:name.trim(),code:code.trim().toUpperCase(),password:password||null,created_by:userId}).select().single();
    if(poolErr){setError(poolErr.message);setSaving(false);return;}
    await supabase.from("pool_members").insert({pool_id:pool.id,user_id:userId,role:"manager"});
    await supabase.from("brackets").upsert({user_id:userId,pool_id:pool.id,display_name:displayName},{onConflict:"user_id,pool_id"});
    setSaving(false);
    navigator.clipboard.writeText(inviteUrl).catch(()=>{});
    onCreated(pool.id);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,borderRadius:16,padding:24,maxWidth:400,width:"100%",border:"1px solid "+C.borderAccent,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:C.accent,letterSpacing:1.5}}>CREATE A POOL</div>
          <button onClick={onClose} style={{background:"transparent",border:"1px solid "+C.border,borderRadius:8,color:C.muted,padding:"6px 12px",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",fontSize:12}}>CANCEL</button>
        </div>
        <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,letterSpacing:1,marginBottom:5}}>POOL NAME</div>
        <input placeholder="e.g. Family World Cup Pool" value={name} onChange={e=>setName(e.target.value)} style={inp}/>
        <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,letterSpacing:1,marginBottom:5}}>INVITE CODE</div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12))} style={{...inp,marginBottom:0,flex:1,color:C.accent}}/>
          <button onClick={()=>setCode(codeFromName(name||"POOL"))} style={{...btn(false),padding:"11px 12px",fontSize:13,flexShrink:0}}>Reset</button>
        </div>
        <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,letterSpacing:1,marginBottom:5}}>PASSWORD (optional)</div>
        <input type="text" placeholder="Leave blank for link-only access" value={password} onChange={e=>setPassword(e.target.value)} style={inp}/>
        {code&&(
          <div style={{background:"rgba(6,182,212,.07)",border:"1px solid rgba(6,182,212,.15)",borderRadius:8,padding:"10px 12px",marginBottom:16}}>
            <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,marginBottom:4}}>INVITE LINK</div>
            <div style={{color:C.accent,fontFamily:"'Barlow',sans-serif",fontSize:11,wordBreak:"break-all"}}>{inviteUrl}</div>
            <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,marginTop:4}}>Expires Jun 11 at kickoff</div>
          </div>
        )}
        {error&&<p style={{color:C.red,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:10}}>{error}</p>}
        <button onClick={create} disabled={saving||!name||!code} style={{...btn(true,saving||!name||!code),width:"100%"}}>{saving?"CREATING...":"CREATE POOL & COPY LINK"}</button>
        <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,textAlign:"center",marginTop:8}}>You will be added as manager automatically</div>
      </div>
    </div>
  );
}

// ---- Group Cards ----
function GroupCardMobile({groupId,teams,onReorder,locked,actualGroup}){
  const[mode,setMode]=useState("pick"),[ swapSel,setSwapSel]=useState(null);
  const hasLive=actualGroup&&actualGroup.length>0;
  const rankLabel=["1st","2nd","3rd","4th"],rankColor=["#06b6d4","#94a3b8","#92400e","#334155"];
  const reset=()=>{if(locked)return;onReorder([...WC_GROUPS[groupId]]);setMode("pick");setSwapSel(null);};
  const handleTap=(team)=>{
    if(locked||hasLive)return;
    if(mode==="swap"){
      if(!swapSel){setSwapSel(team.code);return;}
      if(swapSel===team.code){setSwapSel(null);return;}
      const next=[...teams];
      const i=next.findIndex(t=>t.code===swapSel),j=next.findIndex(t=>t.code===team.code);
      [next[i],next[j]]=[next[j],next[i]];
      onReorder(next);setSwapSel(null);
    }
  };
  const move=(i,dir)=>{if(locked||hasLive)return;const next=[...teams],t=i+dir;if(t<0||t>3)return;[next[i],next[t]]=[next[t],next[i]];onReorder(next);};
  return(
    <div style={{background:C.card,borderRadius:12,padding:12,border:"1px solid "+C.borderAccent,marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <div style={{background:C.accent,color:"#0a0e1a",fontFamily:"'Bebas Neue',sans-serif",fontSize:13,width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{groupId}</div>
        <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1}}>GROUP {groupId}</span>
        {!locked&&!hasLive&&(
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <button onClick={()=>setMode(m=>m==="swap"?"pick":"swap")} style={{background:mode==="swap"?"rgba(6,182,212,.15)":"transparent",border:"1px solid "+(mode==="swap"?C.accent:C.accentDim),borderRadius:6,color:mode==="swap"?C.accent:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,padding:"3px 8px",cursor:"pointer"}}>
              {mode==="swap"?"Done":"Swap"}
            </button>
            <button onClick={reset} style={{background:"transparent",border:"none",color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,cursor:"pointer",padding:"3px 6px"}}>Reset</button>
          </div>
        )}
        {hasLive&&<span style={{marginLeft:"auto",color:C.green,fontFamily:"'Barlow',sans-serif",fontSize:10,fontWeight:600}}>FINAL</span>}
      </div>
      {mode==="swap"&&!locked&&<div style={{color:C.amber,fontFamily:"'Barlow',sans-serif",fontSize:11,marginBottom:8,padding:"6px 8px",background:"rgba(245,158,11,.08)",borderRadius:6}}>Tap two teams to swap positions</div>}
      {teams.map((team,i)=>{
        const isSwapSel=swapSel===team.code;
        const actualPos=hasLive?actualGroup.findIndex(t=>t.code===team.code):-1;
        const correct=hasLive&&actualPos===i;
        const actualTeam=hasLive?actualGroup[i]:null;
        return(
          <div key={team.code} onClick={()=>handleTap(team)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px",marginBottom:i<3?5:0,background:isSwapSel?"rgba(6,182,212,.2)":i===0?"rgba(6,182,212,.1)":"rgba(255,255,255,.03)",borderRadius:8,border:"1px solid "+(isSwapSel?C.accent:i===0?C.accentDim:"transparent"),cursor:locked||hasLive?"default":mode==="swap"?"pointer":"default"}}>
            <span style={{color:rankColor[i],fontFamily:"'Bebas Neue',sans-serif",fontSize:12,width:26,flexShrink:0}}>{rankLabel[i]}</span>
            <Flag code={team.code} size={22}/>
            <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:12,fontWeight:500,flex:1}}>{team.name}</span>
            <FifaRank code={team.code}/>
            {hasLive&&<div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}><span style={{fontSize:12,color:correct?C.green:C.red}}>{correct?"OK":"X"}</span>{actualTeam&&actualTeam.code!==team.code&&<Flag code={actualTeam.code} size={16}/>}</div>}
            {!locked&&!hasLive&&<div style={{display:"flex",flexDirection:"column",gap:2}}>{[[-1,"^"],[1,"v"]].map(([dir,sym])=>(<button key={sym} onClick={e=>{e.stopPropagation();move(i,dir);}} disabled={(dir===-1&&i===0)||(dir===1&&i===3)} style={{background:"transparent",border:"1px solid "+C.accentDim,borderRadius:3,width:22,height:17,color:((dir===-1&&i===0)||(dir===1&&i===3))?C.muted:C.accent,cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>{sym}</button>))}</div>}
          </div>
        );
      })}
    </div>
  );
}

function GroupCardDesktop({groupId,teams,onReorder,locked,actualGroup}){
  const rankLabel=["1st","2nd","3rd","4th"],rankColor=["#06b6d4","#94a3b8","#92400e","#334155"];
  const rankBg=["rgba(6,182,212,0.1)","rgba(148,163,184,0.06)","rgba(120,80,30,0.07)","transparent"];
  const dragIdx=useRef(null),[ dragOver,setDragOver]=useState(null);
  const hasLive=actualGroup&&actualGroup.length>0;
  const move=(i,dir)=>{if(locked||hasLive)return;const next=[...teams],t=i+dir;if(t<0||t>3)return;[next[i],next[t]]=[next[t],next[i]];onReorder(next);};
  const onDragStart=(e,i)=>{if(locked||hasLive){e.preventDefault();return;}dragIdx.current=i;e.dataTransfer.effectAllowed="move";};
  const onDragEnter=(e,i)=>{e.preventDefault();setDragOver(i);};
  const onDragOver=(e)=>{e.preventDefault();e.dataTransfer.dropEffect="move";};
  const onDrop=(e,i)=>{e.preventDefault();if(dragIdx.current!==null&&dragIdx.current!==i){const next=[...teams];const[rem]=next.splice(dragIdx.current,1);next.splice(i,0,rem);onReorder(next);}dragIdx.current=null;setDragOver(null);};
  const onDragEnd=()=>{dragIdx.current=null;setDragOver(null);};
  return(
    <div style={{background:C.card,borderRadius:12,padding:12,border:"1px solid "+C.borderAccent}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <div style={{background:C.accent,color:"#0a0e1a",fontFamily:"'Bebas Neue',sans-serif",fontSize:13,width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{groupId}</div>
        <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1}}>GROUP {groupId}</span>
        {hasLive&&<span style={{marginLeft:"auto",color:C.green,fontFamily:"'Barlow',sans-serif",fontSize:10,fontWeight:600}}>FINAL</span>}
        {!locked&&!hasLive&&<span style={{marginLeft:"auto",color:C.muted,fontSize:10}}>drag or use arrows</span>}
      </div>
      {teams.map((team,i)=>{
        const isOver=dragOver===i&&dragIdx.current!==null&&dragIdx.current!==i;
        const actualPos=hasLive?actualGroup.findIndex(t=>t.code===team.code):-1;
        const correct=hasLive&&actualPos===i;
        const actualTeam=hasLive?actualGroup[i]:null;
        return(
          <div key={team.code} draggable={!locked&&!hasLive} onDragStart={e=>onDragStart(e,i)} onDragEnter={e=>onDragEnter(e,i)} onDragOver={onDragOver} onDrop={e=>onDrop(e,i)} onDragEnd={onDragEnd}
            style={{display:"flex",alignItems:"center",gap:7,background:isOver?"rgba(6,182,212,0.2)":rankBg[i],borderRadius:7,padding:"7px 8px",marginBottom:i<3?4:0,border:isOver?"1.5px dashed "+C.accent:i===0?"1px solid "+C.accentDim:"1px solid transparent",cursor:locked||hasLive?"default":"grab",userSelect:"none"}}>
            {!locked&&!hasLive&&<span style={{color:C.muted,fontSize:11,flexShrink:0}}>::::</span>}
            <span style={{color:rankColor[i],fontFamily:"'Bebas Neue',sans-serif",fontSize:11,width:22,flexShrink:0}}>{rankLabel[i]}</span>
            <Flag code={team.code} size={20}/>
            <span style={{color:C.text,fontSize:11,fontFamily:"'Barlow',sans-serif",fontWeight:500,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{team.name}</span>
            <FifaRank code={team.code}/>
            {hasLive&&<div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}><span style={{fontSize:12,color:correct?C.green:C.red}}>{correct?"OK":"X"}</span>{actualTeam&&actualTeam.code!==team.code&&<Flag code={actualTeam.code} size={16}/>}</div>}
            {!locked&&!hasLive&&<div style={{display:"flex",flexDirection:"column",gap:2}}>{[[-1,"^"],[1,"v"]].map(([dir,sym])=>(<button key={sym} onClick={e=>{e.stopPropagation();move(i,dir);}} disabled={(dir===-1&&i===0)||(dir===1&&i===3)} style={{background:"transparent",border:"1px solid "+C.accentDim,borderRadius:3,width:20,height:16,color:((dir===-1&&i===0)||(dir===1&&i===3))?C.muted:C.accent,cursor:"pointer",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center"}}>{sym}</button>))}</div>}
          </div>
        );
      })}
    </div>
  );
}

const GroupCard=(props)=>isMobile()?<GroupCardMobile {...props}/>:<GroupCardDesktop {...props}/>;

// ---- Group Stage Page ----
function GroupStagePage({groupPicks,setGroupPicks,locked,onNext,results}){
  const navBtn=(
    <div style={{padding:"12px 12px 0"}}>
      <button onClick={onNext} style={{...btn(true),width:"100%"}}>NEXT: WILDCARD PICKS</button>
    </div>
  );
  return(
    <div style={{paddingBottom:90}}>
      <div style={{padding:"14px 14px 10px",background:C.bg,position:"sticky",top:58,zIndex:9,borderBottom:"1px solid "+C.borderAccent}}>
        <SecHead label="GROUP STAGE PICKS" sub="Rank all 4 teams per group. Pre-sorted by FIFA ranking (#). +3 exact, +1 if they advance, +6 perfect group bonus."/>
        {!locked&&navBtn}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:10,padding:12}}>
        {Object.keys(WC_GROUPS).map(g=>(
          <GroupCard key={g} groupId={g} teams={groupPicks[g]} locked={locked}
            actualGroup={results?.group_results?.[g]}
            onReorder={order=>setGroupPicks(prev=>({...prev,[g]:order}))}/>
        ))}
      </div>
      {!locked&&<div style={{padding:"0 12px 12px"}}><button onClick={onNext} style={{...btn(true),width:"100%"}}>NEXT: WILDCARD PICKS</button></div>}
    </div>
  );
}

// ---- Wildcard Page ----
function WildcardPage({groupPicks,wildcardPicks,setWildcardPicks,wildcardRanking,setWildcardRanking,locked,onNext,onBack,results}){
  const[phase,setPhase]=useState("pick"); // "pick" | "rank"
  const thirds=Object.keys(WC_GROUPS).map(g=>({group:g,team:groupPicks[g][2]}));
  const actualWC=results?.wildcard_codes||[],hasActual=actualWC.length>0;
  const[swapSel,setSwapSel]=useState(null);

  const toggle=code=>{
    if(locked)return;
    setWildcardPicks(prev=>prev.includes(code)?prev.filter(c=>c!==code):prev.length<8?[...prev,code]:prev);
  };
  const remaining=8-wildcardPicks.length;

  const goToRank=()=>{
    const ranked=initWildcardRanking(wildcardPicks,groupPicks);
    setWildcardRanking(ranked);
    setPhase("rank");
  };

  // Ranking phase
  const moveRank=(i,dir)=>{
    const next=[...wildcardRanking],t=i+dir;
    if(t<0||t>=next.length)return;
    [next[i],next[t]]=[next[t],next[i]];
    setWildcardRanking(next);
  };
  const handleSwap=(team)=>{
    if(!swapSel){setSwapSel(team.code);return;}
    if(swapSel===team.code){setSwapSel(null);return;}
    const next=[...wildcardRanking];
    const i=next.findIndex(t=>t.code===swapSel),j=next.findIndex(t=>t.code===team.code);
    [next[i],next[j]]=[next[j],next[i]];
    setWildcardRanking(next);setSwapSel(null);
  };

  const wcDragIdx=useRef(null),[wcDragOver,setWcDragOver]=useState(null);
  const onWcDragStart=(e,i)=>{wcDragIdx.current=i;e.dataTransfer.effectAllowed="move";};
  const onWcDragEnter=(e,i)=>{e.preventDefault();setWcDragOver(i);};
  const onWcDragOver=(e)=>{e.preventDefault();e.dataTransfer.dropEffect="move";};
  const onWcDrop=(e,i)=>{e.preventDefault();if(wcDragIdx.current!==null&&wcDragIdx.current!==i){const next=[...wildcardRanking];const[r]=next.splice(wcDragIdx.current,1);next.splice(i,0,r);setWildcardRanking(next);}wcDragIdx.current=null;setWcDragOver(null);};
  const onWcDragEnd=()=>{wcDragIdx.current=null;setWcDragOver(null);};

  if(phase==="rank"&&!hasActual){
    return(
      <div style={{paddingBottom:90}}>
        <div style={{padding:"14px 14px 10px",background:C.bg,position:"sticky",top:58,zIndex:9,borderBottom:"1px solid "+C.borderAccent}}>
          <SecHead label="RANK YOUR WILDCARDS" sub="Drag or use arrows to rank best to worst. Ranking #1 plays the toughest opponent; #8 gets the easiest - same as real WC seeding."/>
          <div style={{background:"rgba(6,182,212,.07)",border:"1px solid "+C.borderAccent,borderRadius:8,padding:"8px 12px",marginBottom:8}}>
            <div style={{color:C.accent,fontFamily:"'Barlow',sans-serif",fontSize:11}}>Pre-sorted by FIFA ranking. Drag the handle dots or use arrows to adjust.</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setPhase("pick")} style={{...btn(false),flex:1,fontSize:13,padding:"8px"}}>BACK</button>
            <button onClick={()=>onNext()} style={{...btn(true),flex:2}}>BUILD BRACKET</button>
          </div>
        </div>
        <div style={{padding:12}}>
          {wildcardRanking.map((team,i)=>(
            <div key={team.code}
              draggable={true}
              onDragStart={e=>onWcDragStart(e,i)} onDragEnter={e=>onWcDragEnter(e,i)}
              onDragOver={onWcDragOver} onDrop={e=>onWcDrop(e,i)} onDragEnd={onWcDragEnd}
              onClick={()=>isMobile()&&handleSwap(team)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",marginBottom:8,background:wcDragOver===i?"rgba(6,182,212,.15)":swapSel===team.code?"rgba(6,182,212,.2)":C.card,borderRadius:10,border:"1px solid "+(wcDragOver===i||swapSel===team.code?C.accent:C.borderAccent),cursor:"grab",userSelect:"none"}}>
              <span style={{color:C.muted,fontSize:14,flexShrink:0,cursor:"grab",padding:"0 2px",letterSpacing:-1}}>{":: "}</span>
              <div style={{width:28,height:28,borderRadius:"50%",background:i===0?"linear-gradient(135deg,"+C.accent+",#0891b2)":"rgba(6,182,212,.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{color:i===0?"#0a0e1a":C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13}}>{i+1}</span>
              </div>
              <Flag code={team.code} size={26}/>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600}}>{team.name}</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <FifaRank code={team.code}/>
                  <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10}}>{i===0?"Best seed - toughest draw":i===7?"Weakest seed - easiest draw":""}</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                {[[-1,"^"],[1,"v"]].map(([dir,sym])=>(
                  <button key={sym} onClick={e=>{e.stopPropagation();moveRank(i,dir);}}
                    disabled={(dir===-1&&i===0)||(dir===1&&i===wildcardRanking.length-1)}
                    style={{background:"transparent",border:"1px solid "+C.accentDim,borderRadius:3,width:24,height:18,color:((dir===-1&&i===0)||(dir===1&&i===wildcardRanking.length-1))?C.muted:C.accent,cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{padding:"0 12px 12px"}}>
          <button onClick={()=>onNext()} style={{...btn(true),width:"100%"}}>BUILD BRACKET</button>
        </div>
      </div>
    );
  }

  return(
    <div style={{paddingBottom:90}}>
      <div style={{padding:"14px 14px 10px",background:C.bg,position:"sticky",top:58,zIndex:9,borderBottom:"1px solid "+C.borderAccent}}>
        <SecHead label="WILDCARD PICKS" sub="Pick 8 third-place teams that advance. +2 pts each correct."/>
        {!hasActual&&(
          <span style={{background:remaining===0?C.green:C.accent,color:"#0a0e1a",fontFamily:"'Bebas Neue',sans-serif",fontSize:12,padding:"3px 12px",borderRadius:20}}>
            {wildcardPicks.length}/8{remaining>0?" - pick "+remaining+" more":" - complete!"}
          </span>
        )}
        {!locked&&wildcardPicks.length===8&&(
          <div style={{marginTop:8}}>
            <button onClick={goToRank} style={{...btn(true),width:"100%"}}>NEXT: RANK YOUR WILDCARDS</button>
          </div>
        )}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:10,padding:12}}>
        {thirds.map(({group,team})=>{
          const sel=wildcardPicks.includes(team.code),disabled=!sel&&wildcardPicks.length>=8;
          const correct=hasActual&&actualWC.includes(team.code);
          return(
            <button key={team.code} onClick={()=>toggle(team.code)} disabled={disabled||locked}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:sel?"rgba(6,182,212,0.13)":C.card,border:"1.5px solid "+(sel?C.accent:C.border),borderRadius:10,cursor:disabled||locked?"not-allowed":"pointer",opacity:disabled?0.38:1,textAlign:"left",transition:"all .15s"}}>
              {!hasActual&&<div style={{width:20,height:20,borderRadius:"50%",border:"2px solid "+(sel?C.accent:C.muted),background:sel?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<span style={{color:"#0a0e1a",fontSize:10,fontWeight:700}}>OK</span>}</div>}
              {hasActual&&<span style={{fontSize:14,flexShrink:0,color:correct?C.green:C.red}}>{correct?"Y":"N"}</span>}
              <Flag code={team.code} size={28}/>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontSize:13,fontFamily:"'Barlow',sans-serif",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>{team.name}<FifaRank code={team.code}/></div>
                <div style={{color:C.muted,fontSize:11,fontFamily:"'Barlow',sans-serif"}}>3rd - Group {group}</div>
              </div>
              {hasActual&&sel&&<PtsTag pts={correct?2:0} pending={false}/>}
            </button>
          );
        })}
      </div>
      {!locked&&(
        <div style={{padding:"0 12px 12px",display:"flex",gap:10}}>
          <button onClick={onBack} style={{...btn(false),flex:1}}>BACK</button>
          <button onClick={goToRank} disabled={wildcardPicks.length!==8} style={{...btn(true,wildcardPicks.length!==8),flex:2}}>NEXT: RANK WILDCARDS</button>
        </div>
      )}
    </div>
  );
}

// ---- Match Pick Card ----
function MatchPickCard({num,team1,team2,winner,onPick,locked,actualWinner}){
  const Team=({team})=>{
    if(!team)return(<div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",opacity:.3}}><div style={{width:26,height:17,background:C.card2,borderRadius:2}}/><span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>TBD</span></div>);
    const isW=winner?.code===team.code,isL=winner&&!isW;
    return(
      <button onClick={()=>!locked&&onPick(team)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",background:isW?"rgba(6,182,212,0.15)":"transparent",border:isW?"1px solid "+C.accentDim:"1px solid transparent",borderRadius:8,cursor:locked?"default":"pointer",opacity:isL?.35:1,transition:"all .15s",textAlign:"left"}}>
        <Flag code={team.code} size={26}/>
        <span style={{flex:1,color:isW?C.accent:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:isW?700:500}}>{team.name}</span>
        <FifaRank code={team.code}/>
        {isW&&<span style={{color:C.accent,fontSize:13,marginLeft:4}}>OK</span>}
      </button>
    );
  };
  return(
    <div style={{background:C.card,borderRadius:10,padding:"6px",border:"1px solid "+C.border}}>
      <div style={{color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:9,letterSpacing:1,padding:"0 6px 5px"}}>MATCH {num}</div>
      <Team team={team1}/>
      <div style={{height:1,background:C.border,margin:"2px 6px"}}/>
      <Team team={team2}/>
      {actualWinner&&winner&&(
        <div style={{padding:"4px 12px"}}>
          {winner.code===actualWinner.code
            ?<span style={{color:C.green,fontSize:10,fontFamily:"'Barlow',sans-serif"}}>Correct +2 pts</span>
            :<span style={{color:C.red,fontSize:10,fontFamily:"'Barlow',sans-serif"}}>{actualWinner.name} won</span>}
        </div>
      )}
    </div>
  );
}

// ---- Knockout Page ----
function KnockoutPage({groupPicks,wildcardPicks,wildcardRanking,knockoutPicks,setKnockoutPicks,locked,onBack,results,championGoalDiff,setChampionGoalDiff,triggerSave,allBrackets}){
  const[activeRound,setActiveRound]=useState("r32");
  const r32Teams=buildR32(groupPicks,wildcardPicks,wildcardRanking);
  const koR=results?.knockout_results||{};

  const getTeams=(roundId,matchIdx)=>{
    try{
      if(roundId==="r32")return r32Teams[matchIdx]||[null,null];
      const prevId=ROUNDS[ROUNDS.findIndex(r=>r.id===roundId)-1]?.id;
      if(!prevId)return[null,null];
      return[knockoutPicks[prevId]?.[matchIdx*2]||null,knockoutPicks[prevId]?.[matchIdx*2+1]||null];
    }catch{return[null,null];}
  };

  const pickWinner=(roundId,matchIdx,team)=>{
    if(!team)return;
    setKnockoutPicks(prev=>{
      try{
        const next={...prev,[roundId]:{...(prev[roundId]||{}),[matchIdx]:team}};
        const rIdx=ROUNDS.findIndex(r=>r.id===roundId);
        for(let i=rIdx+1;i<ROUNDS.length;i++){
          const aff=Math.floor(matchIdx/Math.pow(2,i-rIdx));
          if(next[ROUNDS[i].id]?.[aff]){next[ROUNDS[i].id]={...next[ROUNDS[i].id]};delete next[ROUNDS[i].id][aff];}
        }
        return next;
      }catch{return prev;}
    });
  };

  const changeRound=(roundId)=>{setActiveRound(roundId);if(triggerSave)triggerSave();};
  const isUnlocked=roundId=>{const idx=ROUNDS.findIndex(r=>r.id===roundId);if(idx===0)return true;const prev=ROUNDS[idx-1];return Object.keys(knockoutPicks[prev.id]||{}).length>=prev.n;};
  const sfComplete=Object.keys(knockoutPicks.sf||{}).length>=2;
  const finalT1=knockoutPicks.sf?.[0]||null,finalT2=knockoutPicks.sf?.[1]||null;
  const sfLosers=[0,1].map(i=>{try{const[t1,t2]=getTeams("sf",i),w=knockoutPicks.sf?.[i];return[t1,t2].find(t=>t?.code!==w?.code)||null;}catch{return null;}});
  const currentRound=ROUNDS.find(r=>r.id===activeRound)||ROUNDS[0];
  const picked=Object.keys(knockoutPicks[activeRound]||{}).length;
  const chalkPct=useMemo(()=>calcChalkPct(knockoutPicks,r32Teams),[knockoutPicks,r32Teams]);

  const pointsNote=(
    <div style={{background:"rgba(6,182,212,.07)",border:"1px solid "+C.borderAccent,borderRadius:8,padding:"10px 14px",margin:"0 12px 12px",fontSize:11,color:C.muted,fontFamily:"'Barlow',sans-serif",lineHeight:1.65}}>
      <strong style={{color:C.accent,display:"block",marginBottom:5}}>How your bracket scoring works</strong>
      Your matchups come from <em>your own</em> group stage picks - not real life results. Points are earned if your chosen team wins their slot in your bracket. Each round is scored independently: being wrong in round 1 never costs you points in round 2. Example: if you picked Brazil to reach the Final, you earn Semifinal points the moment Brazil beats whoever you put them against in your SF - even if Brazil was already eliminated in real life.
    </div>
  );

  const tabBar=(
    <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:12}}>
      {[...ROUNDS,{id:"final",label:"Final",n:1}].map(r=>{
        const unlocked=r.id==="final"?sfComplete:isUnlocked(r.id);
        const complete=r.id==="final"?!!knockoutPicks.champion:Object.keys(knockoutPicks[r.id]||{}).length>=r.n;
        return(
          <button key={r.id} onClick={()=>unlocked&&changeRound(r.id)}
            style={{flexShrink:0,padding:"6px 14px",background:activeRound===r.id?C.accent:unlocked?C.card:C.card2,color:activeRound===r.id?"#0a0e1a":unlocked?C.text:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:.5,border:"1px solid "+(complete?C.green+"55":activeRound===r.id?C.accent:C.border),borderRadius:20,cursor:unlocked?"pointer":"not-allowed",whiteSpace:"nowrap"}}>
            {complete?"Done ":""}{r.label}
          </button>
        );
      })}
    </div>
  );

  return(
    <div style={{paddingBottom:90}}>
      <div style={{padding:"14px 14px 0",background:C.bg,position:"sticky",top:58,zIndex:9,borderBottom:"1px solid "+C.borderAccent}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:C.accent,letterSpacing:1.5}}>KNOCKOUT BRACKET</div>
          {chalkPct>0&&<div style={{background:"rgba(6,182,212,.1)",border:"1px solid "+C.borderAccent,borderRadius:8,padding:"3px 10px",display:"flex",gap:4,alignItems:"center"}}><span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10}}>Chalk</span><span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>{chalkPct}%</span></div>}
        </div>
        {tabBar}
        {activeRound!=="final"&&<p style={{color:C.muted,fontSize:12,fontFamily:"'Barlow',sans-serif",paddingBottom:10}}>{picked}/{currentRound.n} picked - tap a team to advance them</p>}
      </div>

      {pointsNote}

      {activeRound!=="final"&&(()=>{
        const roundComplete=picked>=currentRound.n;
        const currentRoundIdx=ROUNDS.findIndex(r=>r.id===activeRound);
        const nextRound=ROUNDS[currentRoundIdx+1]||{id:"final",label:"Final"};
        return(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10,padding:"0 12px 12px"}}>
              {Array.from({length:currentRound.n},(_,i)=>({idx:i,teams:getTeams(activeRound,i)})).map(({idx,teams:[t1,t2]})=>(
                <MatchPickCard key={idx} num={idx+1} team1={t1} team2={t2}
                  winner={knockoutPicks[activeRound]?.[idx]}
                  actualWinner={koR[activeRound]?.[idx]||null}
                  onPick={team=>pickWinner(activeRound,idx,team)} locked={locked}/>
              ))}
            </div>
            {!locked&&roundComplete&&(
              <div style={{padding:"0 12px 12px"}}>
                <button onClick={()=>changeRound(nextRound.id)} style={{...btn(true),width:"100%",fontSize:15}}>
                  NEXT: {nextRound.label.toUpperCase()} PICKS
                </button>
              </div>
            )}
          </>
        );
      })()}

      {activeRound==="final"&&(
        <div style={{padding:"0 12px 12px",display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:C.accent,letterSpacing:1}}>WORLD CUP FINAL</div>
              <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>+20 pts</span>
            </div>
            <MatchPickCard num="F" team1={finalT1} team2={finalT2}
              winner={knockoutPicks.champion||null} actualWinner={koR.champion||null}
              onPick={team=>setKnockoutPicks(prev=>({...prev,champion:team}))} locked={locked}/>
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,color:C.muted,letterSpacing:1}}>3RD PLACE</div>
              <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>+5 pts</span>
            </div>
            <MatchPickCard num="3" team1={sfLosers[0]} team2={sfLosers[1]}
              winner={knockoutPicks.thirdPlace||null} actualWinner={koR.thirdPlace||null}
              onPick={team=>setKnockoutPicks(prev=>({...prev,thirdPlace:team}))} locked={locked}/>
          </div>

          {knockoutPicks.champion&&(
            <Card accent style={{textAlign:"center",padding:20}}>
              <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:8}}>YOUR CHAMPION</div>
              <Flag code={knockoutPicks.champion.code} size={52}/>
              <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:2,margin:"8px 0 4px"}}>{knockoutPicks.champion.name}</div>
              {koR.champion&&<div style={{fontSize:13,fontFamily:"'Barlow',sans-serif",color:koR.champion.code===knockoutPicks.champion.code?C.green:C.red,marginBottom:12}}>{koR.champion.code===knockoutPicks.champion.code?"Champion! +20 pts":koR.champion.name+" won"}</div>}
              <div style={{background:C.card2,borderRadius:10,padding:14,textAlign:"left"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:C.accent,letterSpacing:1,marginBottom:4}}>TIEBREAKER</div>
                <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:10,lineHeight:1.5}}>
                  Predict <strong style={{color:C.text}}>{knockoutPicks.champion.name}'s</strong> total goal differential across all their matches (goals scored minus goals conceded). Used to break ties.
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
                    <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>Goal diff:</span>
                    <input type="number" value={championGoalDiff??""} onChange={e=>setChampionGoalDiff(e.target.value===""?null:+e.target.value)}
                      placeholder="+12" disabled={locked}
                      style={{width:70,padding:"8px",background:C.bg,border:"1px solid "+C.borderAccent,borderRadius:8,color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:18,textAlign:"center",outline:"none"}}/>
                  </div>
                  {results?.actual_champion_goal_diff!=null&&<div style={{textAlign:"right"}}><div style={{color:C.muted,fontSize:10}}>Actual</div><div style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:18}}>{results.actual_champion_goal_diff>0?"+":""}{results.actual_champion_goal_diff}</div></div>}
                </div>
                {championGoalDiff==null&&!locked&&<p style={{color:C.amber,fontFamily:"'Barlow',sans-serif",fontSize:11,marginTop:8}}>Enter your tiebreaker guess to complete your bracket</p>}
              </div>
            </Card>
          )}

          {/* Completion summary - shows after champion + tiebreaker filled */}
          {knockoutPicks.champion&&championGoalDiff!=null&&(
            <CompletionSummary knockoutPicks={knockoutPicks} groupPicks={{}} wildcardPicks={[]} r32Teams={r32Teams} chalkPct={chalkPct} allBrackets={allBrackets}/>
          )}
        </div>
      )}

      {!locked&&<div style={{padding:"0 12px"}}><button onClick={onBack} style={{...btn(false),width:"100%"}}>BACK TO WILDCARDS</button></div>}
    </div>
  );
}

// ---- Completion Summary ----
function CompletionSummary({knockoutPicks,chalkPct,allBrackets}){
  const ko=knockoutPicks;

  const chalkColor=chalkPct>=80?C.green:chalkPct>=60?C.amber:C.red;
  const chalkLabel=chalkPct>=80?"Very chalk - you trust the rankings":chalkPct>=60?"Balanced mix of chalk and upsets":chalkPct<40?"Bold upsets - high risk, high reward":"Leaning toward chalk";
  const poolSize=allBrackets.length;

  return(
    <div style={{background:"linear-gradient(135deg,rgba(6,182,212,.12),rgba(8,145,178,.06))",border:"1px solid "+C.borderAccent,borderRadius:14,padding:20,marginTop:4}}>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:48,marginBottom:8}}>🎉</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:C.accent,letterSpacing:2,marginBottom:4}}>BRACKET COMPLETE!</div>
        <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>You are locked and loaded for the 2026 World Cup</div>
      </div>

      {/* Chalk score */}
      <div style={{background:C.card2,borderRadius:10,padding:"14px",marginBottom:12,textAlign:"center"}}>
        <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,letterSpacing:1,marginBottom:6}}>YOUR CHALK SCORE</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,color:chalkColor,lineHeight:1,marginBottom:4}}>{chalkPct}%</div>
        <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,lineHeight:1.4,marginBottom:4}}>{chalkLabel}</div>
        <div style={{color:"#475569",fontFamily:"'Barlow',sans-serif",fontSize:10}}>% of your knockout picks where you chose the higher FIFA-ranked team to advance</div>
        <div style={{background:C.bg,borderRadius:6,height:8,marginTop:10}}>
          <div style={{width:chalkPct+"%",height:"100%",background:"linear-gradient(90deg,"+C.red+","+C.amber+","+C.green+")",borderRadius:6,transition:"width .5s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
          <span style={{color:C.muted,fontSize:9}}>Upset king</span>
          <span style={{color:C.muted,fontSize:9}}>Pure chalk</span>
        </div>
      </div>

      {/* Champion card */}
      {ko.champion&&(
        <div style={{background:C.card2,borderRadius:8,padding:12,marginBottom:12,textAlign:"center"}}>
          <div style={{color:C.muted,fontSize:10,fontFamily:"'Barlow',sans-serif",marginBottom:6}}>YOUR CHAMPION</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            <Flag code={ko.champion.code} size={32}/>
            <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:1}}>{ko.champion.name}</div>
          </div>
          {allBrackets.length>1&&(()=>{
            const pct=Math.round(allBrackets.filter(b=>b.knockout_picks?.champion?.code===ko.champion.code).length/allBrackets.length*100);
            return <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,marginTop:6}}>{pct}% of this pool picked them too</div>;
          })()}
        </div>
      )}

      <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,textAlign:"center",lineHeight:1.5}}>
        Head to <strong style={{color:C.accent}}>Standings</strong> to see where you rank in your pool{poolSize>1?" against "+poolSize+" entries":""}.
      </div>
    </div>
  );
}

// ---- Bracket Page (view + edit mode) ----
function BracketPage({step,setStep,groupPicks,setGroupPicks,wildcardPicks,setWildcardPicks,wildcardRanking,setWildcardRanking,knockoutPicks,setKnockoutPicks,locked,results,championGoalDiff,setChampionGoalDiff,triggerSave,bracketComplete,allBrackets,onDeleteBracket,onLeavePool}){
  const[viewMode,setViewMode]=useState(bracketComplete?"view":"build");
  const[viewTab,setViewTab]=useState("groups");

  // When bracket is complete and not locked, show view mode by default
  // but allow switching to edit
  const steps=[{id:"groups",label:"Groups"},{id:"wildcards",label:"Wildcards"},{id:"knockout",label:"Bracket"}];
  const stepIdx=steps.findIndex(s=>s.id===step);
  const r32Teams=buildR32(groupPicks,wildcardPicks,wildcardRanking);

  const handleEditGroups=()=>{
    if(locked)return;
    if(Object.keys(knockoutPicks.r32||{}).length>0){
      const confirmed=window.confirm("Changing group stage picks will reset your knockout bracket. Continue?");
      if(!confirmed)return; // bail out entirely - don't switch modes
      setKnockoutPicks({});
    }
    setViewMode("build");
    setStep("groups");
  };

  if(viewMode==="view"&&bracketComplete){
    const ko=knockoutPicks;
    const chalkPct=calcChalkPct(knockoutPicks,r32Teams);
    return(
      <div style={{paddingBottom:90}}>
        <div style={{padding:"14px 14px 10px",background:C.bg,position:"sticky",top:58,zIndex:9,borderBottom:"1px solid "+C.borderAccent}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:C.accent,letterSpacing:1.5}}>YOUR PICKS</div>
            <div style={{display:"flex",gap:6}}>
            {!locked&&(
              <button onClick={handleEditGroups} style={{background:"transparent",border:"1px solid "+C.accentDim,borderRadius:8,color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:12,padding:"5px 12px",cursor:"pointer",letterSpacing:.5}}>EDIT PICKS</button>
            )}
            {!locked&&(
              <button onClick={onDeleteBracket} style={{background:"transparent",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,color:C.red,fontFamily:"'Bebas Neue',sans-serif",fontSize:12,padding:"5px 12px",cursor:"pointer",letterSpacing:.5}}>RESET</button>
            )}
          </div>
          </div>
          <div style={{display:"flex",gap:6,overflowX:"auto"}}>
            {["groups","wildcards","bracket","champion"].map(t=>(
              <button key={t} onClick={()=>setViewTab(t)}
                style={{flexShrink:0,padding:"5px 12px",background:viewTab===t?C.accent:C.card,color:viewTab===t?"#0a0e1a":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:.5,border:"1px solid "+(viewTab===t?C.accent:C.border),borderRadius:20,cursor:"pointer"}}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {viewTab==="groups"&&(
          <div style={{padding:12}}>
            <div style={{color:"#475569",fontFamily:"'Barlow',sans-serif",fontSize:10,marginBottom:8,padding:"4px 8px",background:"rgba(255,255,255,.03)",borderRadius:6}}>
              Numbers in grey (e.g. #12) are FIFA world rankings at time of tournament
            </div>
            {Object.keys(WC_GROUPS).map(g=>(
              <div key={g} style={{background:C.card,borderRadius:10,padding:12,marginBottom:8,border:"1px solid "+C.border}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,color:C.accent,letterSpacing:1,marginBottom:8}}>GROUP {g}</div>
                {(groupPicks[g]||WC_GROUPS[g]).map((team,i)=>(
                  <div key={team.code} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:i<3?"0.5px solid "+C.border:"none"}}>
                    <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,width:22}}>{"1st,2nd,3rd,4th".split(",")[i]}</span>
                    <Flag code={team.code} size={18}/>
                    <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:12,flex:1}}>{team.name}</span>
                    <FifaRank code={team.code}/>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {viewTab==="wildcards"&&(
          <div style={{padding:12}}>
            <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:10}}>Your 8 wildcard picks (ranked {wildcardRanking.length>0?"by your order":"by FIFA ranking"}):</div>
            {(wildcardRanking.length>0?wildcardRanking:wildcardPicks.map(code=>({code,name:Object.values(WC_GROUPS).flat().find(t=>t.code===code)?.name||code}))).map((team,i)=>(
              <div key={team.code} style={{display:"flex",alignItems:"center",gap:10,padding:"10px",background:C.card,borderRadius:8,marginBottom:6,border:"1px solid "+C.border}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:"rgba(6,182,212,.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:11}}>{i+1}</span>
                </div>
                <Flag code={team.code} size={22}/>
                <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,flex:1}}>{team.name}</span>
                <FifaRank code={team.code}/>
              </div>
            ))}
          </div>
        )}

        {viewTab==="bracket"&&(
          <div style={{padding:12}}>
            <div style={{background:"rgba(6,182,212,.07)",border:"1px solid "+C.borderAccent,borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:11,color:C.muted,fontFamily:"'Barlow',sans-serif"}}>
              Points are awarded per round independently. Grayed-out teams have been eliminated in the actual tournament.
            </div>
            {ROUNDS.map(round=>{
              const picks=ko[round.id]||{};
              const actualRound=results?.knockout_results?.[round.id]||{};
              const actualWinnerCodes=new Set(Object.values(actualRound).map(t=>t?.code).filter(Boolean));
              const roundPlayed=Object.keys(actualRound).length>0;
              let roundPts=0;
              if(round)roundPts=Object.values(picks).filter((pick,i)=>pick&&actualRound[i]?.code===pick.code).length*(round.pts||0);
              if(!Object.keys(picks).length)return null;
              return(
                <div key={round.id} style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1}}>{round.fullLabel}</div>
                    {roundPlayed&&<span style={{color:C.green,fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>+{roundPts} pts</span>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:6}}>
                    {Object.entries(picks).map(([idx,team])=>team?(()=>{
                      const isCorrect=roundPlayed&&actualRound[+idx]?.code===team.code;
                      const isEliminated=roundPlayed&&!actualWinnerCodes.has(team.code);
                      return(
                        <div key={idx} style={{display:"flex",alignItems:"center",gap:6,background:C.card,borderRadius:7,padding:"7px 10px",border:"1px solid "+(isCorrect?C.green+"55":C.border),opacity:isEliminated?0.38:1}}>
                          <Flag code={team.code} size={18}/>
                          <span style={{color:isCorrect?C.green:isEliminated?C.muted:C.text,fontFamily:"'Barlow',sans-serif",fontSize:11,flex:1,textDecoration:isEliminated?"line-through":"none"}}>{team.name}</span>
                          <FifaRank code={team.code}/>
                          {roundPlayed&&<span style={{fontSize:10,color:isCorrect?C.green:C.red,flexShrink:0}}>{isCorrect?"+"+round.pts:"0"}</span>}
                        </div>
                      );
                    })():null)}
                  </div>
                </div>
              );
            })}
            {ko.thirdPlace&&(()=>{
              const actual=results?.knockout_results?.thirdPlace;
              const isCorrect=actual&&actual.code===ko.thirdPlace.code;
              const roundPlayed=!!actual;
              return(
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.muted,letterSpacing:1}}>3RD PLACE</div>
                    {roundPlayed&&<span style={{color:C.green,fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>+{isCorrect?5:0} pts</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,background:C.card,borderRadius:7,padding:"7px 10px",border:"1px solid "+(isCorrect?C.green+"55":C.border),maxWidth:220,opacity:roundPlayed&&!isCorrect?0.5:1}}>
                    <Flag code={ko.thirdPlace.code} size={18}/>
                    <span style={{color:isCorrect?C.green:C.text,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{ko.thirdPlace.name}</span>
                    {roundPlayed&&<span style={{fontSize:10,color:isCorrect?C.green:C.red,marginLeft:"auto"}}>{isCorrect?"+5":"0"}</span>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {viewTab==="champion"&&(
          <div style={{padding:12}}>
            {ko.champion&&(
              <Card accent style={{textAlign:"center",padding:20}}>
                <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:10}}>YOUR WORLD CUP CHAMPION</div>
                <Flag code={ko.champion.code} size={56}/>
                <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:2,margin:"10px 0 6px"}}>{ko.champion.name}</div>
                <FifaRank code={ko.champion.code}/>
                {championGoalDiff!=null&&(
                  <div style={{marginTop:12,padding:10,background:C.card2,borderRadius:8}}>
                    <div style={{color:C.muted,fontSize:11,fontFamily:"'Barlow',sans-serif"}}>Tiebreaker guess: <strong style={{color:C.accent}}>{championGoalDiff>0?"+":""}{championGoalDiff}</strong> goal differential</div>
                  </div>
                )}
                <div style={{marginTop:12}}>
                  <CompletionSummary knockoutPicks={ko} chalkPct={chalkPct} allBrackets={allBrackets}/>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }

  // Build mode
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",padding:"10px 14px 0"}}>
        {steps.map((s,i)=>(
          <span key={s.id} style={{display:"flex",alignItems:"center",flex:1}}>
            <span style={{display:"flex",alignItems:"center",gap:5,cursor:i<=stepIdx?"pointer":"default"}}
              onClick={()=>{if(i<stepIdx||(i===1&&wildcardPicks.length>0))setStep(s.id);}}>
              <span style={{width:22,height:22,borderRadius:"50%",background:i<=stepIdx?C.accent:C.card2,color:i<=stepIdx?"#0a0e1a":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i<stepIdx?"OK":i+1}</span>
              <span style={{color:i===stepIdx?C.accent:i<stepIdx?"rgba(6,182,212,.6)":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:.5}}>{s.label}</span>
            </span>
            {i<steps.length-1&&<div style={{flex:1,height:1,background:i<stepIdx?C.accent:C.border,margin:"0 6px"}}/>}
          </span>
        ))}
      </div>
      {bracketComplete&&(
        <div style={{padding:"8px 14px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={()=>setViewMode("view")} style={{background:"transparent",border:"none",color:C.accent,fontFamily:"'Barlow',sans-serif",fontSize:12,cursor:"pointer",textDecoration:"underline"}}>View all picks</button>
          {!locked&&(
            <button onClick={onLeavePool} style={{background:"transparent",border:"none",color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Leave pool</button>
          )}
        </div>
      )}
      {step==="groups"&&<GroupStagePage groupPicks={groupPicks} setGroupPicks={setGroupPicks} locked={locked} onNext={()=>setStep("wildcards")} results={results}/>}
      {step==="wildcards"&&<WildcardPage groupPicks={groupPicks} wildcardPicks={wildcardPicks} setWildcardPicks={setWildcardPicks} wildcardRanking={wildcardRanking} setWildcardRanking={setWildcardRanking} locked={locked} onNext={()=>setStep("knockout")} onBack={()=>setStep("groups")} results={results}/>}
      {step==="knockout"&&<KnockoutPage groupPicks={groupPicks} wildcardPicks={wildcardPicks} wildcardRanking={wildcardRanking} knockoutPicks={knockoutPicks} setKnockoutPicks={setKnockoutPicks} locked={locked} onBack={()=>setStep("wildcards")} results={results} championGoalDiff={championGoalDiff} setChampionGoalDiff={setChampionGoalDiff} triggerSave={triggerSave} allBrackets={allBrackets}/>}
    </div>
  );
}

// ---- Bracket Viewer (for viewing others) ----
function BracketViewer({bracket,results,onClose}){
  const[tab,setTab]=useState("groups");
  if(!bracket)return null;
  const gp=bracket.group_picks||{},ko=bracket.knockout_picks||{};
  const scoring=results?.scoring_config||DEFAULT_SCORING;
  const gResults=results?.group_results||{},koR=results?.knockout_results||{};

  const GroupsTab=()=>(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
      {Object.keys(WC_GROUPS).map(g=>{
        const picks=gp[g]||WC_GROUPS[g],actual=gResults[g]||[];
        const gPts=picks.reduce((acc,team,i)=>{const aIdx=actual.findIndex(t=>t.code===team.code);if(aIdx===i)return acc+scoring.exactPos;if(aIdx<=1)return acc+scoring.advancedWrong;return acc;},0);
        const perfect=actual.length>0&&picks.every((t,i)=>actual[i]?.code===t.code);
        return(
          <div key={g} style={{background:C.card2,borderRadius:8,padding:10,border:"1px solid "+C.borderAccent}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{background:C.accent,color:"#0a0e1a",fontFamily:"'Bebas Neue',sans-serif",fontSize:10,width:18,height:18,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{g}</div>
                <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:11}}>Group {g}</span>
              </div>
              {actual.length>0&&<span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13}}>+{gPts}{perfect?"+6":""}</span>}
            </div>
            {picks.map((team,i)=>{
              const aIdx=actual.findIndex(t=>t.code===team.code);
              const pts=actual.length===0?null:aIdx===i?scoring.exactPos:aIdx<=1?scoring.advancedWrong:0;
              return(
                <div key={team.code} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 0",borderBottom:i<3?"0.5px solid "+C.border:"none"}}>
                  <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:9,width:22}}>{"1st,2nd,3rd,4th".split(",")[i]}</span>
                  <Flag code={team.code} size={16}/>
                  <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:11,flex:1}}>{team.name}</span>
                  <FifaRank code={team.code}/>
                  <PtsTag pts={pts} pending={actual.length===0}/>
                </div>
              );
            })}
            {perfect&&<div style={{color:C.green,fontFamily:"'Barlow',sans-serif",fontSize:10,marginTop:5,textAlign:"center"}}>+6 perfect bonus!</div>}
          </div>
        );
      })}
    </div>
  );

  const KnockoutTab=()=>{
    let correct=0,pending=0;
    return(
      <div>
        {ROUNDS.map(round=>{
          const picks=ko[round.id]||{},actual=koR[round.id]||{};
          return(
            <div key={round.id} style={{marginBottom:12}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:C.accent,letterSpacing:1,marginBottom:6}}>{round.fullLabel}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:6}}>
                {Array.from({length:round.n},(_,i)=>{
                  const pick=picks[i],act=actual[i];if(!pick)return null;
                  const isCorrect=act&&pick.code===act.code,isPending=!act;
                  if(isPending)pending++;else if(isCorrect)correct++;
                  return(
                    <div key={i} style={{background:C.card2,borderRadius:7,padding:"7px 10px",display:"flex",alignItems:"center",gap:7,border:"0.5px solid "+C.border}}>
                      <Flag code={pick.code} size={18}/>
                      <span style={{color:isCorrect?C.accent:act?C.muted:C.text,fontFamily:"'Barlow',sans-serif",fontSize:11,flex:1,fontWeight:isCorrect?600:400}}>{pick.name}</span>
                      <FifaRank code={pick.code}/>
                      {act&&!isCorrect&&<><span style={{color:C.muted,fontSize:9}}>{">"}</span><Flag code={act.code} size={14}/></>}
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
            <div key={l} style={{background:C.card2,borderRadius:8,padding:10,textAlign:"center"}}><div style={{color:c,fontSize:20,fontWeight:500}}>{v}</div><div style={{color:C.muted,fontSize:10,marginTop:2}}>{l}</div></div>
          ))}
        </div>
        <div style={{marginTop:12,background:"rgba(6,182,212,.07)",border:"1px solid "+C.borderAccent,borderRadius:8,padding:"8px 12px",fontSize:11,color:C.muted,fontFamily:"'Barlow',sans-serif"}}>
          Points are awarded for each correct advancement pick independently - even if earlier rounds in this bracket were wrong.
        </div>
      </div>
    );
  };

  const ChampionTab=()=>{
    const champ=ko.champion,actual=koR.champion,correct=actual&&champ&&actual.code===champ.code;
    const score=calculateScore(bracket,results,scoring);
    return(
      <div>
        {champ?(
          <Card accent style={{textAlign:"center",padding:20,marginBottom:12}}>
            <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:10}}>CHAMPION PICK</div>
            <Flag code={champ.code} size={52}/>
            <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:2,margin:"10px 0 6px"}}>{champ.name}</div>
            <FifaRank code={champ.code}/>
            {actual?<div style={{fontSize:14,color:correct?C.green:C.red,fontFamily:"'Barlow',sans-serif",marginTop:6}}>{correct?"Champion! +20 pts":actual.name+" won"}</div>:<div style={{color:C.muted,fontSize:12,marginTop:6}}>Tournament in progress</div>}
            {bracket.champion_goal_diff_pick!=null&&(
              <div style={{marginTop:10,padding:8,background:C.card2,borderRadius:8}}>
                <div style={{color:C.muted,fontSize:11,fontFamily:"'Barlow',sans-serif"}}>Tiebreaker: <strong style={{color:C.accent}}>{bracket.champion_goal_diff_pick>0?"+":""}{bracket.champion_goal_diff_pick}</strong> goal diff</div>
              </div>
            )}
          </Card>
        ):<div style={{color:C.muted,textAlign:"center",padding:20}}>No champion picked yet</div>}
        <Card style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,textAlign:"center"}}>
          <div><div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:26}}>{score.total}</div><div style={{color:C.muted,fontSize:11}}>current pts</div></div>
          <div><div style={{color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:26}}>---</div><div style={{color:C.muted,fontSize:11}}>projected</div></div>
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
          <button onClick={onClose} style={{background:"transparent",border:"1px solid "+C.border,borderRadius:8,color:C.muted,padding:"8px 16px",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",fontSize:13}}>CLOSE</button>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[["groups","Groups"],["knockout","Knockout"],["champion","Champion"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"8px",background:tab===id?C.accent:C.card,color:tab===id?"#0a0e1a":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:.5,border:"1px solid "+(tab===id?C.accent:C.border),borderRadius:8,cursor:"pointer"}}>{label}</button>
          ))}
        </div>
        {tab==="groups"&&<GroupsTab/>}
        {tab==="knockout"&&<KnockoutTab/>}
        {tab==="champion"&&<ChampionTab/>}
      </div>
    </div>
  );
}

// ---- H2H Modal ----
function HeadToHeadModal({myBracket,opponent,results,onClose}){
  const[tab,setTab]=useState("groups");
  if(!myBracket||!opponent)return null;
  const scoring=results?.scoring_config||DEFAULT_SCORING;
  const gResults=results?.group_results||{},koR=results?.knockout_results||{};
  const myScore=calculateScore(myBracket,results,scoring).total;
  const opScore=calculateScore(opponent,results,scoring).total;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:600,overflowY:"auto"}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:12,paddingBottom:80}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:C.accent,letterSpacing:1}}>HEAD TO HEAD</div>
          <button onClick={onClose} style={{background:"transparent",border:"1px solid "+C.border,borderRadius:8,color:C.muted,padding:"8px 16px",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",fontSize:13}}>CLOSE</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,marginBottom:14,alignItems:"center"}}>
          <div style={{background:C.card,borderRadius:10,padding:"12px",textAlign:"center",border:"1px solid "+(myScore>opScore?C.green+"44":C.borderAccent)}}>
            <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,marginBottom:4}}>{myBracket.bracket_name}</div>
            <div style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:28}}>{myScore}</div>
            <div style={{color:C.muted,fontSize:11}}>YOU</div>
          </div>
          <div style={{color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:18}}>VS</div>
          <div style={{background:C.card,borderRadius:10,padding:"12px",textAlign:"center",border:"1px solid "+(opScore>myScore?C.green+"44":C.borderAccent)}}>
            <div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,marginBottom:4}}>{opponent.bracket_name}</div>
            <div style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:28}}>{opScore}</div>
            <div style={{color:C.muted,fontSize:11}}>{opponent.display_name||"---"}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {[["groups","Groups"],["knockout","Knockout"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"8px",background:tab===id?C.accent:C.card,color:tab===id?"#0a0e1a":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:.5,border:"1px solid "+(tab===id?C.accent:C.border),borderRadius:8,cursor:"pointer"}}>{label}</button>
          ))}
        </div>
        {tab==="groups"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:8}}>
            {Object.keys(WC_GROUPS).map(g=>{
              const myPicks=myBracket.group_picks?.[g]||WC_GROUPS[g],opPicks=opponent.group_picks?.[g]||WC_GROUPS[g],actual=gResults[g]||[];
              return(
                <div key={g} style={{background:C.card2,borderRadius:8,padding:10,border:"0.5px solid "+C.border}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,color:C.accent,marginBottom:6,display:"flex",justifyContent:"space-between"}}><span>Group {g}</span><div style={{display:"flex",gap:12}}><span style={{color:C.muted,fontSize:10}}>YOU</span><span style={{color:C.muted,fontSize:10}}>{opponent.bracket_name?.split(" ")[0]||"THEM"}</span></div></div>
                  {[0,1,2,3].map(i=>{
                    const rL=["1st","2nd","3rd","4th"][i],myT=myPicks[i],opT=opPicks[i];
                    const myM=actual.length?actual[i]?.code===myT?.code:null,opM=actual.length?actual[i]?.code===opT?.code:null;
                    const same=myT?.code===opT?.code;
                    return(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 0",borderBottom:i<3?"0.5px solid "+C.border:"none"}}>
                        <span style={{color:C.muted,fontSize:9,width:20,flexShrink:0}}>{rL}</span>
                        <Flag code={myT?.code||""} size={14}/>
                        <span style={{color:myM===true?C.green:myM===false?C.red:C.text,fontSize:10,flex:1}}>{myT?.name||"?"}</span>
                        {!same&&<span style={{color:C.amber,fontSize:9,flexShrink:0}}>{"!="}</span>}
                        {same&&<span style={{color:C.muted,fontSize:9,flexShrink:0}}>{"=="}</span>}
                        <span style={{color:opM===true?C.green:opM===false?C.red:C.text,fontSize:10,flex:1,textAlign:"right"}}>{opT?.name||"?"}</span>
                        <Flag code={opT?.code||""} size={14}/>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
        {tab==="knockout"&&(
          <div>
            {ROUNDS.map(round=>{
              const myPicks=myBracket.knockout_picks?.[round.id]||{},opPicks=opponent.knockout_picks?.[round.id]||{},actual=koR[round.id]||{};
              const allIdx=[...new Set([...Object.keys(myPicks),...Object.keys(opPicks)])].sort((a,b)=>+a-+b);
              if(!allIdx.length)return null;
              return(
                <div key={round.id} style={{marginBottom:12}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:C.accent,letterSpacing:1,marginBottom:6}}>{round.fullLabel}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:6}}>
                    {allIdx.map(idx=>{
                      const myPick=myPicks[+idx],opPick=opPicks[+idx],act=actual[+idx],same=myPick?.code===opPick?.code;
                      return(
                        <div key={idx} style={{background:C.card2,borderRadius:7,padding:"8px 10px",border:"0.5px solid "+(same?C.border:C.amber+"44")}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            {myPick&&<><Flag code={myPick.code} size={16}/><span style={{color:act?.code===myPick.code?C.green:act?C.red:C.text,fontSize:11,flex:1}}>{myPick.name}</span></>}
                            {!same&&opPick&&<><span style={{color:C.amber,fontSize:10}}>{"!="}</span><span style={{color:act?.code===opPick.code?C.green:act?C.red:C.text,fontSize:11,flex:1,textAlign:"right"}}>{opPick.name}</span><Flag code={opPick.code} size={16}/></>}
                            {same&&<span style={{color:C.muted,fontSize:10,marginLeft:"auto"}}>same</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Dynamic Hero ----
function DynamicHero({matches,locked,currentPool,displayName}){
  const firstName=displayName?.split(" ")[0]||"there";
  const[timeLeft,setTimeLeft]=useState({});
  const[nextMatch,setNextMatch]=useState(null);
  const[liveMatch,setLiveMatch]=useState(null);
  useEffect(()=>{
    const live=matches.find(m=>["IN_PLAY","PAUSED","HALFTIME"].includes(m.status));
    setLiveMatch(live||null);
    const upcoming=matches.filter(m=>["SCHEDULED","TIMED"].includes(m.status)).sort((a,b)=>new Date(a.utcDate)-new Date(b.utcDate));
    setNextMatch(upcoming[0]||null);
  },[matches]);
  useEffect(()=>{
    const target=!locked?KICKOFF:nextMatch?new Date(nextMatch.utcDate):null;
    if(!target)return;
    const tick=()=>{const diff=target-new Date();if(diff<=0){setTimeLeft({expired:true});return;}setTimeLeft({days:Math.floor(diff/86400000),hrs:Math.floor((diff%86400000)/3600000),min:Math.floor((diff%3600000)/60000),sec:Math.floor((diff%60000)/1000)});};
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[locked,nextMatch]);
  const td=v=>String(v??0).padStart(2,"0");
  return(
    <div style={{textAlign:"center",padding:"22px 16px 18px",marginBottom:12,borderBottom:"1px solid "+C.borderAccent}}>
      <WCCLogo size={64}/>
      <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,letterSpacing:2,marginTop:10,marginBottom:4}}>WORLD CUP CHALLENGE - 2026</div>
      <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:22,fontWeight:600,marginBottom:2}}>Welcome back, {firstName}</div>
      <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:16}}>{currentPool?.name||"World Cup Challenge"}</div>
      {liveMatch?(
        <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",borderRadius:12,padding:"12px 16px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,justifyContent:"center"}}><span style={{width:7,height:7,borderRadius:"50%",background:C.red,display:"inline-block"}}/><span style={{color:C.red,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1}}>LIVE - {liveMatch.status==="HALFTIME"?"HT":liveMatch.minute+"'"}</span></div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,flexWrap:"wrap"}}>
            {NAME_TO_CODE[liveMatch.homeTeam?.name]&&<Flag code={NAME_TO_CODE[liveMatch.homeTeam?.name]} size={28}/>}
            <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:15,fontWeight:600}}>{liveMatch.homeTeam?.name}</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:24}}>{liveMatch.score?.fullTime?.home??0}</span><span style={{color:C.muted}}>:</span><span style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:24}}>{liveMatch.score?.fullTime?.away??0}</span></div>
            <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:15,fontWeight:600}}>{liveMatch.awayTeam?.name}</span>
            {NAME_TO_CODE[liveMatch.awayTeam?.name]&&<Flag code={NAME_TO_CODE[liveMatch.awayTeam?.name]} size={28}/>}
          </div>
        </div>
      ):locked&&nextMatch&&!timeLeft.expired?(
        <div style={{marginBottom:8}}>
          <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,marginBottom:6}}>NEXT MATCH</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            {NAME_TO_CODE[nextMatch.homeTeam?.name]&&<Flag code={NAME_TO_CODE[nextMatch.homeTeam?.name]} size={22}/>}
            <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13}}>{nextMatch.homeTeam?.name}</span>
            <span style={{color:C.muted,fontSize:12}}>vs</span>
            <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13}}>{nextMatch.awayTeam?.name}</span>
            {NAME_TO_CODE[nextMatch.awayTeam?.name]&&<Flag code={NAME_TO_CODE[nextMatch.awayTeam?.name]} size={22}/>}
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:6}}>
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
          <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{toET(nextMatch.utcDate)} ET</div>
        </div>
      ):!locked?(
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
          <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>Picks lock Jun 11 - Tournament Jun 11 to Jul 19</div>
        </>
      ):(
        <span style={{display:"inline-block",background:"rgba(239,68,68,.15)",color:C.red,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,padding:"5px 18px",borderRadius:20}}>TOURNAMENT LIVE</span>
      )}
    </div>
  );
}

// ---- Leaderboard ----
function LeaderboardPage({userId,displayName,bracketComplete,bracketName,setBracketName,saveName,allBrackets,results,locked,picksVisible,onViewBracket,onH2H,oddsMap,currentPool,matches,globalPercentile}){
  const[copied,setCopied]=useState(false);
  const[editingName,setEditingName]=useState(false);
  const[nameVal,setNameVal]=useState(bracketName);
  const scoring=results?.scoring_config||DEFAULT_SCORING;
  const tournamentStarted=results&&Object.keys(results.group_results||{}).length>0;
  const scored=useMemo(()=>allBrackets.map(b=>({...b,score:calculateScore(b,results,scoring).total,proj:calculateProjected(b,results,oddsMap,scoring),maxPts:calculateMaxPoints(b,results,scoring),teamsAlive:getTeamsAlive(b,results)})).sort((a,b)=>b.score-a.score),[allBrackets,results,oddsMap,scoring]);
  const myEntry=scored.find(b=>b.user_id===userId),myPos=myEntry?scored.indexOf(myEntry)+1:null;
  const shareMyBracket=()=>{navigator.clipboard.writeText(window.location.origin+"?viewbracket="+userId).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});};

  const commitName=()=>{if(nameVal.trim()){saveName(nameVal.trim());setEditingName(false);}};

  return(
    <div style={{padding:12,paddingBottom:90}}>
      <DynamicHero matches={matches} locked={locked} currentPool={currentPool} displayName={displayName}/>
      <Card accent style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:C.accent,letterSpacing:1}}>YOUR STANDING</div>
          <button onClick={shareMyBracket} style={{background:"transparent",border:"1px solid "+C.accentDim,borderRadius:8,color:copied?C.green:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,padding:"4px 10px",cursor:"pointer",letterSpacing:.5}}>{copied?"COPIED":"SHARE PICKS"}</button>
        </div>
        {/* Bracket name editor */}
        {!locked&&(
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 10px",background:C.card2,borderRadius:8}}>
            {editingName?(
              <>
                <input autoFocus value={nameVal} onChange={e=>setNameVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&commitName()} style={{...inp,marginBottom:0,flex:1,fontSize:13,padding:"6px 10px"}}/>
                <button onClick={commitName} style={{...btn(true),padding:"6px 14px",fontSize:13}}>SAVE</button>
                <button onClick={()=>{setEditingName(false);setNameVal(bracketName);}} style={{...btn(false),padding:"6px 10px",fontSize:13}}>CANCEL</button>
              </>
            ):(
              <>
                <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,flex:1,fontWeight:600}}>{bracketName}</span>
                <button onClick={()=>{setNameVal(bracketName);setEditingName(true);}} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:"'Barlow',sans-serif",fontSize:11,padding:"4px 6px"}}>
                  <IcoPencil s={12}/> Edit name
                </button>
              </>
            )}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:globalPercentile!=null?"1fr 1fr 1fr 1fr 1fr":"1fr 1fr 1fr 1fr",gap:8,marginBottom:10}}>
          <div style={{background:C.card2,borderRadius:8,padding:"10px 6px",textAlign:"center"}}><div style={{color:C.amber,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,lineHeight:1}}>{tournamentStarted?ordinal(myPos):"---"}</div><div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,marginTop:3}}>rank</div></div>
          <div style={{background:C.card2,borderRadius:8,padding:"10px 6px",textAlign:"center"}}><div style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,lineHeight:1}}>{tournamentStarted&&myEntry?myEntry.score:"---"}</div><div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,marginTop:3}}>pts</div></div>
          <div style={{background:C.card2,borderRadius:8,padding:"10px 6px",textAlign:"center"}}><div style={{color:C.amber,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,lineHeight:1}}>{tournamentStarted&&myEntry?myEntry.maxPts:"---"}</div><div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,marginTop:3}}>max</div></div>
          <div style={{background:C.card2,borderRadius:8,padding:"10px 6px",textAlign:"center"}}><div style={{color:C.green,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,lineHeight:1}}>{tournamentStarted&&myEntry?myEntry.proj:"---"}</div><div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,marginTop:3}}>proj</div></div>
          {globalPercentile!=null&&<div style={{background:C.card2,borderRadius:8,padding:"10px 6px",textAlign:"center"}}><div style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:22,lineHeight:1}}>{globalPercentile}%</div><div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,marginTop:3}}>global</div></div>}
        </div>
        {globalPercentile!=null&&tournamentStarted&&<div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,textAlign:"center",marginBottom:8}}>Top {globalPercentile}th percentile across all WCC pools</div>}
        <div style={{padding:"8px 12px",background:C.card2,borderRadius:8,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13}}>{bracketComplete?"OK":"!"}</span>
          <span style={{color:bracketComplete?C.text:C.amber,fontFamily:"'Barlow',sans-serif",fontSize:12,flex:1}}>{bracketComplete?bracketName+" - complete":"Your bracket is incomplete - tap Picks to finish"}</span>
        </div>
      </Card>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,color:C.accent,letterSpacing:1}}>STANDINGS</div>
          <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{allBrackets.length} entries - {MAX_POSSIBLE} pts max</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"26px 1fr 46px 50px 46px",gap:6,padding:"6px 10px",background:"rgba(6,182,212,.1)",borderRadius:7,marginBottom:4}}>
          {[["#",""],["BRACKET",""],["PTS","Current points"],["MAX","Points if all remaining picks correct"],["PROJ","Projected with odds favorites"]].map(([h,tip])=>(<span key={h} title={tip} style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,textAlign:h!=="BRACKET"?"right":"left",cursor:tip?"help":"default"}}>{h}</span>))}
        </div>
        {scored.length===0&&<div style={{padding:"20px",textAlign:"center",color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>No brackets yet - be the first!</div>}
        {scored.map((b,i)=>{
          const isMe=b.user_id===userId,canView=picksVisible&&!isMe;
          return(
            <div key={b.id} style={{padding:"10px",borderBottom:i<scored.length-1?"1px solid "+C.border:"none",background:isMe?"rgba(6,182,212,.06)":"transparent",borderRadius:6}}>
              <div style={{display:"grid",gridTemplateColumns:"26px 1fr 46px 50px 46px",gap:6,alignItems:"center"}}>
                <span style={{color:i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#cd7f32":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:15}}>{i+1}</span>
                <div onClick={()=>canView&&onViewBracket(b)} style={{cursor:canView?"pointer":"default"}}>
                  <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                    {b.bracket_name||"Unnamed"}
                    {isMe&&<span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:9,background:"rgba(6,182,212,.15)",padding:"1px 6px",borderRadius:10}}>YOU</span>}
                    {canView&&<span style={{color:C.muted,fontSize:10}}>{">"}</span>}
                  </div>
                  <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,display:"flex",alignItems:"center",gap:5}}>
                    <span>{b.display_name||"---"}</span>
                    {b.teamsAlive!=null&&<span style={{color:b.teamsAlive>4?C.green:b.teamsAlive>1?C.amber:C.red}}>- {b.teamsAlive} alive</span>}
                  </div>
                </div>
                <span style={{color:tournamentStarted?C.text:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:15,textAlign:"right"}}>{tournamentStarted?b.score:"---"}</span>
                <span style={{color:tournamentStarted?C.amber:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,textAlign:"right"}}>{tournamentStarted?b.maxPts:"---"}</span>
                <span style={{color:tournamentStarted?C.green:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,textAlign:"right"}}>{tournamentStarted?b.proj:"---"}</span>
              </div>
              {canView&&<div style={{marginTop:6,display:"flex",gap:6}}><button onClick={()=>onH2H(b)} style={{background:"transparent",border:"1px solid "+C.accentDim,borderRadius:6,color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,padding:"3px 10px",cursor:"pointer",letterSpacing:.5}}>H2H</button><button onClick={()=>onViewBracket(b)} style={{background:"transparent",border:"1px solid "+C.border,borderRadius:6,color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,padding:"3px 10px",cursor:"pointer",letterSpacing:.5}}>VIEW</button></div>}
            </div>
          );
        })}
        {!picksVisible&&<p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,textAlign:"center",marginTop:10,padding:"0 4px"}}>Picks are hidden until the first match kicks off on Jun 11</p>}
      </Card>
      <Card>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:10}}>SCORING GUIDE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 16px"}}>
          {[["Exact group rank","+3"],["Advanced (wrong rank)","+1"],["Perfect group","+6 bonus"],["Wildcard advance","+2"],["Round of 32","+2"],["Round of 16","+4"],["Quarterfinal","+9"],["Semifinal","+13"],["3rd place","+5"],["Champion","+20"],["Tiebreaker","Goal diff"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",gap:6}}>
              <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>{l}</span>
              <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,flexShrink:0}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:10,padding:8,background:"rgba(6,182,212,.07)",borderRadius:8}}><span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>Each knockout round is scored independently - you earn points even if earlier rounds in your bracket were wrong. Max ~{MAX_POSSIBLE} pts.</span></div>
      </Card>
    </div>
  );
}

// ---- Matches Page ----
function MatchesPage({matches,loading}){
  const[odds,setOdds]=useState([]);
  useEffect(()=>{fetch("/api/odds").then(r=>r.ok?r.json():null).then(d=>{if(d&&Array.isArray(d))setOdds(d);}).catch(()=>{});},[]);

  // Improved odds lookup - normalize team names
  const getOdds=(homeTeam,awayTeam)=>{
    const normHome=normName(homeTeam),normAway=normName(awayTeam);
    const m=odds.find(o=>{
      const oh=normName(o.home_team),oa=normName(o.away_team);
      return (oh.includes(normHome.split(" ")[0])||normHome.includes(oh.split(" ")[0]))&&
             (oa.includes(normAway.split(" ")[0])||normAway.includes(oa.split(" ")[0]));
    });
    if(!m)return null;
    const book=m.bookmakers?.[0]?.markets?.[0]?.outcomes;if(!book)return null;
    const home=book.find(o=>normName(o.name).includes(normHome.split(" ")[0])||normHome.includes(normName(o.name).split(" ")[0]));
    const away=book.find(o=>normName(o.name).includes(normAway.split(" ")[0])||normAway.includes(normName(o.name).split(" ")[0]));
    const draw=book.find(o=>o.name.toLowerCase()==="draw");
    return{home:home?.price,away:away?.price,draw:draw?.price};
  };
  const fmtOdds=v=>{if(!v)return null;return v>0?"+"+Math.round(v):String(Math.round(v));};

  const live=matches.filter(m=>["IN_PLAY","PAUSED","HALFTIME"].includes(m.status));
  const today=new Date().toDateString();
  const upcoming=matches.filter(m=>["SCHEDULED","TIMED"].includes(m.status));
  const todayUp=upcoming.filter(m=>new Date(m.utcDate).toDateString()===today);
  const futureUp=upcoming.filter(m=>new Date(m.utcDate).toDateString()!==today);
  const completed=[...matches.filter(m=>m.status==="FINISHED")].reverse();

  const MatchRow=({m,showScore})=>{
    const hCode=NAME_TO_CODE[m.homeTeam?.name]||"";
    const aCode=NAME_TO_CODE[m.awayTeam?.name]||"";
    const hRank=FIFA_RANKINGS[hCode],aRank=FIFA_RANKINGS[aCode];
    const isLive=["IN_PLAY","PAUSED","HALFTIME"].includes(m.status);
    const status=isLive?(m.status==="HALFTIME"?"HT":(m.minute||"")+"'"):"FT";
    const o=!showScore?getOdds(m.homeTeam?.name,m.awayTeam?.name):null;
    return(
      <div style={{padding:"12px 0",borderBottom:"1px solid "+C.border}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          {isLive&&<span style={{width:6,height:6,borderRadius:"50%",background:C.red,display:"inline-block",flexShrink:0}}/>}
          <span style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:isLive?C.red:C.muted}}>{showScore?status:toET(m.utcDate)}</span>
          <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:10,marginLeft:"auto",flexShrink:0}}>
            {getVenue(m)?("📍 "+getVenue(m)):m.group||""}
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {hCode&&<Flag code={hCode} size={22}/>}
          <div style={{display:"flex",alignItems:"center",gap:3,flex:1}}>
            <span style={{fontFamily:"'Barlow',sans-serif",fontSize:14,fontWeight:600,color:C.text}}>{m.homeTeam?.name||"TBD"}</span>
            {hRank&&<span style={{color:"#475569",fontSize:9,fontFamily:"'Barlow',sans-serif"}}>{"#"+hRank}</span>}
          </div>
          {showScore?(
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,minWidth:60,justifyContent:"center"}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:C.text,minWidth:18,textAlign:"center"}}>{m.score?.fullTime?.home??"-"}</span>
              <span style={{color:C.muted,fontSize:14}}>:</span>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:C.text,minWidth:18,textAlign:"center"}}>{m.score?.fullTime?.away??"-"}</span>
            </div>
          ):o?(
            <div style={{flexShrink:0,textAlign:"center",minWidth:110}}>
              <div style={{display:"flex",gap:3,justifyContent:"center",marginBottom:2}}>
                <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:8,width:34,textAlign:"center"}}>HOME</span>
                <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:8,width:34,textAlign:"center"}}>DRAW</span>
                <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:8,width:34,textAlign:"center"}}>AWAY</span>
              </div>
              <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,width:34,textAlign:"center",background:"rgba(6,182,212,.08)",borderRadius:4,padding:"2px 0"}}>{fmtOdds(o.home)||"---"}</span>
                <span style={{color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,width:34,textAlign:"center",background:"rgba(255,255,255,.04)",borderRadius:4,padding:"2px 0"}}>{o.draw?fmtOdds(o.draw):"---"}</span>
                <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,width:34,textAlign:"center",background:"rgba(6,182,212,.08)",borderRadius:4,padding:"2px 0"}}>{fmtOdds(o.away)||"---"}</span>
              </div>
            </div>
          ):(
            <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,flexShrink:0,minWidth:30,textAlign:"center"}}>vs</span>
          )}
          <div style={{display:"flex",alignItems:"center",gap:3,flex:1,justifyContent:"flex-end"}}>
            {aRank&&<span style={{color:"#475569",fontSize:9,fontFamily:"'Barlow',sans-serif"}}>{"#"+aRank}</span>}
            <span style={{fontFamily:"'Barlow',sans-serif",fontSize:14,fontWeight:600,color:C.text}}>{m.awayTeam?.name||"TBD"}</span>
          </div>
          {aCode&&<Flag code={aCode} size={22}/>}
        </div>
      </div>
    );
  };

  if(loading)return<div style={{padding:40,textAlign:"center",color:C.muted,fontFamily:"'Barlow',sans-serif"}}>Loading matches...</div>;
  return(
    <div style={{padding:12,paddingBottom:90}}>
      {live.length>0&&<Card accent style={{marginBottom:12,border:"1px solid rgba(239,68,68,.3)"}}><SecHead label={"LIVE NOW ("+live.length+")"}/>{live.map(m=><MatchRow key={m.id} m={m} showScore={true}/>)}</Card>}
      {todayUp.length>0&&<Card><SecHead label="TODAY" sub="Eastern time - American odds (negative = favorite)"/>{todayUp.map(m=><MatchRow key={m.id} m={m} showScore={false}/>)}</Card>}
      {futureUp.length>0&&<Card><SecHead label="UPCOMING" sub="Eastern time"/>{futureUp.slice(0,20).map(m=><MatchRow key={m.id} m={m} showScore={false}/>)}</Card>}
      {completed.length>0&&<Card><SecHead label="COMPLETED"/>{completed.slice(0,20).map(m=><MatchRow key={m.id} m={m} showScore={true}/>)}</Card>}
      {matches.length===0&&<div style={{textAlign:"center",padding:40}}><p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:14}}>World Cup kicks off June 11. Schedule loads closer to the tournament.</p></div>}
    </div>
  );
}

// ---- Insights Page ----
function InsightsPage({allBrackets,userId,results,picksVisible,matches}){
  const[tab,setTab]=useState("edge"),[ whatIfTeam,setWhatIfTeam]=useState(null);
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
  const whatIfScores=useMemo(()=>{
    if(!whatIfTeam)return null;
    const sim={...(results||{}),knockout_results:{...(results?.knockout_results||{}),champion:{code:whatIfTeam.code,name:whatIfTeam.name}}};
    return allBrackets.map(b=>({...b,score:calculateScore(b,sim,scoring).total,wouldWin:b.knockout_picks?.champion?.code===whatIfTeam.code})).sort((a,b)=>b.score-a.score);
  },[whatIfTeam,allBrackets,results,scoring]);

  if(!picksVisible)return(
    <div style={{padding:24,textAlign:"center",paddingBottom:90}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:C.accent,marginBottom:10,letterSpacing:1}}>INSIGHTS UNLOCK AT KICKOFF</div>
      <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:14,lineHeight:1.6,maxWidth:320,margin:"0 auto"}}>Pool stats and analysis become available when picks lock on June 11.</p>
    </div>
  );

  return(
    <div style={{padding:12,paddingBottom:90}}>
      <div style={{display:"flex",gap:4,marginBottom:14,overflowX:"auto"}}>
        {[["edge","Edge"],["whatif","What-If"],["pool","Picks"],["root","Root For"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"8px 12px",background:tab===id?C.accent:C.card,color:tab===id?"#0a0e1a":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,letterSpacing:.5,border:"1px solid "+(tab===id?C.accent:C.border),borderRadius:8,cursor:"pointer"}}>{label}</button>
        ))}
      </div>

      {tab==="edge"&&(
        <div>
          <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12,marginBottom:12,lineHeight:1.5}}>How today's knockout results would shift the standings.</p>
          {todayKnockout.length===0&&<Card><div style={{textAlign:"center",padding:20}}><p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>No knockout matches today. Check back during the knockout rounds.</p></div></Card>}
          {todayKnockout.map(m=>{
            const edges=computeMatchEdge(m,allBrackets,results,scoring);if(!edges)return null;
            const hCode=NAME_TO_CODE[m.homeTeam?.name]||"",aCode=NAME_TO_CODE[m.awayTeam?.name]||"";
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
                          <div key={b.user_id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 0",borderBottom:"1px solid "+C.border}}>
                            <span style={{color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,width:14}}>{b.newPos}</span>
                            <span style={{color:isMe?C.accent:C.text,fontFamily:"'Barlow',sans-serif",fontSize:10,flex:1,fontWeight:isMe?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(b.bracket_name||"---").split(" ")[0]}</span>
                            {b.posChange>0&&<span style={{color:C.green,fontSize:10,fontFamily:"'Bebas Neue',sans-serif",flexShrink:0}}>{"^"+b.posChange}</span>}
                            {b.posChange<0&&<span style={{color:C.red,fontSize:10,fontFamily:"'Bebas Neue',sans-serif",flexShrink:0}}>{"v"+Math.abs(b.posChange)}</span>}
                            {b.posChange===0&&<span style={{color:C.muted,fontSize:10,flexShrink:0}}>---</span>}
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
        <Card accent>
          <SecHead label="WHAT-IF SIMULATOR" sub="Pick any team to win - see how the standings would shift"/>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:C.muted,fontFamily:"'Barlow',sans-serif",marginBottom:8}}>SELECT A CHAMPION</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {ALL_TEAMS.slice(0,16).map(team=>(
                <button key={team.code} onClick={()=>setWhatIfTeam(whatIfTeam?.code===team.code?null:team)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",background:whatIfTeam?.code===team.code?"rgba(6,182,212,.2)":C.card2,border:"1px solid "+(whatIfTeam?.code===team.code?C.accent:C.border),borderRadius:8,cursor:"pointer"}}>
                  <Flag code={team.code} size={16}/><span style={{color:whatIfTeam?.code===team.code?C.accent:C.text,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{team.name}</span>
                </button>
              ))}
            </div>
          </div>
          {whatIfTeam&&whatIfScores&&(
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,color:C.accent,letterSpacing:1,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                <Flag code={whatIfTeam.code} size={18}/>IF {whatIfTeam.name.toUpperCase()} WIN
              </div>
              {whatIfScores.map((b,i)=>{const isMe=b.user_id===userId;return(
                <div key={b.user_id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid "+C.border,background:isMe?"rgba(6,182,212,.05)":"transparent"}}>
                  <span style={{color:i===0?"#f59e0b":i===1?"#94a3b8":i===2?"#cd7f32":C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,width:20}}>{i+1}</span>
                  <div style={{flex:1}}><div style={{color:isMe?C.accent:C.text,fontFamily:"'Barlow',sans-serif",fontSize:12,fontWeight:isMe?600:400}}>{b.bracket_name}</div>{b.wouldWin&&<span style={{color:C.green,fontFamily:"'Barlow',sans-serif",fontSize:10}}>picked them!</span>}</div>
                  <span style={{color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>{b.score}</span>
                </div>
              );})}
            </div>
          )}
        </Card>
      )}

      {tab==="pool"&&(
        <div>
          <Card accent>
            <SecHead label={"CHAMPION PICKS - "+n+" entries"}/>
            {champDist.length===0&&<p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>No data yet.</p>}
            {champDist.map(({team,pct,count})=>(
              <div key={team.code} style={{marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <Flag code={team.code} size={22}/><span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,flex:1}}>{team.name}</span>
                  <FifaRank code={team.code}/>
                  <span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>{pct}%</span>
                  <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{count}/{n}</span>
                </div>
                <div style={{background:C.card2,borderRadius:4,height:6}}><div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,"+C.accent+",#0891b2)",borderRadius:4}}/></div>
              </div>
            ))}
          </Card>
          <Card>
            <SecHead label="GROUP CONSENSUS" sub="Most popular 1st-place picks"/>
            {groupConsensus.map(({group,team,pct})=>team&&(
              <div key={group} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid "+C.border}}>
                <div style={{background:C.accent,color:"#0a0e1a",fontFamily:"'Bebas Neue',sans-serif",fontSize:11,width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{group}</div>
                <Flag code={team.code} size={20}/>
                <span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,flex:1}}>{team.name}</span>
                <FifaRank code={team.code}/>
                <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>{pct}% picked 1st</span>
              </div>
            ))}
          </Card>
          {contrarian.length>0&&(
            <Card><SecHead label="CONTRARIAN PICKS" sub="Champion picks by 25% or fewer of the pool"/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
                {contrarian.map(({team,pct,count})=>(
                  <div key={team.code} style={{background:C.card2,borderRadius:8,padding:10,border:"1px solid "+C.accentDim}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><Flag code={team.code} size={20}/><span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:12,fontWeight:600}}>{team.name}</span></div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>{count}/{n} - {pct}%</span><FifaRank code={team.code}/></div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab==="root"&&(
        <Card accent>
          <SecHead label="WHO TO ROOT FOR" sub="Teams in your bracket that most others don't have - your differentiators"/>
          {!myBracket&&<p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>Submit your bracket first.</p>}
          {myBracket&&rootingFor.length===0&&<p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13}}>Your picks mirror the field - no unique differentiators right now.</p>}
          {myBracket&&rootingFor.map(({team,uniqueness})=>(
            <div key={team.code} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid "+C.border}}>
              <Flag code={team.code} size={32}/>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>{team.name}<FifaRank code={team.code}/></div>
                <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{uniqueness}% of the field doesn't have them going this deep</div>
              </div>
              <span style={{color:C.green,fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:.5}}>ROOT HARD</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ---- Pool Manager Panel ----
function PoolManagerPanel({pool,allBrackets,results,onClose,userId,onPoolDeleted}){
  const[sc,setSc]=useState(pool.scoring_config||{...DEFAULT_SCORING});
  const[saving,setSaving]=useState(false),[ msg,setMsg]=useState("");
  const PtsIn=({label,field})=>(<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid "+C.border}}><span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13}}>{label}</span><input type="number" value={sc[field]} onChange={e=>setSc(prev=>({...prev,[field]:+e.target.value}))} style={{width:52,padding:"4px 8px",background:C.card2,border:"1px solid "+C.borderAccent,borderRadius:6,color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,textAlign:"center",outline:"none"}}/></div>);
  const saveScoring=async()=>{setSaving(true);const{error}=await supabase.from("pools").update({scoring_config:sc}).eq("id",pool.id);setSaving(false);setMsg(error?"Error saving":"Scoring saved - retroactively applied!");setTimeout(()=>setMsg(""),3000);};
  const removeMember=async(uid)=>{if(uid===userId){setMsg("You cannot remove yourself.");setTimeout(()=>setMsg(""),2000);return;}await supabase.from("pool_members").delete().eq("pool_id",pool.id).eq("user_id",uid);await supabase.from("brackets").delete().eq("pool_id",pool.id).eq("user_id",uid);setMsg("Member removed.");setTimeout(()=>setMsg(""),2000);};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:600,overflowY:"auto"}}>
      <div style={{maxWidth:600,margin:"0 auto",padding:12,paddingBottom:80}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:C.accent,letterSpacing:1.5}}>POOL MANAGER</div><div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>{pool.name}</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>{msg&&<span style={{color:msg.includes("Error")?C.red:C.green,fontFamily:"'Barlow',sans-serif",fontSize:12}}>{msg}</span>}<button onClick={onClose} style={{background:"transparent",border:"1px solid "+C.border,borderRadius:8,color:C.muted,padding:"8px 14px",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",fontSize:13}}>CLOSE</button></div>
        </div>
        <Card accent>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:8}}>INVITE LINK</div>
          <div style={{color:C.accent,fontFamily:"'Barlow',sans-serif",fontSize:12,wordBreak:"break-all",marginBottom:6}}>{window.location.origin+"?join="+pool.code}</div>
          {pool.password&&<div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,marginBottom:8}}>Password: <strong style={{color:C.text}}>{pool.password}</strong></div>}
          <button onClick={()=>navigator.clipboard.writeText(window.location.origin+"?join="+pool.code).then(()=>setMsg("Copied!"))} style={{...btn(true),width:"100%",marginTop:10}}>COPY INVITE LINK</button>
        </Card>
        <Card>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1}}>MEMBERS</div>
            <button onClick={async()=>{
              if(!window.confirm("Delete this pool permanently? All brackets will be deleted. This cannot be undone."))return;
              await supabase.from("brackets").delete().eq("pool_id",pool.id);
              await supabase.from("pool_members").delete().eq("pool_id",pool.id);
              await supabase.from("pools").delete().eq("id",pool.id);
              onClose();onPoolDeleted&&onPoolDeleted();
            }} style={{background:"transparent",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,color:C.red,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,padding:"4px 10px",cursor:"pointer",letterSpacing:.5}}>DELETE POOL</button>
          </div>
          {allBrackets.map(b=>(<div key={b.user_id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid "+C.border}}><div style={{flex:1}}><div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600}}>{b.display_name||"---"}</div><div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>{b.bracket_name}</div></div>{b.user_id!==userId&&<button onClick={()=>removeMember(b.user_id)} style={{background:"transparent",border:"1px solid rgba(239,68,68,.3)",borderRadius:6,color:C.red,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,padding:"3px 8px",cursor:"pointer"}}>REMOVE</button>}</div>))}
        </Card>
        <Card>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:4}}>CUSTOM SCORING</div>
          <div style={{color:C.amber,fontFamily:"'Barlow',sans-serif",fontSize:11,marginBottom:10,padding:"6px 8px",background:"rgba(245,158,11,.08)",borderRadius:6}}>Pools with custom scoring are excluded from the global percentile ranking</div>
          <PtsIn label="Exact group rank" field="exactPos"/><PtsIn label="Advanced (wrong rank)" field="advancedWrong"/><PtsIn label="Perfect group bonus" field="perfectGroup"/><PtsIn label="Wildcard correct" field="wildcardCorrect"/><PtsIn label="Round of 32" field="r32"/><PtsIn label="Round of 16" field="r16"/><PtsIn label="Quarterfinal" field="qf"/><PtsIn label="Semifinal" field="sf"/><PtsIn label="3rd place" field="third"/><PtsIn label="Champion" field="champion"/>
          <button onClick={saveScoring} disabled={saving} style={{...btn(true,saving),width:"100%",marginTop:12}}>{saving?"SAVING...":"SAVE SCORING (RETROACTIVE)"}</button>
          {pool.scoring_config&&<button onClick={async()=>{setSaving(true);await supabase.from("pools").update({scoring_config:null}).eq("id",pool.id);setSaving(false);setMsg("Reset to global defaults.");setTimeout(()=>setMsg(""),2500);}} disabled={saving} style={{...btn(false,saving),width:"100%",marginTop:8,fontSize:13}}>RESET TO GLOBAL DEFAULTS</button>}
        </Card>
      </div>
    </div>
  );
}

// ---- Admin Manager ----
function ManagerPage({allBrackets,results,onResultsUpdate,pools,userId}){
  const[sc,setSc]=useState(results?.scoring_config||{...DEFAULT_SCORING});
  const[saving,setSaving]=useState(false),[ msg,setMsg]=useState(""),[ selUser,setSelUser]=useState(""),[ editB,setEditB]=useState(null),[ copied,setCopied]=useState(null);
  const save=async(key,value)=>{setSaving(true);const updates={};if(key==="lock")updates.tournament_locked=value;else if(key==="visible")updates.picks_visible=value;else if(key==="scoring")updates.scoring_config=sc;else if(key==="goalDiff")updates.actual_champion_goal_diff=value;const{error}=await supabase.from("actual_results").update(updates).eq("id",RESULTS_ROW);setSaving(false);if(!error){setMsg("Saved!");onResultsUpdate();setTimeout(()=>setMsg(""),2500);}else setMsg("Error: "+error.message);};
  const PtsIn=({label,field})=>(<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid "+C.border}}><span style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13}}>{label}</span><input type="number" value={sc[field]} onChange={e=>setSc(prev=>({...prev,[field]:+e.target.value}))} style={{width:52,padding:"4px 8px",background:C.card2,border:"1px solid "+C.borderAccent,borderRadius:6,color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,textAlign:"center",outline:"none"}}/></div>);
  const Row=({label,sub,children})=>(<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid "+C.border,gap:12}}><div><div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600}}>{label}</div>{sub&&<div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,marginTop:2}}>{sub}</div>}</div>{children}</div>);
  return(
    <div style={{padding:12,paddingBottom:90}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <IcoShield s={24} c={C.accent}/>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:C.accent,letterSpacing:1.5}}>ADMIN MANAGER</div>
        <span style={{background:"rgba(6,182,212,.15)",color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,padding:"2px 10px",borderRadius:12}}>ADMIN</span>
        {msg&&<span style={{color:msg.includes("Error")?C.red:C.green,fontFamily:"'Barlow',sans-serif",fontSize:12,marginLeft:"auto"}}>{msg}</span>}
      </div>
      <Card accent>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:4}}>TOURNAMENT SETTINGS</div>
        <Row label="Picks locked" sub="No edits once enabled"><Toggle val={results?.tournament_locked||false} onChange={v=>save("lock",v)}/></Row>
        <Row label="Show all picks publicly"><Toggle val={results?.picks_visible||false} onChange={v=>save("visible",v)}/></Row>
        <Row label="Actual champion goal differential" sub="Enter after tournament ends"><input type="number" defaultValue={results?.actual_champion_goal_diff??""} placeholder="e.g. 12" onBlur={e=>save("goalDiff",+e.target.value)} style={{width:60,padding:"4px 8px",background:C.card2,border:"1px solid "+C.borderAccent,borderRadius:6,color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:16,textAlign:"center",outline:"none"}}/></Row>
      </Card>
      <Card>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:10}}>ALL POOLS</div>
        {pools.map(p=>(
          <div key={p.id} style={{padding:"12px 0",borderBottom:"1px solid "+C.border}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600}}>{p.name}</div>
                <div style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11}}>Code: {p.code} - {p.password?"Password":"Link only"} - {p.scoring_config?"Custom":"Default"} scoring</div>
              </div>
              <button onClick={()=>{navigator.clipboard.writeText(window.location.origin+"?join="+p.code).then(()=>{setCopied(p.code);setTimeout(()=>setCopied(null),2000);});}} style={{background:"transparent",border:"1px solid "+C.accentDim,borderRadius:8,color:copied===p.code?C.green:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,padding:"5px 10px",cursor:"pointer",flexShrink:0}}>{copied===p.code?"COPIED":"COPY"}</button>
              <button onClick={async()=>{
              if(!window.confirm("Delete pool "+p.name+"? All brackets will be deleted."))return;
              await supabase.from("brackets").delete().eq("pool_id",p.id);
              await supabase.from("pool_members").delete().eq("pool_id",p.id);
              await supabase.from("pools").delete().eq("id",p.id);
              onResultsUpdate();setMsg("Pool deleted.");
            }} style={{background:"transparent",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,color:C.red,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,padding:"5px 10px",cursor:"pointer",flexShrink:0}}>DELETE</button>
            </div>
            {/* Show members for this pool */}
            {allBrackets.filter(b=>b.pool_id===p.id).map(b=>(
              <div key={b.user_id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0 4px 12px",borderTop:"0.5px solid "+C.border}}>
                <span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,flex:1}}>{b.display_name||b.bracket_name}</span>
                <button onClick={async()=>{await supabase.from("pool_members").delete().eq("pool_id",p.id).eq("user_id",b.user_id);await supabase.from("brackets").delete().eq("pool_id",p.id).eq("user_id",b.user_id);onResultsUpdate();setMsg("Member removed.");}} style={{background:"transparent",border:"1px solid rgba(239,68,68,.25)",borderRadius:5,color:C.red,fontFamily:"'Bebas Neue',sans-serif",fontSize:9,padding:"2px 6px",cursor:"pointer"}}>REMOVE</button>
              </div>
            ))}
          </div>
        ))}
      </Card>
      <Card>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:4}}>GLOBAL SCORING</div>
        <PtsIn label="Exact group rank" field="exactPos"/><PtsIn label="Advanced (wrong rank)" field="advancedWrong"/><PtsIn label="Perfect group bonus" field="perfectGroup"/><PtsIn label="Wildcard correct" field="wildcardCorrect"/><PtsIn label="Round of 32" field="r32"/><PtsIn label="Round of 16" field="r16"/><PtsIn label="Quarterfinal" field="qf"/><PtsIn label="Semifinal" field="sf"/><PtsIn label="3rd place" field="third"/><PtsIn label="Champion" field="champion"/>
        <button onClick={()=>save("scoring")} disabled={saving} style={{...btn(true,saving),width:"100%",marginTop:12}}>{saving?"SAVING...":"SAVE GLOBAL SCORING"}</button>
      </Card>
      <Card>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:C.accent,letterSpacing:1,marginBottom:10}}>EDIT A USER'S BRACKET</div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <select value={selUser} onChange={e=>setSelUser(e.target.value)} style={{flex:1,padding:"10px 12px",background:C.card2,border:"1px solid "+C.border,borderRadius:8,color:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,outline:"none"}}><option value="">Select participant...</option>{allBrackets.map(b=><option key={b.user_id} value={b.user_id}>{b.display_name||b.bracket_name}</option>)}</select>
          <button onClick={()=>setEditB(allBrackets.find(b=>b.user_id===selUser)||null)} disabled={!selUser} style={{...btn(false,!selUser),padding:"10px 16px",fontSize:14}}>LOAD</button>
        </div>
        {editB&&(<div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><span style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:12}}>Bracket name:</span><input value={editB.bracket_name||""} onChange={e=>setEditB(prev=>({...prev,bracket_name:e.target.value}))} style={{...inp,marginBottom:0,flex:1}}/></div><button onClick={async()=>{setSaving(true);await supabase.from("brackets").update({bracket_name:editB.bracket_name}).eq("user_id",editB.user_id);setSaving(false);setMsg("Saved!");setTimeout(()=>setMsg(""),2500);}} disabled={saving} style={{...btn(true,saving),width:"100%"}}>{saving?"SAVING...":"SAVE"}</button></div>)}
      </Card>
    </div>
  );
}

// ---- Root App ----
export default function App(){
  const[user,setUser]=useState(null),[ loading,setLoading]=useState(true);
  const[pools,setPools]=useState([]),[ poolsLoading,setPoolsLoading]=useState(true);
  const[activePool,setActivePool]=useState(null);
  const[showPoolSwitcher,setShowPoolSwitcher]=useState(false),[ showCreatePool,setShowCreatePool]=useState(false),[ showPoolManager,setShowPoolManager]=useState(false);
  const[showBracketNameModal,setShowBracketNameModal]=useState(false);
  const[joinCode,setJoinCode]=useState(null),[ joinPool,setJoinPool]=useState(null),[ joinStatus,setJoinStatus]=useState("idle"),[ pendingPoolId,setPendingPoolId]=useState(null);
  const[viewSharedUserId,setViewSharedUserId]=useState(null);
  const[showPasswordReset,setShowPasswordReset]=useState(false);
  const[newPassword,setNewPassword]=useState(""),[ resetMsg,setResetMsg]=useState("");
  const[bracketId,setBracketId]=useState(null),[ bracketName,setBracketName]=useState("My WCC Bracket"),[ editingNameHeader,setEditingNameHeader]=useState(false);
  const[groupPicks,setGroupPicksState]=useState(initGroupPicks);
  const[wildcardPicks,setWildcardPicksState]=useState([]);
  const[wildcardRanking,setWildcardRankingState]=useState([]);
  const[knockoutPicks,setKnockoutPicksState]=useState({});
  const[championGoalDiff,setChampionGoalDiffState]=useState(null);
  const[saveStatus,setSaveStatus]=useState("idle");
  const[allBrackets,setAllBrackets]=useState([]);
  const[results,setResults]=useState(null);
  const[oddsMap,setOddsMap]=useState({});
  const[matches,setMatches]=useState([]),[ matchesLoading,setMatchesLoading]=useState(true);
  const[globalPercentile,setGlobalPercentile]=useState(null);
  const[page,setPage]=useState("home"),[ bracketStep,setBracketStep]=useState("groups");
  const[viewingBracket,setViewingBracket]=useState(null),[ h2hBracket,setH2hBracket]=useState(null);
  const saveTimer=useRef(null),prevMatchRef=useRef(null);

  const isAdmin=user?.email===ADMIN_EMAIL;
  const locked=results?.tournament_locked||false;
  const picksVisible=results?.picks_visible||false;
  const currentPool=pools.find(p=>p.id===activePool);
  const bracketComplete=!!knockoutPicks.champion&&championGoalDiff!=null;
  const displayName=user?.user_metadata?.full_name||user?.user_metadata?.display_name||user?.email||"";
  const isPoolManager=currentPool?.my_role==="manager"||isAdmin;
  const today=new Date().toDateString();
  const hasMatchesToday=matches.some(m=>new Date(m.utcDate).toDateString()===today);
  const hasLiveMatch=matches.some(m=>["IN_PLAY","PAUSED","HALFTIME"].includes(m.status));

  useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>{setUser(session?.user??null);setLoading(false);});const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>setUser(session?.user??null));return()=>subscription.unsubscribe();},[]);

  useEffect(()=>{const params=new URLSearchParams(window.location.search);const code=params.get("join"),view=params.get("viewbracket"),reset=params.get("reset");if(code)setJoinCode(code.toUpperCase());if(view)setViewSharedUserId(view);if(reset==="1")setShowPasswordReset(true);},[]);

  useEffect(()=>{if(!joinCode)return;supabase.from("pools").select("*").eq("code",joinCode).single().then(({data})=>{if(data)setJoinPool(data);});},[joinCode]);

  useEffect(()=>{
    if(!user||!joinPool||joinStatus!=="idle")return;
    const doJoin=async()=>{
      setJoinStatus("joining");
      if(new Date()>new Date(joinPool.invite_expires_at)){setJoinStatus("expired");return;}
      const{data:existing}=await supabase.from("pool_members").select("*").eq("pool_id",joinPool.id).eq("user_id",user.id).single();
      if(existing){setJoinStatus("done");setActivePool(joinPool.id);window.history.replaceState({},"","/");return;}
      const{error}=await supabase.from("pool_members").insert({pool_id:joinPool.id,user_id:user.id});
      if(!error){
        await supabase.from("brackets").upsert({user_id:user.id,pool_id:joinPool.id,display_name:displayName},{onConflict:"user_id,pool_id"});
        setJoinStatus("naming");
        setPendingPoolId(joinPool.id);
        setShowBracketNameModal(true);
        window.history.replaceState({},"","/");
      }else setJoinStatus("error");
    };
    doJoin();
  },[user,joinPool,joinStatus,displayName]);

  const handleBracketNameConfirm=async(name)=>{
    setBracketName(name);
    await supabase.from("brackets").update({bracket_name:name}).eq("user_id",user.id).eq("pool_id",pendingPoolId||activePool);
    setShowBracketNameModal(false);
    if(pendingPoolId){setActivePool(pendingPoolId);setPendingPoolId(null);setJoinStatus("done");}
  };

  const loadPools=useCallback(async()=>{
    if(!user)return;
    setPoolsLoading(true);
    const{data}=await supabase.from("pool_members").select("pool_id, role, pools(*)").eq("user_id",user.id);
    if(data?.length){const ps=data.map(d=>({...d.pools,my_role:d.role})).filter(Boolean);setPools(ps);if(ps.length===1&&!activePool)setActivePool(ps[0].id);}
    else setPools([]);
    setPoolsLoading(false);
  },[user]); // eslint-disable-line
  useEffect(()=>{if(user)loadPools();},[user]); // eslint-disable-line

  useEffect(()=>{
    if(!user||!activePool)return;
    const load=async()=>{
      const{data,error}=await supabase.from("brackets").select("*").eq("user_id",user.id).eq("pool_id",activePool).single();
      if(data){
        setBracketId(data.id);setBracketName(data.bracket_name||"My WCC Bracket");
        if(data.group_picks)setGroupPicksState(data.group_picks);
        if(data.wildcard_picks)setWildcardPicksState(data.wildcard_picks);
        if(data.wildcard_ranking)setWildcardRankingState(data.wildcard_ranking);
        if(data.knockout_picks)setKnockoutPicksState(data.knockout_picks);
        if(data.champion_goal_diff_pick!=null)setChampionGoalDiffState(data.champion_goal_diff_pick);
      }else if(error?.code==="PGRST116"){
        const{data:created}=await supabase.from("brackets").insert({user_id:user.id,display_name:displayName,pool_id:activePool}).select().single();
        if(created){setBracketId(created.id);setShowBracketNameModal(true);}
      }
    };
    load();
  },[user,activePool,displayName]);

  useEffect(()=>{
    if(!user||!activePool)return;
    const loadAll=async()=>{const{data}=await supabase.from("brackets").select("id,user_id,display_name,bracket_name,group_picks,wildcard_picks,wildcard_ranking,knockout_picks,champion_goal_diff_pick,locked").eq("pool_id",activePool);if(data)setAllBrackets(data);};
    loadAll();
    const ch=supabase.channel("brackets-"+activePool).on("postgres_changes",{event:"*",schema:"public",table:"brackets"},loadAll).subscribe();
    return()=>supabase.removeChannel(ch);
  },[user,activePool]);

  const loadResults=useCallback(async()=>{const{data}=await supabase.from("actual_results").select("*").eq("id",RESULTS_ROW).single();if(data)setResults(data);},[]);
  useEffect(()=>{if(user)loadResults();},[user,loadResults]);

  const fetchMatches=useCallback(async()=>{
    try{const r=await fetch("/api/matches");if(r.ok){const d=await r.json();const nd=JSON.stringify(d.matches||[]);if(nd!==prevMatchRef.current){prevMatchRef.current=nd;setMatches(d.matches||[]);}}}catch(e){}finally{setMatchesLoading(false);}
  },[]);
  useEffect(()=>{fetchMatches();const id=setInterval(fetchMatches,60000);return()=>clearInterval(id);},[fetchMatches]);

  useEffect(()=>{fetch("/api/odds").then(r=>r.ok?r.json():null).then(data=>{if(!data||!Array.isArray(data))return;const map={};data.forEach(match=>{const book=match.bookmakers?.[0]?.markets?.[0]?.outcomes;if(!book)return;const sorted=[...book].sort((a,b)=>a.price-b.price);const fav=sorted[0],code=NAME_TO_CODE[fav?.name];if(code)map[code]=true;});setOddsMap(map);}).catch(()=>{});},[]);

  useEffect(()=>{
    if(!user||!results||!Object.keys(results.group_results||{}).length)return;
    if(currentPool?.scoring_config)return;
    const calc=async()=>{const{data:allData}=await supabase.from("cross_pool_scores").select("user_id,group_picks,wildcard_picks,knockout_picks");if(!allData||allData.length<10)return;const myScore=calculateScore({group_picks:groupPicks,wildcard_picks:wildcardPicks,knockout_picks:knockoutPicks},results,DEFAULT_SCORING).total;const allScores=allData.map(b=>calculateScore(b,results,DEFAULT_SCORING).total).sort((a,b)=>a-b);const below=allScores.filter(s=>s<myScore).length;setGlobalPercentile(Math.round((below/allScores.length)*100));};
    calc();
  },[user,results,currentPool,groupPicks,wildcardPicks,knockoutPicks]);

  useEffect(()=>{if(!viewSharedUserId||!allBrackets.length)return;const b=allBrackets.find(x=>x.user_id===viewSharedUserId);if(b)setViewingBracket(b);},[viewSharedUserId,allBrackets]);

  const triggerSave=useCallback((overrides={})=>{
    if(locked||!user||!bracketId)return;
    setSaveStatus("saving");clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      const payload={bracket_name:overrides.bracketName??bracketName,group_picks:overrides.groupPicks??groupPicks,wildcard_picks:overrides.wildcardPicks??wildcardPicks,wildcard_ranking:overrides.wildcardRanking??wildcardRanking,knockout_picks:overrides.knockoutPicks??knockoutPicks,champion_goal_diff_pick:overrides.championGoalDiff??championGoalDiff};
      const{error}=await supabase.from("brackets").update(payload).eq("user_id",user.id).eq("pool_id",activePool);
      setSaveStatus(error?"error":"saved");setTimeout(()=>setSaveStatus("idle"),2500);
    },1500);
  },[locked,user,bracketId,bracketName,groupPicks,wildcardPicks,wildcardRanking,knockoutPicks,championGoalDiff,activePool]);

  const setGP=useCallback(v=>{setGroupPicksState(v);triggerSave({groupPicks:typeof v==="function"?v(groupPicks):v});},[triggerSave,groupPicks]);
  const setWP=useCallback(v=>{setWildcardPicksState(v);triggerSave({wildcardPicks:v});},[triggerSave]);
  const setWR=useCallback(v=>{setWildcardRankingState(v);triggerSave({wildcardRanking:v});},[triggerSave]);
  const setKP=useCallback(v=>{setKnockoutPicksState(v);triggerSave({knockoutPicks:typeof v==="function"?v(knockoutPicks):v});},[triggerSave,knockoutPicks]);
  const setCGD=useCallback(v=>{setChampionGoalDiffState(v);triggerSave({championGoalDiff:v});},[triggerSave]);
  const saveName=useCallback(name=>{setBracketName(name);triggerSave({bracketName:name});},[triggerSave]);
  const signOut=()=>supabase.auth.signOut();
  const myBracket=allBrackets.find(b=>b.user_id===user?.id);

  const navItems=[
    {id:"home",label:"Standings",Icon:IcoTrophy},
    {id:"bracket",label:"Picks",Icon:IcoBall},
    {id:"matches",label:"Matches",Icon:IcoLive},
    {id:"insights",label:"Insights",Icon:IcoChart},
    ...(isAdmin?[{id:"manager",label:"Manager",Icon:IcoShield}]:[]),
  ];

  if(loading)return<Spinner/>;
  if(!user)return<LoginScreen joinPool={joinPool}/>;

  if(!activePool)return(
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap');*,*::before,*::after{box-sizing:border-box;}body{background:#0a0e1a;margin:0;}button{outline:none;}input{outline:none;}"}</style>
      <div style={{position:"fixed",top:12,right:16,zIndex:200}}><button onClick={signOut} style={{background:"transparent",border:"1px solid "+C.border,borderRadius:8,color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,padding:"5px 10px",cursor:"pointer"}}>SIGN OUT</button></div>
      <PoolLanding userId={user.id} pools={pools} poolsLoading={poolsLoading} onSelectPool={id=>{setActivePool(id);}} onCreatePool={()=>setShowCreatePool(true)}/>
      {showCreatePool&&<CreatePoolModal userId={user.id} displayName={displayName} onCreated={id=>{setShowCreatePool(false);loadPools();setActivePool(id);setShowBracketNameModal(true);}} onClose={()=>setShowCreatePool(false)}/>}
      {showBracketNameModal&&<BracketNameModal defaultName={displayName.split(" ")[0]+"'s Picks"} onConfirm={handleBracketNameConfirm}/>}
    </>
  );

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}body{background:#0a0e1a;margin:0;}
        button{outline:none;}input{outline:none;}select{-webkit-appearance:none;appearance:none;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#0a0e1a;}
        ::-webkit-scrollbar-thumb{background:#06b6d4;border-radius:2px;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes livepulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}
      `}</style>
      <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Barlow',sans-serif",maxWidth:900,margin:"0 auto",position:"relative",paddingTop:60}}>

        {/* Header */}
        <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:900,zIndex:200,background:C.navBg,borderBottom:"1px solid "+C.borderAccent,display:"flex",alignItems:"center",gap:10,padding:"8px 14px",height:60}}>
          <WCCLogo size={36}/>
          <div style={{flex:1,overflow:"hidden",minWidth:0}}>
            <button onClick={()=>setShowPoolSwitcher(v=>!v)} style={{background:"transparent",border:"none",padding:0,cursor:"pointer",textAlign:"left",width:"100%"}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,color:C.accent,letterSpacing:2,lineHeight:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>WORLD CUP CHALLENGE</div><span style={{color:C.accent,fontSize:12,flexShrink:0}}>v</span></div>
              <div style={{fontSize:10,color:C.muted,fontFamily:"'Barlow',sans-serif"}}>{currentPool?.name||"---"}{isPoolManager?" - Manager":""}</div>
            </button>
            {page==="bracket"&&saveStatus!=="idle"&&<SaveBadge status={saveStatus}/>}
            {page==="bracket"&&saveStatus==="idle"&&(
              editingNameHeader
                ?<input autoFocus value={bracketName} onChange={e=>setBracketName(e.target.value)} onBlur={()=>{setEditingNameHeader(false);saveName(bracketName);}} onKeyDown={e=>e.key==="Enter"&&(setEditingNameHeader(false),saveName(bracketName))} style={{background:"transparent",border:"none",borderBottom:"1px solid "+C.accent,color:C.accent,fontFamily:"'Barlow',sans-serif",fontSize:11,maxWidth:180}}/>
                :<button onClick={()=>!locked&&setEditingNameHeader(true)} style={{background:"transparent",border:"none",color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:11,cursor:locked?"default":"pointer",padding:0,display:"flex",alignItems:"center",gap:4}}>
                  {bracketName}{!locked&&<IcoPencil s={10} c={C.muted}/>}
                </button>
            )}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
            {isPoolManager&&<button onClick={()=>setShowPoolManager(true)} style={{background:"transparent",border:"1px solid "+C.accentDim,borderRadius:8,color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,padding:"4px 8px",cursor:"pointer",letterSpacing:.5}}>MANAGE</button>}
            {locked&&<span style={{background:"rgba(239,68,68,.15)",color:C.red,fontFamily:"'Bebas Neue',sans-serif",fontSize:10,padding:"3px 8px",borderRadius:16}}>LIVE</span>}
            <button onClick={signOut} style={{background:"transparent",border:"1px solid "+C.border,borderRadius:8,color:C.muted,fontFamily:"'Bebas Neue',sans-serif",fontSize:11,padding:"5px 10px",cursor:"pointer"}}>OUT</button>
          </div>
        </div>

        {/* Pool switcher */}
        {showPoolSwitcher&&(
          <div style={{position:"fixed",top:60,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:900,background:C.card2,borderBottom:"1px solid "+C.borderAccent,zIndex:190,padding:12}}>
            <div style={{fontSize:9,color:C.muted,letterSpacing:1,marginBottom:8}}>SWITCH POOL</div>
            {pools.map(p=>(<div key={p.id} onClick={()=>{setActivePool(p.id);setShowPoolSwitcher(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,cursor:"pointer",background:p.id===activePool?"rgba(6,182,212,.1)":"transparent",marginBottom:4}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:p.id===activePool?C.accent:C.muted,flexShrink:0}}/>
              <span style={{color:p.id===activePool?C.accent:C.text,fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:600,flex:1}}>{p.name}</span>
              {p.id===activePool&&<span style={{color:C.accent,fontFamily:"'Bebas Neue',sans-serif",fontSize:9,padding:"1px 6px",background:"rgba(6,182,212,.15)",borderRadius:8}}>ACTIVE</span>}
            </div>))}
            <div style={{height:.5,background:C.border,margin:"8px 0"}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setActivePool(null);setShowPoolSwitcher(false);}} style={{flex:1,padding:"8px",background:"transparent",border:"1px solid "+C.border,borderRadius:7,fontFamily:"'Barlow',sans-serif",fontSize:11,color:C.muted,cursor:"pointer",textAlign:"center"}}>All pools</button>
              <button onClick={()=>{setShowPoolSwitcher(false);setShowCreatePool(true);}} style={{flex:1,padding:"8px",background:"rgba(6,182,212,.1)",border:"1px solid "+C.accentDim,borderRadius:7,fontFamily:"'Barlow',sans-serif",fontSize:11,color:C.accent,cursor:"pointer",textAlign:"center"}}>+ New pool</button>
            </div>
          </div>
        )}

        {joinStatus==="joining"&&<div style={{background:"rgba(6,182,212,.15)",borderBottom:"1px solid "+C.borderAccent,padding:"10px 14px",textAlign:"center"}}><span style={{color:C.accent,fontFamily:"'Barlow',sans-serif",fontSize:13}}>Joining <strong>{joinPool?.name}</strong>...</span></div>}
        {joinStatus==="done"&&<div style={{background:"rgba(34,197,94,.1)",borderBottom:"1px solid rgba(34,197,94,.3)",padding:"10px 14px",textAlign:"center"}}><span style={{color:C.green,fontFamily:"'Barlow',sans-serif",fontSize:13}}>Joined <strong>{joinPool?.name}</strong>! Make your picks below.</span></div>}
        {joinStatus==="expired"&&<div style={{background:"rgba(239,68,68,.1)",borderBottom:"1px solid rgba(239,68,68,.3)",padding:"10px 14px",textAlign:"center"}}><span style={{color:C.red,fontFamily:"'Barlow',sans-serif",fontSize:13}}>This pool's invite link has expired.</span></div>}

        {page==="home"&&<LeaderboardPage userId={user.id} displayName={displayName} bracketComplete={bracketComplete} bracketName={bracketName} setBracketName={setBracketName} saveName={saveName} allBrackets={allBrackets} results={results} locked={locked} picksVisible={picksVisible} onViewBracket={setViewingBracket} onH2H={setH2hBracket} oddsMap={oddsMap} currentPool={currentPool} matches={matches} globalPercentile={globalPercentile}/>}
        {page==="bracket"&&<BracketPage step={bracketStep} setStep={setBracketStep} groupPicks={groupPicks} setGroupPicks={setGP} wildcardPicks={wildcardPicks} setWildcardPicks={setWP} wildcardRanking={wildcardRanking} setWildcardRanking={setWR} knockoutPicks={knockoutPicks} setKnockoutPicks={setKP} locked={locked} results={results} championGoalDiff={championGoalDiff} setChampionGoalDiff={setCGD} triggerSave={triggerSave} bracketComplete={bracketComplete} allBrackets={allBrackets}
          onDeleteBracket={async()=>{
            if(!window.confirm("Reset your bracket? All picks will be cleared and you can start over. This cannot be undone."))return;
            const fresh=initGroupPicks();
            setGP(fresh);setWP([]);setWR([]);setKP({});setCGD(null);
            setBracketStep("groups");
            await supabase.from("brackets").update({group_picks:fresh,wildcard_picks:[],wildcard_ranking:[],knockout_picks:{},champion_goal_diff_pick:null}).eq("user_id",user.id).eq("pool_id",activePool);
          }}
          onLeavePool={async()=>{
            if(!window.confirm("Leave this pool? Your bracket in this pool will be deleted. You can rejoin with the invite link."))return;
            await supabase.from("brackets").delete().eq("user_id",user.id).eq("pool_id",activePool);
            await supabase.from("pool_members").delete().eq("user_id",user.id).eq("pool_id",activePool);
            setActivePool(null);loadPools();setPage("home");
          }}
        />}
        {page==="matches"&&<MatchesPage matches={matches} loading={matchesLoading}/>}
        {page==="insights"&&<InsightsPage allBrackets={allBrackets} userId={user.id} results={results} picksVisible={picksVisible} matches={matches}/>}
        {page==="manager"&&isAdmin&&<ManagerPage allBrackets={allBrackets} results={results} onResultsUpdate={loadResults} pools={pools} userId={user.id}/>}

        <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:900,background:C.navBg,borderTop:"1px solid "+C.borderAccent,display:"flex",justifyContent:"space-around",padding:"6px 0 max(env(safe-area-inset-bottom),6px)",zIndex:200}}>
          {navItems.map(({id,label,Icon})=>(
            <button key={id} onClick={()=>{setPage(id);setShowPoolSwitcher(false);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 12px",background:"transparent",border:"none",cursor:"pointer",color:page===id?C.accent:C.muted,minWidth:0,position:"relative"}}>
              <Icon s={22} c={page===id?C.accent:C.muted}/>
              {id==="matches"&&(hasLiveMatch||hasMatchesToday)&&page!=="matches"&&<div style={{position:"absolute",top:2,right:8,width:7,height:7,borderRadius:"50%",background:hasLiveMatch?C.red:C.accent}}/>}
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:10,letterSpacing:.5,whiteSpace:"nowrap"}}>{label}</span>
              {page===id&&<div style={{width:18,height:2,background:C.accent,borderRadius:1}}/>}
            </button>
          ))}
        </nav>

        {viewingBracket&&<BracketViewer bracket={viewingBracket} results={results} onClose={()=>{setViewingBracket(null);if(viewSharedUserId)window.history.replaceState({},"","/");}}/>}
        {h2hBracket&&myBracket&&<HeadToHeadModal myBracket={myBracket} opponent={h2hBracket} results={results} onClose={()=>setH2hBracket(null)}/>}
        {showCreatePool&&<CreatePoolModal userId={user.id} displayName={displayName} onCreated={id=>{setShowCreatePool(false);loadPools();setActivePool(id);setShowBracketNameModal(true);}} onClose={()=>setShowCreatePool(false)}/>}
        {showPoolManager&&currentPool&&<PoolManagerPanel pool={currentPool} allBrackets={allBrackets} results={results} onClose={()=>setShowPoolManager(false)} userId={user.id} onPoolDeleted={()=>{setShowPoolManager(false);setActivePool(null);loadPools();}}/>}
        {showBracketNameModal&&<BracketNameModal defaultName={displayName.split(" ")[0]+"'s Picks"} onConfirm={handleBracketNameConfirm}/>}
        {showPasswordReset&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
            <div style={{background:C.card,borderRadius:16,padding:28,maxWidth:360,width:"100%",border:"1px solid "+C.borderAccent,textAlign:"center"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:C.accent,letterSpacing:1.5,marginBottom:8}}>SET NEW PASSWORD</div>
              <p style={{color:C.muted,fontFamily:"'Barlow',sans-serif",fontSize:13,marginBottom:20,lineHeight:1.5}}>Choose a new password for your account.</p>
              <input type="password" placeholder="New password (min 8 chars)" value={newPassword} onChange={e=>setNewPassword(e.target.value)}
                style={{...inp,fontSize:15,marginBottom:14}}/>
              {resetMsg&&<p style={{color:resetMsg.includes("Error")?C.red:C.green,fontFamily:"'Barlow',sans-serif",fontSize:13,marginBottom:12}}>{resetMsg}</p>}
              <button onClick={async()=>{
                if(newPassword.length<8){setResetMsg("Password must be at least 8 characters.");return;}
                const{error}=await supabase.auth.updateUser({password:newPassword});
                if(error)setResetMsg("Error: "+error.message);
                else{setResetMsg("Password updated!");setTimeout(()=>{setShowPasswordReset(false);setNewPassword("");setResetMsg("");window.history.replaceState({},"","/");},1500);}
              }} disabled={newPassword.length<8} style={{...btn(true,newPassword.length<8),width:"100%"}}>UPDATE PASSWORD</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
