// seed-test-data.js
// Run with: node seed-test-data.js
// Requires SUPABASE_SERVICE_ROLE_KEY in your .env file
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://yfopcipariegadurfmxr.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error("\n❌  Missing SUPABASE_SERVICE_ROLE_KEY");
  console.error("   1. Go to supabase.com → your project → Settings → API");
  console.error("   2. Copy the 'service_role' secret key");
  console.error("   3. Add to .env:  SUPABASE_SERVICE_ROLE_KEY=your_key_here\n");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Team helper ───────────────────────────────────────────────
const T = (name, code) => ({ name, code });

const TEAMS = {
  mx:  T("Mexico","mx"),       za:  T("South Africa","za"),  kr:  T("South Korea","kr"),   cz:  T("Czechia","cz"),
  ca:  T("Canada","ca"),       ch:  T("Switzerland","ch"),   qa:  T("Qatar","qa"),          ba:  T("Bosnia & Herz.","ba"),
  br:  T("Brazil","br"),       ma:  T("Morocco","ma"),       ht:  T("Haiti","ht"),          sct: T("Scotland","gb-sct"),
  us:  T("USA","us"),          py:  T("Paraguay","py"),      au:  T("Australia","au"),      tr:  T("Türkiye","tr"),
  de:  T("Germany","de"),      cw:  T("Curaçao","cw"),       ci:  T("Ivory Coast","ci"),   ec:  T("Ecuador","ec"),
  nl:  T("Netherlands","nl"),  jp:  T("Japan","jp"),         se:  T("Sweden","se"),         tn:  T("Tunisia","tn"),
  be:  T("Belgium","be"),      eg:  T("Egypt","eg"),         ir:  T("Iran","ir"),           nz:  T("New Zealand","nz"),
  es:  T("Spain","es"),        cv:  T("Cape Verde","cv"),    sa:  T("Saudi Arabia","sa"),  uy:  T("Uruguay","uy"),
  fr:  T("France","fr"),       sn:  T("Senegal","sn"),       no:  T("Norway","no"),         iq:  T("Iraq","iq"),
  ar:  T("Argentina","ar"),    dz:  T("Algeria","dz"),       at:  T("Austria","at"),        jo:  T("Jordan","jo"),
  pt:  T("Portugal","pt"),     cd:  T("DR Congo","cd"),      uz:  T("Uzbekistan","uz"),     co:  T("Colombia","co"),
  eng: T("England","gb-eng"),  hr:  T("Croatia","hr"),       gh:  T("Ghana","gh"),          pa:  T("Panama","pa"),
};

// ── Mock actual results (simulates mid-R32 tournament state) ─
// All group stage complete, R32 first 8 of 16 matches played
const ACTUAL_RESULTS = {
  group_results: {
    A: [TEAMS.mx, TEAMS.kr, TEAMS.za, TEAMS.cz],
    B: [TEAMS.ca, TEAMS.ch, TEAMS.qa, TEAMS.ba],
    C: [TEAMS.br, TEAMS.ma, TEAMS.ht, TEAMS.sct],
    D: [TEAMS.us, TEAMS.tr, TEAMS.py, TEAMS.au],
    E: [TEAMS.de, TEAMS.ec, TEAMS.ci, TEAMS.cw],
    F: [TEAMS.nl, TEAMS.jp, TEAMS.se, TEAMS.tn],
    G: [TEAMS.be, TEAMS.eg, TEAMS.ir, TEAMS.nz],
    H: [TEAMS.es, TEAMS.uy, TEAMS.sa, TEAMS.cv],
    I: [TEAMS.fr, TEAMS.sn, TEAMS.no, TEAMS.iq],
    J: [TEAMS.ar, TEAMS.at, TEAMS.dz, TEAMS.jo],
    K: [TEAMS.pt, TEAMS.co, TEAMS.cd, TEAMS.uz],
    L: [TEAMS.eng, TEAMS.hr, TEAMS.gh, TEAMS.pa],
  },
  // 8 best 3rd-place teams advance as wildcards
  wildcard_codes: ["za","py","no","ci","ir","dz","ht","se"],
  // R32: first 8 of 16 matches played (matches 8-15 still upcoming = "tonight")
  knockout_results: {
    r32: {
      0: TEAMS.mx,   // Mexico beat Switzerland
      1: TEAMS.br,   // Brazil beat Türkiye
      2: TEAMS.de,   // Germany beat Japan
      3: TEAMS.be,   // Belgium beat Uruguay
      4: TEAMS.ca,   // Canada beat South Korea
      5: TEAMS.us,   // USA beat Morocco
      6: TEAMS.nl,   // Netherlands beat Ecuador
      7: TEAMS.es,   // Spain beat Egypt
      // matches 8-15 not played yet — France vs Austria, Portugal vs Croatia, etc.
    },
  },
  tournament_locked: true,
  picks_visible: true,
  scoring_config: null, // uses app defaults
};

