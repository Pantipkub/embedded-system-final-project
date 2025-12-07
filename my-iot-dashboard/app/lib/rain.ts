export type RainInput = {
  temperature: number;
  humidity: number;
  waterLevel?: number;
  timestamp?: string;
};

export type RainHistoryPoint = RainInput & { ts: number };

/**
 * computeRainStatus: Pluggable function to determine rain status.
 * Replace this logic later with real sensor fusion or model.
 *
 * Current heuristic:
 * - Uses a simple weighted check on the latest sample and optional short history average.
 */
export function computeRainStatus(
  latest: RainInput,
  history: RainHistoryPoint[] = []
): boolean {
  const h = latest.humidity ?? 0;
  const t = latest.temperature ?? 0;

  // Optional 10s window average humidity
  const now = Date.now();
  const windowMs = 10_000;
  const window = history.filter((p) => now - p.ts <= windowMs);
  const avgHumidity = window.length
    ? window.reduce((a, b) => a + b.humidity, 0) / window.length
    : h;

  // Basic rule: high humidity and moderate temp suggests rain
  const highHumidity = avgHumidity >= 75;
  const moderateTemp = t <= 30;
  return highHumidity && moderateTemp;
}
