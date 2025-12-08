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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export type ClotheslineStatus = {
  system_status: string;
  temperature: number;
  humidity: number;
  ldr: number;
  water: number;
  clothesline_status: string;
  motor_status: string;
  led_indicator: string;
  timestamp: string;
};

export function listenStatus(cb: (data: ClotheslineStatus | null) => void) {
  const statusRef = ref(db, "/clothesline/status");
  return onValue(statusRef, (snap) => {
    console.log("Test", statusRef)
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