// ── Helper: build knockout_picks object from arrays ───────────
const koObj = (arr) => arr.reduce((acc, team, i) => ({ ...acc, [i]: team }), {});

const buildKO = (r32, r16, qf, sf, champion, thirdPlace) => ({
  r32: koObj(r32), r16: koObj(r16), qf: koObj(qf), sf: koObj(sf),
  champion, thirdPlace,
});

// ── 11 fake participants with varied brackets ─────────────────
// Points are calculated against ACTUAL_RESULTS above.
// Group stage: most users get 6-10 exact + some partial.
// R32: 8 matches played so far.

const PARTICIPANTS = [
  {
    name: "Mike R.",
    bracketName: "Messi's Disciples",
    email: "test-mike@ffl-test.com",
    group_picks: {
      A:[TEAMS.mx,TEAMS.kr,TEAMS.za,TEAMS.cz], B:[TEAMS.ca,TEAMS.ch,TEAMS.qa,TEAMS.ba],
      C:[TEAMS.br,TEAMS.ma,TEAMS.ht,TEAMS.sct], D:[TEAMS.us,TEAMS.tr,TEAMS.py,TEAMS.au],
      E:[TEAMS.de,TEAMS.ec,TEAMS.ci,TEAMS.cw], F:[TEAMS.nl,TEAMS.jp,TEAMS.se,TEAMS.tn],
      G:[TEAMS.be,TEAMS.eg,TEAMS.ir,TEAMS.nz], H:[TEAMS.es,TEAMS.uy,TEAMS.sa,TEAMS.cv],
      I:[TEAMS.fr,TEAMS.sn,TEAMS.no,TEAMS.iq], J:[TEAMS.ar,TEAMS.at,TEAMS.dz,TEAMS.jo],
      K:[TEAMS.pt,TEAMS.co,TEAMS.cd,TEAMS.uz], L:[TEAMS.eng,TEAMS.hr,TEAMS.gh,TEAMS.pa],
    },
    wildcard_picks: ["za","py","no","ci","ir","dz","ht","se"], // all correct
    knockout_picks: buildKO(
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.be,TEAMS.ca,TEAMS.us,TEAMS.nl,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.ar,TEAMS.eng,TEAMS.py,TEAMS.no,TEAMS.dz,TEAMS.se],
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.no,TEAMS.dz],
      [TEAMS.br,TEAMS.es,TEAMS.fr,TEAMS.pt],
      [TEAMS.br,TEAMS.fr],
      TEAMS.ar, TEAMS.es
    ),
  },
  {
    name: "Sarah K.",
    bracketName: "Dark Horse Energy",
    email: "test-sarah@ffl-test.com",
    group_picks: {
      A:[TEAMS.mx,TEAMS.za,TEAMS.kr,TEAMS.cz], B:[TEAMS.ca,TEAMS.ch,TEAMS.qa,TEAMS.ba],
      C:[TEAMS.ma,TEAMS.br,TEAMS.ht,TEAMS.sct], D:[TEAMS.us,TEAMS.py,TEAMS.tr,TEAMS.au],
      E:[TEAMS.de,TEAMS.ci,TEAMS.ec,TEAMS.cw], F:[TEAMS.nl,TEAMS.jp,TEAMS.se,TEAMS.tn],
      G:[TEAMS.be,TEAMS.ir,TEAMS.eg,TEAMS.nz], H:[TEAMS.es,TEAMS.uy,TEAMS.cv,TEAMS.sa],
      I:[TEAMS.fr,TEAMS.sn,TEAMS.no,TEAMS.iq], J:[TEAMS.ar,TEAMS.dz,TEAMS.at,TEAMS.jo],
      K:[TEAMS.pt,TEAMS.co,TEAMS.cd,TEAMS.uz], L:[TEAMS.eng,TEAMS.hr,TEAMS.pa,TEAMS.gh],
    },
    wildcard_picks: ["za","py","no","ci","ir","dz","sa","se"],
    knockout_picks: buildKO(
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.be,TEAMS.ca,TEAMS.us,TEAMS.nl,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.ar,TEAMS.eng,TEAMS.za,TEAMS.no,TEAMS.dz,TEAMS.se],
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.es,TEAMS.fr,TEAMS.ar,TEAMS.no,TEAMS.dz],
      [TEAMS.br,TEAMS.es,TEAMS.ar,TEAMS.no],
      [TEAMS.ar,TEAMS.br],
      TEAMS.ma, TEAMS.br
    ),
  },
  {
    name: "Jake T.",
    bracketName: "World Cup Chad",
    email: "test-jake@ffl-test.com",
    group_picks: {
      A:[TEAMS.mx,TEAMS.kr,TEAMS.za,TEAMS.cz], B:[TEAMS.ca,TEAMS.ch,TEAMS.ba,TEAMS.qa],
      C:[TEAMS.br,TEAMS.ma,TEAMS.sct,TEAMS.ht], D:[TEAMS.us,TEAMS.tr,TEAMS.au,TEAMS.py],
      E:[TEAMS.de,TEAMS.ec,TEAMS.cw,TEAMS.ci], F:[TEAMS.nl,TEAMS.se,TEAMS.jp,TEAMS.tn],
      G:[TEAMS.be,TEAMS.eg,TEAMS.nz,TEAMS.ir], H:[TEAMS.es,TEAMS.sa,TEAMS.uy,TEAMS.cv],
      I:[TEAMS.fr,TEAMS.sn,TEAMS.no,TEAMS.iq], J:[TEAMS.ar,TEAMS.at,TEAMS.dz,TEAMS.jo],
      K:[TEAMS.pt,TEAMS.co,TEAMS.uz,TEAMS.cd], L:[TEAMS.eng,TEAMS.hr,TEAMS.gh,TEAMS.pa],
    },
    wildcard_picks: ["za","py","no","ci","ir","dz","ht","se"],
    knockout_picks: buildKO(
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.be,TEAMS.ca,TEAMS.us,TEAMS.nl,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.ar,TEAMS.eng,TEAMS.py,TEAMS.no,TEAMS.dz,TEAMS.se],
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.es,TEAMS.ar,TEAMS.pt,TEAMS.py,TEAMS.dz],
      [TEAMS.br,TEAMS.es,TEAMS.ar,TEAMS.pt],
      [TEAMS.es,TEAMS.ar],
      TEAMS.es, TEAMS.pt
    ),
  },
  {
    name: "Lisa M.",
    bracketName: "Ronaldo's Ghost",
    email: "test-lisa@ffl-test.com",
    group_picks: {
      A:[TEAMS.mx,TEAMS.kr,TEAMS.cz,TEAMS.za], B:[TEAMS.ca,TEAMS.ch,TEAMS.qa,TEAMS.ba],
      C:[TEAMS.br,TEAMS.ma,TEAMS.ht,TEAMS.sct], D:[TEAMS.us,TEAMS.tr,TEAMS.py,TEAMS.au],
      E:[TEAMS.de,TEAMS.ec,TEAMS.ci,TEAMS.cw], F:[TEAMS.nl,TEAMS.jp,TEAMS.tn,TEAMS.se],
      G:[TEAMS.be,TEAMS.eg,TEAMS.ir,TEAMS.nz], H:[TEAMS.es,TEAMS.uy,TEAMS.sa,TEAMS.cv],
      I:[TEAMS.fr,TEAMS.no,TEAMS.sn,TEAMS.iq], J:[TEAMS.ar,TEAMS.at,TEAMS.dz,TEAMS.jo],
      K:[TEAMS.pt,TEAMS.co,TEAMS.cd,TEAMS.uz], L:[TEAMS.eng,TEAMS.hr,TEAMS.gh,TEAMS.pa],
    },
    wildcard_picks: ["cz","py","no","ci","ir","dz","ht","se"],
    knockout_picks: buildKO(
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.be,TEAMS.ca,TEAMS.us,TEAMS.nl,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.ar,TEAMS.eng,TEAMS.py,TEAMS.no,TEAMS.dz,TEAMS.se],
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.py,TEAMS.dz],
      [TEAMS.br,TEAMS.es,TEAMS.pt,TEAMS.dz],
      [TEAMS.pt,TEAMS.es],
      TEAMS.pt, TEAMS.br
    ),
  },
  {
    name: "Tom W.",
    bracketName: "Group Stage Glory",
    email: "test-tom@ffl-test.com",
    group_picks: {
      A:[TEAMS.mx,TEAMS.kr,TEAMS.za,TEAMS.cz], B:[TEAMS.ca,TEAMS.ch,TEAMS.qa,TEAMS.ba],
      C:[TEAMS.br,TEAMS.ma,TEAMS.ht,TEAMS.sct], D:[TEAMS.us,TEAMS.tr,TEAMS.py,TEAMS.au],
      E:[TEAMS.de,TEAMS.ec,TEAMS.ci,TEAMS.cw], F:[TEAMS.nl,TEAMS.jp,TEAMS.se,TEAMS.tn],
      G:[TEAMS.be,TEAMS.eg,TEAMS.ir,TEAMS.nz], H:[TEAMS.es,TEAMS.uy,TEAMS.sa,TEAMS.cv],
      I:[TEAMS.fr,TEAMS.sn,TEAMS.no,TEAMS.iq], J:[TEAMS.ar,TEAMS.at,TEAMS.dz,TEAMS.jo],
      K:[TEAMS.pt,TEAMS.co,TEAMS.cd,TEAMS.uz], L:[TEAMS.eng,TEAMS.hr,TEAMS.gh,TEAMS.pa],
    },
    wildcard_picks: ["za","py","no","ci","eg","dz","ht","se"],
    knockout_picks: buildKO(
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.be,TEAMS.ca,TEAMS.us,TEAMS.nl,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.ar,TEAMS.eng,TEAMS.py,TEAMS.no,TEAMS.dz,TEAMS.se],
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.no,TEAMS.dz],
      [TEAMS.br,TEAMS.es,TEAMS.fr,TEAMS.no],
      [TEAMS.fr,TEAMS.es],
      TEAMS.fr, TEAMS.no
    ),
  },
  {
    name: "Nina P.",
    bracketName: "Futbol Forever",
    email: "test-nina@ffl-test.com",
    group_picks: {
      A:[TEAMS.mx,TEAMS.za,TEAMS.kr,TEAMS.cz], B:[TEAMS.ch,TEAMS.ca,TEAMS.qa,TEAMS.ba],
      C:[TEAMS.br,TEAMS.ma,TEAMS.sct,TEAMS.ht], D:[TEAMS.us,TEAMS.py,TEAMS.tr,TEAMS.au],
      E:[TEAMS.de,TEAMS.ci,TEAMS.ec,TEAMS.cw], F:[TEAMS.jp,TEAMS.nl,TEAMS.se,TEAMS.tn],
      G:[TEAMS.be,TEAMS.eg,TEAMS.ir,TEAMS.nz], H:[TEAMS.es,TEAMS.uy,TEAMS.sa,TEAMS.cv],
      I:[TEAMS.fr,TEAMS.sn,TEAMS.no,TEAMS.iq], J:[TEAMS.ar,TEAMS.dz,TEAMS.at,TEAMS.jo],
      K:[TEAMS.co,TEAMS.pt,TEAMS.cd,TEAMS.uz], L:[TEAMS.eng,TEAMS.hr,TEAMS.gh,TEAMS.pa],
    },
    wildcard_picks: ["za","py","no","ci","ir","dz","sa","ht"],
    knockout_picks: buildKO(
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.be,TEAMS.ch,TEAMS.us,TEAMS.jp,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.ar,TEAMS.eng,TEAMS.za,TEAMS.no,TEAMS.dz,TEAMS.se],
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.es,TEAMS.fr,TEAMS.ar,TEAMS.no,TEAMS.dz],
      [TEAMS.br,TEAMS.es,TEAMS.ar,TEAMS.no],
      [TEAMS.br,TEAMS.ar],
      TEAMS.br, TEAMS.es
    ),
  },
  {
    name: "Derek O.",
    bracketName: "Chaos Theory",
    email: "test-derek@ffl-test.com",
    group_picks: {
      A:[TEAMS.kr,TEAMS.mx,TEAMS.cz,TEAMS.za], B:[TEAMS.ch,TEAMS.qa,TEAMS.ca,TEAMS.ba],
      C:[TEAMS.ma,TEAMS.br,TEAMS.sct,TEAMS.ht], D:[TEAMS.tr,TEAMS.us,TEAMS.au,TEAMS.py],
      E:[TEAMS.de,TEAMS.ci,TEAMS.cw,TEAMS.ec], F:[TEAMS.jp,TEAMS.se,TEAMS.nl,TEAMS.tn],
      G:[TEAMS.eg,TEAMS.be,TEAMS.nz,TEAMS.ir], H:[TEAMS.uy,TEAMS.es,TEAMS.cv,TEAMS.sa],
      I:[TEAMS.sn,TEAMS.fr,TEAMS.iq,TEAMS.no], J:[TEAMS.ar,TEAMS.dz,TEAMS.jo,TEAMS.at],
      K:[TEAMS.co,TEAMS.pt,TEAMS.uz,TEAMS.cd], L:[TEAMS.hr,TEAMS.eng,TEAMS.pa,TEAMS.gh],
    },
    wildcard_picks: ["cz","qa","sct","au","cw","tn","nz","cv"],
    knockout_picks: buildKO(
      [TEAMS.kr,TEAMS.ma,TEAMS.de,TEAMS.uy,TEAMS.ch,TEAMS.ma,TEAMS.jp,TEAMS.eg,TEAMS.sn,TEAMS.hr,TEAMS.ar,TEAMS.co,TEAMS.cz,TEAMS.ci,TEAMS.ir,TEAMS.ht],
      [TEAMS.kr,TEAMS.ma,TEAMS.de,TEAMS.eg,TEAMS.sn,TEAMS.ar,TEAMS.ci,TEAMS.ir],
      [TEAMS.ma,TEAMS.eg,TEAMS.ar,TEAMS.ir],
      [TEAMS.ma,TEAMS.ar],
      TEAMS.tr, TEAMS.eg
    ),
  },
  {
    name: "Priya S.",
    bracketName: "Underdog Nation",
    email: "test-priya@ffl-test.com",
    group_picks: {
      A:[TEAMS.mx,TEAMS.za,TEAMS.kr,TEAMS.cz], B:[TEAMS.ca,TEAMS.ch,TEAMS.qa,TEAMS.ba],
      C:[TEAMS.ma,TEAMS.br,TEAMS.ht,TEAMS.sct], D:[TEAMS.us,TEAMS.tr,TEAMS.py,TEAMS.au],
      E:[TEAMS.de,TEAMS.ci,TEAMS.ec,TEAMS.cw], F:[TEAMS.nl,TEAMS.jp,TEAMS.se,TEAMS.tn],
      G:[TEAMS.be,TEAMS.eg,TEAMS.ir,TEAMS.nz], H:[TEAMS.es,TEAMS.uy,TEAMS.sa,TEAMS.cv],
      I:[TEAMS.fr,TEAMS.sn,TEAMS.no,TEAMS.iq], J:[TEAMS.ar,TEAMS.at,TEAMS.dz,TEAMS.jo],
      K:[TEAMS.pt,TEAMS.cd,TEAMS.co,TEAMS.uz], L:[TEAMS.eng,TEAMS.hr,TEAMS.gh,TEAMS.pa],
    },
    wildcard_picks: ["za","py","no","ci","ir","dz","ht","se"],
    knockout_picks: buildKO(
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.be,TEAMS.ca,TEAMS.ma,TEAMS.nl,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.ar,TEAMS.eng,TEAMS.za,TEAMS.no,TEAMS.dz,TEAMS.se],
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.es,TEAMS.fr,TEAMS.ar,TEAMS.no,TEAMS.dz],
      [TEAMS.br,TEAMS.es,TEAMS.ar,TEAMS.no],
      [TEAMS.ar,TEAMS.br],
      TEAMS.ma, TEAMS.no
    ),
  },
  {
    name: "James H.",
    bracketName: "The Analyst",
    email: "test-james@ffl-test.com",
    group_picks: {
      A:[TEAMS.mx,TEAMS.kr,TEAMS.za,TEAMS.cz], B:[TEAMS.ca,TEAMS.ch,TEAMS.qa,TEAMS.ba],
      C:[TEAMS.br,TEAMS.ma,TEAMS.ht,TEAMS.sct], D:[TEAMS.us,TEAMS.tr,TEAMS.py,TEAMS.au],
      E:[TEAMS.de,TEAMS.ec,TEAMS.ci,TEAMS.cw], F:[TEAMS.nl,TEAMS.jp,TEAMS.se,TEAMS.tn],
      G:[TEAMS.be,TEAMS.eg,TEAMS.ir,TEAMS.nz], H:[TEAMS.es,TEAMS.uy,TEAMS.sa,TEAMS.cv],
      I:[TEAMS.fr,TEAMS.sn,TEAMS.no,TEAMS.iq], J:[TEAMS.ar,TEAMS.at,TEAMS.dz,TEAMS.jo],
      K:[TEAMS.pt,TEAMS.co,TEAMS.cd,TEAMS.uz], L:[TEAMS.eng,TEAMS.hr,TEAMS.gh,TEAMS.pa],
    },
    wildcard_picks: ["za","py","no","ci","ir","dz","ht","se"],
    knockout_picks: buildKO(
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.be,TEAMS.ca,TEAMS.us,TEAMS.nl,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.ar,TEAMS.eng,TEAMS.py,TEAMS.no,TEAMS.dz,TEAMS.se],
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.no,TEAMS.dz],
      [TEAMS.de,TEAMS.es,TEAMS.fr,TEAMS.pt],
      [TEAMS.de,TEAMS.fr],
      TEAMS.de, TEAMS.es
    ),
  },
  {
    name: "Chloe D.",
    bracketName: "Giant Killers FC",
    email: "test-chloe@ffl-test.com",
    group_picks: {
      A:[TEAMS.mx,TEAMS.kr,TEAMS.za,TEAMS.cz], B:[TEAMS.ca,TEAMS.ch,TEAMS.ba,TEAMS.qa],
      C:[TEAMS.br,TEAMS.ma,TEAMS.ht,TEAMS.sct], D:[TEAMS.us,TEAMS.tr,TEAMS.py,TEAMS.au],
      E:[TEAMS.de,TEAMS.ec,TEAMS.ci,TEAMS.cw], F:[TEAMS.nl,TEAMS.jp,TEAMS.se,TEAMS.tn],
      G:[TEAMS.be,TEAMS.eg,TEAMS.ir,TEAMS.nz], H:[TEAMS.es,TEAMS.uy,TEAMS.cv,TEAMS.sa],
      I:[TEAMS.fr,TEAMS.sn,TEAMS.no,TEAMS.iq], J:[TEAMS.ar,TEAMS.at,TEAMS.dz,TEAMS.jo],
      K:[TEAMS.pt,TEAMS.co,TEAMS.cd,TEAMS.uz], L:[TEAMS.eng,TEAMS.hr,TEAMS.gh,TEAMS.pa],
    },
    wildcard_picks: ["za","py","no","ci","ir","dz","ht","se"],
    knockout_picks: buildKO(
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.be,TEAMS.ca,TEAMS.us,TEAMS.nl,TEAMS.es,TEAMS.fr,TEAMS.pt,TEAMS.ar,TEAMS.eng,TEAMS.py,TEAMS.no,TEAMS.dz,TEAMS.se],
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.es,TEAMS.fr,TEAMS.ar,TEAMS.no,TEAMS.dz],
      [TEAMS.br,TEAMS.es,TEAMS.ar,TEAMS.no],
      [TEAMS.ar,TEAMS.br],
      TEAMS.ar, TEAMS.de
    ),
  },
  {
    name: "Alex V.",
    bracketName: "Last Minute FC",
    email: "test-alex@ffl-test.com",
    group_picks: {
      A:[TEAMS.mx,TEAMS.kr,TEAMS.za,TEAMS.cz], B:[TEAMS.ca,TEAMS.ch,TEAMS.qa,TEAMS.ba],
      C:[TEAMS.br,TEAMS.ma,TEAMS.ht,TEAMS.sct], D:[TEAMS.us,TEAMS.py,TEAMS.tr,TEAMS.au],
      E:[TEAMS.de,TEAMS.ec,TEAMS.cw,TEAMS.ci], F:[TEAMS.nl,TEAMS.se,TEAMS.jp,TEAMS.tn],
      G:[TEAMS.be,TEAMS.ir,TEAMS.eg,TEAMS.nz], H:[TEAMS.es,TEAMS.uy,TEAMS.sa,TEAMS.cv],
      I:[TEAMS.fr,TEAMS.no,TEAMS.sn,TEAMS.iq], J:[TEAMS.ar,TEAMS.at,TEAMS.dz,TEAMS.jo],
      K:[TEAMS.pt,TEAMS.co,TEAMS.cd,TEAMS.uz], L:[TEAMS.eng,TEAMS.hr,TEAMS.gh,TEAMS.pa],
    },
    wildcard_picks: ["za","py","no","ci","ir","dz","sa","se"],
    knockout_picks: buildKO(
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.be,TEAMS.ca,TEAMS.us,TEAMS.nl,TEAMS.es,TEAMS.fr,TEAMS.hr,TEAMS.ar,TEAMS.eng,TEAMS.py,TEAMS.no,TEAMS.dz,TEAMS.se],
      [TEAMS.mx,TEAMS.br,TEAMS.de,TEAMS.es,TEAMS.fr,TEAMS.ar,TEAMS.py,TEAMS.dz],
      [TEAMS.br,TEAMS.es,TEAMS.ar,TEAMS.py],
      [TEAMS.es,TEAMS.ar],
      TEAMS.es, TEAMS.br
    ),
  },
];

