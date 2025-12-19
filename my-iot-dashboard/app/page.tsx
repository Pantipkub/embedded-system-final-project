"use client"

import { useState, useEffect } from "react"
import { Cloud, Droplets, Thermometer, Zap, Radio, AlertCircle, CheckCircle2, Play, Square, Sun, CloudRain } from "lucide-react"
import { listenStatus, sendMotorCommand, ClotheslineStatus } from "./firebase"

export default function Page() {
  const [status, setStatus] = useState<ClotheslineStatus | null>(null)
  const [motorRunning, setMotorRunning] = useState(false)

  // Listen to Firebase for real-time data
  useEffect(() => {
    console.log("Page mounted, calling listenStatus")
    const unsub = listenStatus((data) => {
      console.log("Received status from Firebase:", data)
      setStatus(data)
    })
    
    return () => {
      if (typeof unsub === "function") unsub()
    }
  }, [])

  // Derived state from Firebase data
  const clotheslineStatus = status?.clothesline_status?.toLowerCase().includes("extend") ? "extended" : "retracted"
  const temperature = status?.temperature ?? 22.5
  const humidity = status?.humidity ?? 65
  const rawWaterLevel = status?.water ?? 45
  const waterLevel = scaleWaterLevel(rawWaterLevel)
  const rawLdr = status?.ldr ?? 65
  const ldr = scaleLDR(rawLdr)
  const ledStatus = (status?.led_indicator ?? "Connected") === "Connected"

  const handleExtend = async () => {
    if (motorRunning || clotheslineStatus === "extended") return
    setMotorRunning(true)
    try {
      await sendMotorCommand("EXTEND")
    } catch (error) {
      console.error("Failed to extend:", error)
    }
    setMotorRunning(false)
  }

  const handleRetract = async () => {
    if (motorRunning || clotheslineStatus === "retracted") return
    setMotorRunning(true)
    try {
      await sendMotorCommand("RETRACT")
    } catch (error) {
      console.error("Failed to retract:", error)
    }
    setMotorRunning(false)
  }

  const handleStop = async () => {
    try {
      await sendMotorCommand("IDLE")
    } catch (error) {
      console.error("Failed to stop:", error)
    }
    setMotorRunning(false)
  }

  function scaleWaterLevel(raw: number) {
    const min = 0    // brightest  
    const max = 3600 // darkest

    const clamped = Math.min(Math.max(raw, min), max)

    const percent = Math.abs(100 - (max - clamped) / (max - min) * 100)
    return percent
  }

  function scaleLDR(raw: number) {
    const min = 0    // brightest  
    const max = 1600 // darkest

    const clamped = Math.min(Math.max(raw, min), max)

    const percent = ((max - clamped) / (max - min)) * 100
    return percent
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Rain Detection & Clothesline System</h1>
        <p className="text-slate-600">Real-time monitoring and control</p>
      </div>

      {/* Status Overview */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* System Status Card */}
        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-3">System Status</h3>
          <div className="flex items-center gap-2">
            {ledStatus ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-semibold text-slate-900">{ledStatus ? "Active" : "Offline"}</span>
          </div>
        </div>

        {/* Rain Status Card */}
        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-3">Rain Status</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
            {clotheslineStatus == 'retracted' ? (
              <CloudRain className="h-5 w-5 text-blue-500" />
            ) : (
              <Sun className="h-5 w-5 text-yellow-500" />
            )}
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                clotheslineStatus == 'retracted' ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {clotheslineStatus == 'retracted' ? "Raining" : "Clear"}
            </div>
          </div>
          </div>
        </div>

        {/* Clothesline Status Card */}
        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-3">Clothesline</h3>
          <div className="flex items-center gap-2">
            <Zap
              className={`h-5 w-5 ${motorRunning ? "text-amber-500" : clotheslineStatus === "extended" ? "text-emerald-500" : "text-slate-400"}`}
            />
            <span className="font-semibold text-slate-900">
              {motorRunning ? "Running..." : clotheslineStatus === "extended" ? "Extended" : "Retracted"}
            </span>
          </div>
        </div>
      </div>

      {/* Sensor Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Temperature */}
        <div className="border border-slate-200 bg-white shadow-md hover:shadow-lg transition-shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-600">Temperature</h2>
            <div className="p-2 bg-red-50 rounded-lg">
              <Thermometer className="h-5 w-5 text-red-500" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-4xl font-bold text-slate-900">{temperature.toFixed(1)}°C</p>
            <p className="text-sm text-slate-500">Current temperature</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all"
                style={{ width: `${(temperature / 50) * 100}%` }}
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
            <p className="text-4xl font-bold text-slate-900">{humidity.toFixed(0)}%</p>
            <p className="text-sm text-slate-500">Relative humidity</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${humidity}%` }}
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
            <p className="text-4xl font-bold text-slate-900">{waterLevel.toFixed(0)}%</p>
            <p className="text-sm text-slate-500">Tank capacity</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all"
                style={{ width: `${waterLevel}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Light Brightness */}
        <div className="border border-slate-200 bg-white shadow-md hover:shadow-lg transition-shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-600">Light</h2>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Sun className="h-5 w-5 text-yellow-500" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-4xl font-bold text-slate-900">{ldr.toFixed(0)}%</p>
            <p className="text-sm text-slate-500">Light intensity</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{ width: `${ldr}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Motor Control Section */}
      <div className="border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-lg mb-8 rounded-lg p-6">
        <div className="mb-4">
          <h2 className="text-white flex items-center gap-2 text-lg font-semibold">
            <Zap className="h-5 w-5" />
            Clothesline Motor
          </h2>
          {/* <p className="text-slate-400 text-sm mt-1">Extend or retract the clothesline with a single tap</p> */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            // onClick={handleExtend}
            disabled={motorRunning || clotheslineStatus === "retracted"}
            className={`h-16 text-lg font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              motorRunning || clotheslineStatus === "retracted"
                ? "bg-slate-600 text-slate-400"
                : "bg-emerald-600 text-white shadow-lg"
            }`}
          >
            <Play className="h-5 w-5" />
            Extended
          </button>

          {/* <button
            // onClick={handleStop}
            disabled={!motorRunning}
            className={`h-16 text-lg font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              motorRunning
                ? "bg-red-600 hover:bg-red-700 text-white shadow-lg"
                : "bg-slate-600 text-slate-400"
            }`}
          >
            <Square className="h-5 w-5" />
            Stop
          </button> */}

          <button
            // onClick={handleRetract}
            disabled={motorRunning || clotheslineStatus === "extended"}
            className={`h-16 text-lg font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              motorRunning || clotheslineStatus === "extended"
                ? "bg-slate-600 text-slate-400"
                : "bg-orange-600 text-white shadow-lg"
            }`}
          >
            <Square className="h-5 w-5" />
            Retracted
          </button>
        </div>

        {/* Motor Status Indicator */}
        {/* <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full animate-pulse ${motorRunning ? "bg-emerald-500" : "bg-slate-500"}`}
              ></div>
              <span className="text-white font-medium">
                Motor:{" "}
                <span className={motorRunning ? "text-emerald-400" : "text-slate-400"}>
                  {motorRunning ? "RUNNING" : "STOPPED"}
                </span>
              </span>
            </div>
            <Radio className={`h-5 w-5 ${motorRunning ? "text-emerald-400" : "text-slate-500"}`} />
          </div>
        </div> */}
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-sm font-medium text-slate-600 mb-4">LED Indicator</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-4 w-4 rounded-full ${ledStatus ? "bg-emerald-500" : "bg-red-500"}`}></div>
              <span className="text-slate-700 font-medium">{ledStatus ? "Connected" : "Disconnected"}</span>
            </div>
            <span className="text-xs text-slate-500">Live</span>
          </div>
        </div>

        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-sm font-medium text-slate-600 mb-4">Last Update</h3>
          <p className="text-slate-700 font-medium">
            {status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : "Unknown"}
          </p>
          <p className="text-xs text-slate-500">Auto-refresh via Firebase RTDB</p>
        </div>
      </div>
    </main>
  )
}
