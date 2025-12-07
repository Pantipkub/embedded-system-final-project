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