// ── Main seed function ────────────────────────────────────────
async function seed() {
  console.log("\n🌱  FFL Test Data Seeder\n");
  const createdUserIds = [];

  // 1. Create test auth users + brackets
  for (const p of PARTICIPANTS) {
    process.stdout.write(`   Creating ${p.name} (${p.email})… `);

    // Create auth user
    const { data: userData, error: authErr } = await admin.auth.admin.createUser({
      email: p.email,
      password: "FFL2026test!",
      email_confirm: true,
      user_metadata: { display_name: p.name },
    });

    if (authErr) {
      if (authErr.message?.includes("already been registered")) {
        // User exists — find them
        const { data: { users } } = await admin.auth.admin.listUsers();
        const existing = users.find(u => u.email === p.email);
        if (existing) {
          createdUserIds.push(existing.id);
          // Update their bracket
          await admin.from("brackets").upsert({
            user_id: existing.id,
            display_name: p.name,
            bracket_name: p.bracketName,
            group_picks: p.group_picks,
            wildcard_picks: p.wildcard_picks,
            knockout_picks: p.knockout_picks,
          }, { onConflict: "user_id" });
          console.log("updated ✓");
          continue;
        }
      }
      console.log(`❌ ${authErr.message}`);
      continue;
    }

    createdUserIds.push(userData.user.id);

    // Create bracket
    const { error: bracketErr } = await admin.from("brackets").insert({
      user_id: userData.user.id,
      display_name: p.name,
      bracket_name: p.bracketName,
      group_picks: p.group_picks,
      wildcard_picks: p.wildcard_picks,
      knockout_picks: p.knockout_picks,
    });

    if (bracketErr) {
      console.log(`⚠️  bracket error: ${bracketErr.message}`);
    } else {
      console.log("✓");
    }
  }

  // 2. Update actual_results with mid-tournament state
  process.stdout.write("\n   Seeding match results… ");
  const { error: resultsErr } = await admin.from("actual_results").update({
    group_results: ACTUAL_RESULTS.group_results,
    wildcard_codes: ACTUAL_RESULTS.wildcard_codes,
    knockout_results: ACTUAL_RESULTS.knockout_results,
    tournament_locked: true,
    picks_visible: true,
    scoring_config: null,
  }).eq("id", "00000000-0000-0000-0000-000000000001");

  if (resultsErr) {
    console.log(`❌ ${resultsErr.message}`);
  } else {
    console.log("✓");
  }

  // 3. Save user IDs for cleanup
  const fs = require("fs");
  fs.writeFileSync(".test-user-ids.json", JSON.stringify(createdUserIds, null, 2));

  console.log(`
✅  Done! ${PARTICIPANTS.length} test participants seeded.

🌐  Visit ffl-worldcup.vercel.app or localhost:3000 to see the results.
    Your account shows the leaderboard with all 12 entries.

🧪  Test login (any participant):
    Email:    test-mike@ffl-test.com
    Password: FFL2026test!

🗑️   To remove all test data when done:
    node cleanup-test-data.js
`);
}

seed().catch(err => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
