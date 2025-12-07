import express from "express";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue } from "firebase/database";

const { PORT = 4000, INTERVAL_MS = 3000 } = process.env;

// Use the provided Firebase web app configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJ2BJg4ufN7sLFKNvbJ4AsWMlSvNIht3A",
  authDomain: "agentic-clothesline.firebaseapp.com",
  databaseURL:
    "https://agentic-clothesline-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "agentic-clothesline",
  storageBucket: "agentic-clothesline.firebasestorage.app",
  messagingSenderId: "642963093284",
  appId: "1:642963093284:web:4787dcdff3aa0c23e3a5b1",
};

const appClient = initializeApp(firebaseConfig);
const db = getDatabase(appClient);
const app = express();

let intervalHandle = null;
let isMotorRunning = false;
let clotheslinePosition = "retracted"; // "extended" | "retracted"
let motorTimer = null;
let lastProcessedCmd = null;

function randomStatus() {
  const now = new Date();
  return {
    system_status: "Active",
    temperature: +(25 + Math.random() * 8).toFixed(1),
    humidity: Math.round(60 + Math.random() * 30),
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

app.listen(Number(PORT), () => {
  console.log(`Mock server on http://localhost:${PORT}`);
  console.log(`POST /start to begin writing status every ${INTERVAL_MS}ms`);
});
