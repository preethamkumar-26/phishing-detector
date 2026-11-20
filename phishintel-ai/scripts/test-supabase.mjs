import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local file not found in phishintel-ai directory.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

console.log(`\n🔍 Checking Supabase connection to: ${url}`);
const supabase = createClient(url, key);

async function runHealthCheck() {
  let hasErrors = false;

  // 1. Auth service check
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("❌ Supabase Auth:", error.message);
      hasErrors = true;
    } else {
      console.log("✅ Supabase Auth service: Online and operational");
    }
  } catch (e) {
    console.error("❌ Supabase Auth failed to connect:", e.message);
    hasErrors = true;
  }

  // 2. Select from public.scans
  try {
    const { data, error } = await supabase.from("scans").select("id").limit(1);
    if (error) {
      console.error("❌ Database table access (SELECT):", error.message);
      hasErrors = true;
    } else {
      console.log(`✅ Database table 'public.scans': Connected (${data.length} row(s) sampled)`);
    }
  } catch (e) {
    console.error("❌ Table query failed:", e.message);
    hasErrors = true;
  }

  // 3. Insert test scan
  const testId = `HEALTHCHECK-${Date.now()}`;
  try {
    const { error } = await supabase.from("scans").insert({
      id: testId,
      decision: "SAFE",
      risk: "Low",
      risk_score: 5,
      p_value: 0.05,
      threshold: 0.5,
      subject: "Automated Supabase Health Check",
    });

    if (error) {
      console.error("❌ Database insert (INSERT):", error.message);
      hasErrors = true;
    } else {
      console.log("✅ Database write: Test scan created successfully");

      // 4. Cleanup test scan
      const { error: delError } = await supabase.from("scans").delete().eq("id", testId);
      if (delError) {
        console.warn("⚠️ Cleanup note (DELETE):", delError.message);
      } else {
        console.log("✅ Database cleanup: Test scan deleted successfully");
      }
    }
  } catch (e) {
    console.error("❌ Insert/delete test failed:", e.message);
    hasErrors = true;
  }

  console.log("\n" + (hasErrors ? "❌ Supabase reported one or more issues above." : "🎉 Supabase is 100% connected and fully operational!") + "\n");
}

runHealthCheck();
