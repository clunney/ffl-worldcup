// cleanup-test-data.js
// Run with: node cleanup-test-data.js
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const SUPABASE_URL = "https://yfopcipariegadurfmxr.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error("\n❌  Missing SUPABASE_SERVICE_ROLE_KEY in .env\n");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_EMAILS = [
  "test-mike@ffl-test.com",  "test-sarah@ffl-test.com",
  "test-jake@ffl-test.com",  "test-lisa@ffl-test.com",
  "test-tom@ffl-test.com",   "test-nina@ffl-test.com",
  "test-derek@ffl-test.com", "test-priya@ffl-test.com",
  "test-james@ffl-test.com", "test-chloe@ffl-test.com",
  "test-alex@ffl-test.com",
];

async function cleanup() {
  console.log("\n🗑️   FFL Test Data Cleanup\n");

  // 1. Find test user IDs
  let userIds = [];
  try {
    const saved = JSON.parse(fs.readFileSync(".test-user-ids.json", "utf8"));
    userIds = saved;
  } catch {
    // Fall back to looking them up by email
    const { data: { users } } = await admin.auth.admin.listUsers();
    userIds = users.filter(u => TEST_EMAILS.includes(u.email)).map(u => u.id);
  }

  if (!userIds.length) {
    console.log("   No test users found — already cleaned up.\n");
  }

  // 2. Delete brackets
  process.stdout.write(`   Deleting ${userIds.length} test brackets… `);
  for (const id of userIds) {
    await admin.from("brackets").delete().eq("user_id", id);
  }
  console.log("✓");

  // 3. Delete auth users
  process.stdout.write(`   Deleting ${userIds.length} test auth users… `);
  for (const id of userIds) {
    await admin.auth.admin.deleteUser(id);
  }
  console.log("✓");

  // 4. Reset actual_results
  process.stdout.write("   Resetting match results… ");
  const { error } = await admin.from("actual_results").update({
    group_results: {},
    wildcard_codes: [],
    knockout_results: {},
    tournament_locked: false,
    picks_visible: false,
    scoring_config: null,
  }).eq("id", "00000000-0000-0000-0000-000000000001");

  if (error) console.log(`❌ ${error.message}`);
  else console.log("✓");

  // 5. Remove saved IDs file
  try { fs.unlinkSync(".test-user-ids.json"); } catch {}

  console.log("\n✅  All test data removed. Site is back to pre-tournament state.\n");
}

cleanup().catch(err => {
  console.error("\n❌ Cleanup failed:", err.message);
  process.exit(1);
});
