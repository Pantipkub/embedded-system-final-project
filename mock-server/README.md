# Clothesline Mock Backend Server

Simple Express server using Firebase Web SDK to write mock data to Firebase Realtime Database, matching the project spec.

## Prerequisites

- RTDB enabled in your Firebase project.

## Setup

1. Install deps:

```
cd mock-server
npm install
```

## Run

Start the server:

```
npm run start
```

Begin writing status every `INTERVAL_MS`:

```
Invoke-RestMethod -Method Post -Uri http://localhost:4000/start
```

Stop writing:

```
Invoke-RestMethod -Method Post -Uri http://localhost:4000/stop
```

Send a command (updates `/clothesline/command/motor`):

```
Invoke-RestMethod -Method Post -Uri http://localhost:4000/command/EXTEND
Invoke-RestMethod -Method Post -Uri http://localhost:4000/command/RETRACT
Invoke-RestMethod -Method Post -Uri http://localhost:4000/command/IDLE
```

## Data written

- Status path: `/clothesline/status`
- Command path: `/clothesline/command` with `motor` and server `updatedAt`

Status payload example:

```
{
  "system_status": "Active",
  "temperature": 29.7,
  "humidity": 77,
  "water_level": 54,
  "clothesline_status": "Idle",
  "motor_status": "STOPPED",
  "led_indicator": "Connected",
  "timestamp": "2025-12-06T15:00:00Z"
}
```
