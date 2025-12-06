"use client"

import { useState, useEffect } from "react"
import { Cloud, Droplets, Thermometer, Zap, Radio, AlertCircle, CheckCircle2, Play, Square } from "lucide-react"

export default function Page() {
  const [clotheslineStatus, setClotheslineStatus] = useState("retracted") // "extended" or "retracted"
  const [motorRunning, setMotorRunning] = useState(false)
  const [motorTimer, setMotorTimer] = useState<NodeJS.Timeout | null>(null)

  const [sensorData, setSensorData] = useState({
    temperature: 22.5,
    humidity: 65,
    waterLevel: 45,
    rainPrediction: true,
    ledStatus: true,
  })

  // Simulate real-time sensor updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData((prev) => ({
        ...prev,
        temperature: 20 + Math.random() * 12,
        humidity: 50 + Math.random() * 40,
        waterLevel: 30 + Math.random() * 50,
        rainPrediction: Math.random() > 0.4,
        ledStatus: Math.random() > 0.2,
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const handleExtend = () => {
    if (motorRunning || clotheslineStatus === "extended") return

    setMotorRunning(true)

    // Motor runs for 3 seconds, then stops and sets status to extended
    const timer = setTimeout(() => {
      setMotorRunning(false)
      setClotheslineStatus("extended")
      setMotorTimer(null)
    }, 3000)

    setMotorTimer(timer)
  }

  const handleRetract = () => {
    if (motorRunning || clotheslineStatus === "retracted") return

    setMotorRunning(true)

    // Motor runs for 3 seconds, then stops and sets status to retracted
    const timer = setTimeout(() => {
      setMotorRunning(false)
      setClotheslineStatus("retracted")
      setMotorTimer(null)
    }, 3000)

    setMotorTimer(timer)
  }

  const handleStop = () => {
    if (motorTimer) {
      clearTimeout(motorTimer)
      setMotorTimer(null)
    }
    setMotorRunning(false)
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
            {sensorData.ledStatus ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-semibold text-slate-900">{sensorData.ledStatus ? "Active" : "Offline"}</span>
          </div>
        </div>

        {/* Rain Status Card */}
        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-3">Rain Status</h3>
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                sensorData.rainPrediction ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-700"
              }`}
            >
              {sensorData.rainPrediction ? "Rain Expected" : "Clear"}
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
            <p className="text-4xl font-bold text-slate-900">{sensorData.temperature.toFixed(1)}°C</p>
            <p className="text-sm text-slate-500">Current temperature</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all"
                style={{ width: `${(sensorData.temperature / 50) * 100}%` }}
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
            <p className="text-4xl font-bold text-slate-900">{sensorData.humidity.toFixed(0)}%</p>
            <p className="text-sm text-slate-500">Relative humidity</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${sensorData.humidity}%` }}
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
            <p className="text-4xl font-bold text-slate-900">{sensorData.waterLevel.toFixed(0)}%</p>
            <p className="text-sm text-slate-500">Tank capacity</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all"
                style={{ width: `${sensorData.waterLevel}%` }}
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
            Clothesline Motor Control
          </h2>
          <p className="text-slate-400 text-sm mt-1">Extend or retract the clothesline with a single tap</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={handleExtend}
            disabled={motorRunning || clotheslineStatus === "extended"}
            className={`h-16 text-lg font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              motorRunning || clotheslineStatus === "extended"
                ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg cursor-pointer"
            }`}
          >
            <Play className="h-5 w-5" />
            Extend
          </button>

          <button
            onClick={handleStop}
            disabled={!motorRunning}
            className={`h-16 text-lg font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              motorRunning
                ? "bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer"
                : "bg-slate-600 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Square className="h-5 w-5" />
            Stop
          </button>

          <button
            onClick={handleRetract}
            disabled={motorRunning || clotheslineStatus === "retracted"}
            className={`h-16 text-lg font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              motorRunning || clotheslineStatus === "retracted"
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
        </div>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-sm font-medium text-slate-600 mb-4">LED Indicator</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-4 w-4 rounded-full ${sensorData.ledStatus ? "bg-emerald-500" : "bg-red-500"}`}></div>
              <span className="text-slate-700 font-medium">{sensorData.ledStatus ? "Connected" : "Disconnected"}</span>
            </div>
            <span className="text-xs text-slate-500">Live</span>
          </div>
        </div>

        <div className="border border-slate-200 bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-sm font-medium text-slate-600 mb-4">Last Update</h3>
          <p className="text-slate-700 font-medium">Just now</p>
          <p className="text-xs text-slate-500">Auto-refresh every 2 seconds</p>
        </div>
      </div>
    </main>
  )
}
