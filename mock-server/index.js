import "dotenv/config";
import express from "express";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue } from "firebase/database";

const { PORT = 4000, INTERVAL_MS = 3000 } = process.env;

// Use Firebase web app configuration from environment variables
// Prefer server-side vars (FIREBASE_*) but fall back to NEXT_PUBLIC_* for convenience
const firebaseConfig = {
  apiKey:
    process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env.FIREBASE_AUTH_DOMAIN ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ||
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId:
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Basic validation to help diagnose misconfiguration early
for (const [key, val] of Object.entries(firebaseConfig)) {
  if (!val) {
    console.warn(
      `Firebase config missing ${key}. Check your environment vars.`
    );
  }
}

const appClient = initializeApp(firebaseConfig);
const db = getDatabase(appClient);
const app = express();

let intervalHandle = null;
let isMotorRunning = false;
let clotheslinePosition = "retracted"; // "extended" | "retracted"
let motorTimer = null;
let lastProcessedCmd = null;
// Stability mode for humidity to help front-end automation tests
let wetDryMode = "dry"; // "wet" or "dry"
let nextModeSwitchAt = Date.now() + 30_000; // switch every ~30s for stability

function randomStatus() {
  const now = new Date();
  // Switch mode occasionally to create stability windows
  if (Date.now() >= nextModeSwitchAt) {
    wetDryMode = wetDryMode === "dry" ? "wet" : "dry";
    nextModeSwitchAt =
      Date.now() + (25_000 + Math.floor(Math.random() * 20_000)); // 25–45s
  }

  // Humidity depends on mode: keep ranges stable during the window
  const humidity =
    wetDryMode === "wet"
      ? Math.round(78 + Math.random() * 8) // 78–86%
      : Math.round(55 + Math.random() * 10); // 55–65%

  // Temperature varies mildly
  const temperature = +(24 + Math.random() * 6).toFixed(1);
  // Light level varies throughout the day
  const ldr = Math.round(20 + Math.random() * 80); // 20-100%
  
  return {
    system_status: "Active",
    temperature,
    humidity,
    ldr,
    water_level: Math.round(30 + Math.random() * 50),
    clothesline_status: isMotorRunning
      ? clotheslinePosition === "extended"
        ? "Retracting"
        : "Extending"
      : clotheslinePosition === "extended"
      ? "Extended"
      : "Retracted",
    motor_status: isMotorRunning ? "RUNNING" : "STOPPED",
    led_indicator: "Connected",
    timestamp: now.toISOString(),
  };


}

async function writeStatusOnce() {
  const payload = randomStatus();
  await set(ref(db, "/clothesline/status"), payload);
}

// REST endpoints
app.get("/health", (_, res) => res.json({ ok: true }));
app.post("/start", async (_, res) => {
  if (intervalHandle) return res.json({ running: true });
  await writeStatusOnce();
  intervalHandle = setInterval(writeStatusOnce, Number(INTERVAL_MS));
  res.json({ started: true, intervalMs: Number(INTERVAL_MS) });
});
app.post("/stop", (_, res) => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  res.json({ stopped: true });
});
app.post("/command/:cmd", async (req, res) => {
  const cmd = String(req.params.cmd || "IDLE").toUpperCase();
  if (!["EXTEND", "RETRACT", "IDLE"].includes(cmd))
    return res.status(400).json({ error: "Invalid cmd" });
  // Write command
  await update(ref(db, "/clothesline/command"), {
    motor: cmd,
    updatedAt: Date.now(),
  });

  // If EXTEND/RETRACT: set motor running, update status immediately, then complete after 5s
  if (cmd === "EXTEND" || cmd === "RETRACT") {
    if (motorTimer) {
      clearTimeout(motorTimer);
      motorTimer = null;
    }
    isMotorRunning = true;
    // Immediate status update
    await writeStatusOnce();

    // Complete operation after 5 seconds
    motorTimer = setTimeout(async () => {
      isMotorRunning = false;
      // Update clothesline position deterministically
      if (cmd === "EXTEND") clotheslinePosition = "extended";
      if (cmd === "RETRACT") clotheslinePosition = "retracted";

      await writeStatusOnce();
      // Reset command to IDLE to prevent repeated actions
      await update(ref(db, "/clothesline/command"), {
        motor: "IDLE",
        updatedAt: Date.now(),
      });
    }, 5000);
  } else if (cmd === "IDLE") {
    // Stop any running motor immediately
    if (motorTimer) {
      clearTimeout(motorTimer);
      motorTimer = null;
    }
    isMotorRunning = false;
    await writeStatusOnce();
  }

  res.json({
    ok: true,
    motor: cmd,
    running: isMotorRunning,
    position: clotheslinePosition,
  });
});

// RTDB listener: automatically react to /clothesline/command/motor changes
const cmdMotorRef = ref(db, "/clothesline/command/motor");
onValue(cmdMotorRef, async (snap) => {
  const cmdRaw = snap.val();
  if (!cmdRaw || typeof cmdRaw !== "string") return;
  const cmd = cmdRaw.toUpperCase();
  if (!["EXTEND", "RETRACT", "IDLE"].includes(cmd)) return;
  // Avoid reprocessing the same command value repeatedly
  if (lastProcessedCmd === cmd && isMotorRunning === false) return;
  lastProcessedCmd = cmd;

  // Process command same as REST handler, but without writing it (frontend already did)
  if (cmd === "EXTEND" || cmd === "RETRACT") {
    if (motorTimer) {
      clearTimeout(motorTimer);
      motorTimer = null;
    }
    isMotorRunning = true;
    await writeStatusOnce();

    motorTimer = setTimeout(async () => {
      isMotorRunning = false;
      if (cmd === "EXTEND") clotheslinePosition = "extended";
      if (cmd === "RETRACT") clotheslinePosition = "retracted";
      await writeStatusOnce();
      await update(ref(db, "/clothesline/command"), {
        motor: "IDLE",
        updatedAt: Date.now(),
      });
    }, 5000);
  } else if (cmd === "IDLE") {
    if (motorTimer) {
      clearTimeout(motorTimer);
      motorTimer = null;
    }
    isMotorRunning = false;
    await writeStatusOnce();
  }
});

app.listen(Number(PORT), async () => {
  console.log(`Mock server on http://localhost:${PORT}`);
  // Auto-start status writer on boot for easier testing
  try {
    if (!intervalHandle) {
      await writeStatusOnce();
      intervalHandle = setInterval(writeStatusOnce, Number(INTERVAL_MS));
      console.log(`Auto-started status writer (every ${INTERVAL_MS}ms)`);
    }
  } catch (err) {
    console.error("Failed to auto-start status writer:", err);
  }
});
