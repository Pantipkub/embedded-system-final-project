import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  update,
  set,
  serverTimestamp,
} from "firebase/database";

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

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export type ClotheslineStatus = {
  system_status: string;
  temperature: number;
  humidity: number;
  water_level: number;
  clothesline_status: string;
  motor_status: string;
  led_indicator: string;
  timestamp: string;
};

export function listenStatus(cb: (data: ClotheslineStatus | null) => void) {
  const statusRef = ref(db, "/clothesline/status");
  return onValue(statusRef, (snap) => {
    cb((snap.val() as ClotheslineStatus) ?? null);
  });
}

export async function sendMotorCommand(cmd: "EXTEND" | "RETRACT" | "IDLE") {
  const commandRef = ref(db, "/clothesline/command");
  await update(commandRef, {
    motor: cmd,
    updatedAt: serverTimestamp(),
  });
}

// Mock publisher: writes status every 3s when enabled via env
let mockInterval: ReturnType<typeof setInterval> | null = null;

export function startMockStatusPublisher() {
  if (mockInterval) return;
  const enabled = process.env.NEXT_PUBLIC_ENABLE_MOCK === "true";
  if (!enabled) return;

  const statusRef = ref(db, "/clothesline/status");
  mockInterval = setInterval(() => {
    const now = new Date();
    const payload: ClotheslineStatus = {
      system_status: "Active",
      temperature: +(25 + Math.random() * 8).toFixed(1),
      humidity: Math.round(60 + Math.random() * 30),
      water_level: Math.round(30 + Math.random() * 50),
      clothesline_status: ["Idle", "Extending", "Retracting"][
        Math.floor(Math.random() * 3)
      ],
      motor_status: ["STOPPED", "RUNNING"][Math.floor(Math.random() * 2)],
      led_indicator: "Connected",
      timestamp: now.toISOString(),
    };
    set(statusRef, payload);
  }, 3000);
}

export function stopMockStatusPublisher() {
  if (mockInterval) {
    clearInterval(mockInterval);
    mockInterval = null;
  }
}
