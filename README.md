# PingPulse

A real-time heartbeat monitor for your internet connection. Replaces the manual `ping -t 8.8.8.8` workflow with a live dashboard: latency graph, packet-loss markers, color-coded health, multi-target monitoring, compact always-on-top overlay, and system tray.

## Run

```bash
npm install
npm run dev      # launches Electron + Vite dev server with HMR
```

To build for production:

```bash
npm run build
npm start        # previews the production build
```

No admin privileges required. Works on Windows out of the box; macOS and Linux supported via their system `ping`.

## Features

- Live latency graph with red markers on packet loss and an orange threshold line
- Multi-target monitoring (Google DNS, Cloudflare DNS, auto-detected local gateway, plus custom hosts)
- Current / Avg / Min / Max / Loss% / Jitter indicators
- 0–100 internet health score with a per-component breakdown (loss, latency, jitter, spikes)
- Color-coded status: green / yellow / orange / red
- Event timeline for spikes, packet loss, disconnects, and recoveries
- Native desktop notifications (debounced) for spikes / loss / down / recovered
- Dark mode by default
- Compact always-on-top overlay (current ping + color + loss% + sparkline)
- System tray: minimize to tray, status-colored icon, tooltip, pause/resume, quit
- Persistent settings (`electron-store`): interval, targets, thresholds, window size, toggles

## How it works

PingPulse spawns `ping -n 1 -w 2000 <host>` once per interval per target (Windows; equivalent flags on macOS / Linux). Each invocation is parsed for the RTT line; timeouts and unreachable responses become a `null` sample. Backpressure is built in — if a previous ping is still running when the next tick fires, that tick is skipped.

The renderer keeps a per-target rolling window of samples (capped at 4,000 entries each) and derives stats, status color, and health score in pure functions.

## Project layout

```
src/
  main/        Electron main process (ping engine, tray, IPC, notifications, settings)
  preload/     Typed contextBridge exposing window.pingpulse to the renderer
  shared/      Types, IPC channel names, thresholds — shared between main + renderer
  renderer/    React + Tailwind dashboard
    lib/      Pure helpers: stats, status, healthScore  (calibrate weights in healthScore.ts)
    state/    Zustand stores for samples + settings
    components/  Dashboard, LatencyGraph, EventTimeline, SettingsPanel, CompactOverlay, …
```

## Known limitations

- Windows `ping.exe` reports RTT only in whole milliseconds — sub-ms resolution isn't possible without raw ICMP sockets (which require elevation on Windows).
- "Connection down" is currently inferred from 3 consecutive timeouts on a target. Short-lived blips (1–2 timeouts) appear in the timeline as packet-loss events.
- The local gateway auto-detect uses the `default-gateway` package and is best-effort. If your gateway doesn't respond to ICMP it will simply appear as 100% loss.
- The tray icon is rendered programmatically (a colored disc). Drop a branded `tray-icon.png` into `resources/` and tweak `src/main/tray.ts` to use it.

## Calibration

PingPulse self-calibrates to your network. Instead of hard-coding what "bad" looks like, it learns each target's typical latency, jitter, and ambient packet loss and derives status thresholds as multiples of that baseline. The seed values in `src/shared/thresholds.ts` act as a floor — we never claim a connection is "great" at 600 ms even if that's your median.

- After **~500 samples** on a target (≈ 8 minutes at 1 Hz), the calibration kicks in.
- Latency thresholds become `max(seed, p95 × 1.2)` for "ok" and `max(seed, p95 × 2)` for "bad", with similar formulas for jitter and loss.
- Baseline state lives in `%APPDATA%\pingpulse\pingpulse-baseline.json` and persists across restarts.
- Once 50,000 samples accumulate per target, the histogram decays by half — so the baseline gradually adapts if your connection genuinely changes.
- The Settings panel shows live calibration status and the active thresholds per target.

The scoring weights (`loss > jitter > latency > spikes`) in `src/renderer/lib/healthScore.ts` are intentionally fixed; the per-network differences are absorbed by the calibrated thresholds.

## Deploy & autostart (Windows)

```bash
npm run deploy                       # build + copy to %LOCALAPPDATA%\Programs\PingPulse
npm run deploy -- --autostart        # also register HKCU Run for launch on login
npm run deploy -- --autostart --launch   # also launch the deployed app now
npm run undeploy                     # remove the deployed copy + autostart entry
npm run undeploy -- --wipe-data      # also delete %APPDATA%\pingpulse user data
```

`--autostart` writes `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\PingPulse` pointing at the installed `PingPulse.exe --hidden`. You can also toggle "Launch on Windows startup" in the in-app Settings panel — it uses Electron's `setLoginItemSettings` which writes the same registry value.

The `--hidden` flag tells PingPulse to start without showing the main window. Combine with the existing settings — both adjustable from the UI:
- **Start minimized to tray** — lives only in the tray icon until you click it.
- **Compact overlay mode** — always-on-top mini display still appears.

## Replacing the UI with a Claude Design export

The UI is intentionally split so it can be swapped for a Claude Design React/HTML export:

- All presentational components live in `src/renderer/components/` and are pure functions of props — no IPC inside them.
- Two container components own the data: `Dashboard.tsx` (full window) and `CompactOverlay.tsx` (overlay). To replace the look, swap those two files (and their leaf components) — the data shape (stats, samples, settings, health) is already established and lives in `src/renderer/lib/` and `src/renderer/state/`.
- Tailwind color tokens for the four status colors live in `tailwind.config.js` under `theme.extend.colors.status`, and matching hex values in `src/shared/thresholds.ts`. Keep them in sync.

## Future improvements

- Aggregate samples older than the rolling window into 1-minute buckets for cheap 24h history.
- Distinguish local-network vs WAN issues by comparing gateway-ping vs DNS-ping in the alert detector.
- JSON / CSV export of session logs and the calibration baseline.
- Swap Recharts for uPlot if many targets at sub-second intervals strain the renderer.
- Add per-status branded tray icons and a real app icon for packaging.
