"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Cloud,
  Droplets,
  Thermometer,
  Zap,
  Radio,
  AlertCircle,
  CheckCircle2,
  Play,
  Square,
} from "lucide-react";
import { listenStatus, sendMotorCommand, ClotheslineStatus } from "./firebase";
import { computeRainStatus, RainHistoryPoint } from "./lib/rain";

export default function Page() {
  const [status, setStatus] = useState<ClotheslineStatus | null>(null);
  const [history, setHistory] = useState<RainHistoryPoint[]>([]);
  const [lastRainStateChangeAt, setLastRainStateChangeAt] = useState<number>(
    Date.now()
  );
  const [lastAutoActionAt, setLastAutoActionAt] = useState<number>(0);
  const [enableAuto, setEnableAuto] = useState<boolean>(true);

  useEffect(() => {
    const unsub = listenStatus((data) => setStatus(data));
    return () => {
      // @ts-ignore unsubscribe function from onValue
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Maintain short history for rain computation (last 60s)
  useEffect(() => {
    if (!status) return;
    const point: RainHistoryPoint = {
      temperature: status.temperature ?? 0,
      humidity: status.humidity ?? 0,
      waterLevel: status.water_level ?? 0,
      ts: Date.now(),
    };
    setHistory((prev) => {
      const next = [...prev, point];
      const cutoff = Date.now() - 60_000;
      return next.filter((p) => p.ts >= cutoff);
    });
  }, [status?.temperature, status?.humidity, status?.water_level]);

  // Derived UI state from RTDB status (fallbacks keep original UI stable)
  const derived = useMemo(() => {
    const temperature = status?.temperature ?? 22.5;
    const humidity = status?.humidity ?? 65;
    const waterLevel = status?.water_level ?? 45;
    const ledStatus = (status?.led_indicator ?? "Connected") === "Connected";
    const motorRunning = (status?.motor_status ?? "STOPPED") === "RUNNING";
    const clotheslineStatus = (status?.clothesline_status ?? "Idle")
      .toLowerCase()
      .includes("extend")
      ? "extended"
      : (status?.clothesline_status ?? "Idle").toLowerCase().includes("retract")
      ? "retracted"
      : "retracted";
    // Delegate rain status computation to external function
    const rainPrediction = computeRainStatus(
      { temperature, humidity, waterLevel, timestamp: status?.timestamp },
      history
    );
    return {
      temperature,
      humidity,
      waterLevel,
      ledStatus,
      motorRunning,
      clotheslineStatus,
      rainPrediction,
    };
  }, [status, history]);

  // Track rainPrediction stability window
  useEffect(() => {
    setLastRainStateChangeAt(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derived.rainPrediction]);

  // Automation: retract/extend based on rain prediction with stability and cooldown
  useEffect(() => {
    if (!status) return;
    if (!enableAuto) return;
    if (derived.motorRunning) return;

    const STABILITY_MS = 10_000; // rain state must be stable for 10s
    const COOLDOWN_MS = 45_000; // min 45s between auto actions

    const now = Date.now();
    const rainStable = now - lastRainStateChangeAt >= STABILITY_MS;
    const cooldownReady = now - lastAutoActionAt >= COOLDOWN_MS;
    if (!rainStable || !cooldownReady) return;

    const shouldRetract =
      derived.rainPrediction && derived.clotheslineStatus === "extended";
    const shouldExtend =
      !derived.rainPrediction && derived.clotheslineStatus === "retracted";

    const run = async () => {
      try {
        if (shouldRetract) {
          await sendMotorCommand("RETRACT");
          setLastAutoActionAt(Date.now());
        } else if (shouldExtend) {
          await sendMotorCommand("EXTEND");
          setLastAutoActionAt(Date.now());
        }
      } catch {}
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    status?.timestamp,
    derived.rainPrediction,
    derived.clotheslineStatus,
    derived.motorRunning,
    lastRainStateChangeAt,
    lastAutoActionAt,
    enableAuto,
  ]);

  const handleExtend = async () => {
    await sendMotorCommand("EXTEND");
  };
  const handleRetract = async () => {
    await sendMotorCommand("RETRACT");
  };
  const handleStop = async () => {
    await sendMotorCommand("IDLE");
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
          Rain Detection & Clothesline System
        </h1>
        <p className="text-slate-600">Real-time monitoring and control</p>
      </div>

      {/* Status Overview */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* System Status Card */}
        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-3">
            System Status
          </h3>
          <div className="flex items-center gap-2">
            {derived.ledStatus ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-semibold text-slate-900">
              {derived.ledStatus ? "Active" : "Offline"}
            </span>
          </div>
          {/* Removed mock indicator now that backend mock server is used */}
        </div>

        {/* Rain Status Card */}
        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-3">
            Rain Status
          </h3>
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                derived.rainPrediction
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {derived.rainPrediction ? "Rain Expected" : "Clear"}
            </div>
          </div>
        </div>

        {/* Clothesline Status Card */}
        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-3">
            Clothesline
          </h3>
          <div className="flex items-center gap-2">
            <Zap
              className={`h-5 w-5 ${
                derived.motorRunning
                  ? "text-amber-500"
                  : derived.clotheslineStatus === "extended"
                  ? "text-emerald-500"
                  : "text-slate-400"
              }`}
            />
            <span className="font-semibold text-slate-900">
              {derived.motorRunning
                ? "Running..."
                : derived.clotheslineStatus === "extended"
                ? "Extended"
                : "Retracted"}
            </span>
          </div>
        </div>
      </div>

      {/* Sensor Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Temperature */}
        <div className="border border-slate-200 bg-white shadow-md hover:shadow-lg transition-shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-600">Temperature</h2>
            <div className="p-2 bg-red-50 rounded-lg">
              <Thermometer className="h-5 w-5 text-red-500" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-4xl font-bold text-slate-900">
              {derived.temperature.toFixed(1)}°C
            </p>
            <p className="text-sm text-slate-500">Current temperature</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all"
                style={{ width: `${(derived.temperature / 50) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Humidity */}
        <div className="border border-slate-200 bg-white shadow-md hover:shadow-lg transition-shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-600">Humidity</h2>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Droplets className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-4xl font-bold text-slate-900">
              {derived.humidity.toFixed(0)}%
            </p>
            <p className="text-sm text-slate-500">Relative humidity</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${derived.humidity}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Water Level */}
        <div className="border border-slate-200 bg-white shadow-md hover:shadow-lg transition-shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-600">Water Level</h2>
            <div className="p-2 bg-cyan-50 rounded-lg">
              <Droplets className="h-5 w-5 text-cyan-500" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-4xl font-bold text-slate-900">
              {derived.waterLevel.toFixed(0)}%
            </p>
            <p className="text-sm text-slate-500">Tank capacity</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all"
                style={{ width: `${derived.waterLevel}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Motor Control Section */}
      <div className="border border-slate-700 bg-linear-to-br from-slate-900 to-slate-800 shadow-lg mb-8 rounded-lg p-6">
        <div className="mb-4">
          <h2 className="text-white flex items-center gap-2 text-lg font-semibold">
            <Zap className="h-5 w-5" />
            Clothesline Motor Control
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Extend or retract the clothesline with a single tap
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center justify-between md:col-span-3 mb-2">
            <span className="text-sm text-slate-300">Automation</span>
            <button
              onClick={() => setEnableAuto((v) => !v)}
              aria-pressed={enableAuto}
              className={`relative inline-flex items-center transition-all select-none rounded-full w-24 h-9 px-1 ${
                enableAuto ? "bg-emerald-500" : "bg-orange-500"
              }`}
            >
              {/* Label positioned away from knob to avoid overlap */}
              <span
                className={`absolute text-xs font-semibold text-white ${
                  enableAuto ? "left-4" : "right-4"
                }`}
              >
                {enableAuto ? "ON" : "OFF"}
              </span>
              {/* Knob */}
              <span
                className={`absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow-md transition-transform ${
                  enableAuto ? "translate-x-14" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <button
            onClick={handleExtend}
            disabled={
              derived.motorRunning || derived.clotheslineStatus === "extended"
            }
            className={`h-16 text-lg font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              derived.motorRunning || derived.clotheslineStatus === "extended"
                ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg cursor-pointer"
            }`}
          >
            <Play className="h-5 w-5" />
            Extend
          </button>

          <button
            onClick={handleStop}
            disabled={!derived.motorRunning}
            className={`h-16 text-lg font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              derived.motorRunning
                ? "bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer"
                : "bg-slate-600 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Square className="h-5 w-5" />
            Stop
          </button>

          <button
            onClick={handleRetract}
            disabled={
              derived.motorRunning || derived.clotheslineStatus === "retracted"
            }
            className={`h-16 text-lg font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              derived.motorRunning || derived.clotheslineStatus === "retracted"
                ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                : "bg-orange-600 hover:bg-orange-700 text-white shadow-lg cursor-pointer"
            }`}
          >
            <Square className="h-5 w-5" />
            Retract
          </button>
        </div>

        {/* Motor Status Indicator */}
        <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full animate-pulse ${
                  derived.motorRunning ? "bg-emerald-500" : "bg-slate-500"
                }`}
              ></div>
              <span className="text-white font-medium">
                Motor:{" "}
                <span
                  className={
                    derived.motorRunning ? "text-emerald-400" : "text-slate-400"
                  }
                >
                  {derived.motorRunning ? "RUNNING" : "STOPPED"}
                </span>
              </span>
            </div>
            <Radio
              className={`h-5 w-5 ${
                derived.motorRunning ? "text-emerald-400" : "text-slate-500"
              }`}
            />
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-sm font-medium text-slate-600 mb-4">
            LED Indicator
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-4 w-4 rounded-full ${
                  derived.ledStatus ? "bg-emerald-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-slate-700 font-medium">
                {derived.ledStatus ? "Connected" : "Disconnected"}
              </span>
            </div>
            <span className="text-xs text-slate-500">Live</span>
          </div>
        </div>

        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-sm font-medium text-slate-600 mb-4">
            Last Update
          </h3>
          <p className="text-slate-700 font-medium">
            {status?.timestamp
              ? new Date(status.timestamp).toLocaleString()
              : "Unknown"}
          </p>
          <p className="text-xs text-slate-500">
            Auto-refresh via Firebase RTDB
          </p>
        </div>
      </div>
    </main>
  );
}
