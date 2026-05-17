#!/usr/bin/env node
// Generates resources/icons/{app,tray-<status>}.ico
//
// Why this script lives here:
//   The Claude Design package ships icon designs as React/SVG components that
//   reference effects librsvg cannot rasterize (drop-shadow filters, etc.).
//   We re-author the same visual recipe here using only librsvg-friendly
//   primitives (gradients + manually-layered blurred shapes for glow), then
//   pipe through sharp -> png-to-ico to produce multi-size Windows .ico files.
//
// Run: npm run build:icons

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'resources', 'icons')

const STATUS = {
  green:  { hex: '#22D69A' },
  yellow: { hex: '#F0B72B' },
  orange: { hex: '#FF8A47' },
  red:    { hex: '#FF5D6B' },
  gray:   { hex: '#7C8493' }
}

// --- AppIcon SVG (full app icon — rounded-rect surface w/ heartbeat) ------
function appIconSvg(size, status) {
  const hex = STATUS[status].hex
  const r = size * 0.22
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#1A1F2E"/>
      <stop offset="0.6" stop-color="#0C0F18"/>
      <stop offset="1" stop-color="#070914"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="55%" r="60%">
      <stop offset="0" stop-color="${hex}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="${hex}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rim" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.4"/>
      <stop offset="0.6" stop-color="#fff" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0.12"/>
    </linearGradient>
    <linearGradient id="line" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0.95"/>
      <stop offset="0.6" stop-color="${hex}"/>
      <stop offset="1" stop-color="${hex}" stop-opacity="0.85"/>
    </linearGradient>
    <radialGradient id="dot" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${hex}" stop-opacity="0.9"/>
      <stop offset="0.5" stop-color="${hex}" stop-opacity="0.3"/>
      <stop offset="1" stop-color="${hex}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="${r}" fill="url(#rim)"/>
  <rect x="3" y="3" width="${size - 6}" height="${size - 6}" rx="${r - 2}" fill="url(#bg)"/>
  <rect x="3" y="3" width="${size - 6}" height="${size - 6}" rx="${r - 2}" fill="url(#glow)"/>
  ${heartbeatTrace(size, hex)}
  ${pulseDot(size, hex)}
</svg>`
}

// Heartbeat trace centered vertically. Two layers: wide low-opacity halo + main stroke.
function heartbeatTrace(size, hex) {
  const tx = size * 0.12
  const ty = size * 0.5
  const stroke = Math.max(2, size * 0.05)
  const halo = stroke * 3.2
  const d = `M0 0 L${size * 0.13} 0 L${size * 0.18} ${-size * 0.16} L${size * 0.26} ${size * 0.22} L${size * 0.33} ${-size * 0.28} L${size * 0.4} ${size * 0.18} L${size * 0.48} ${-size * 0.1} L${size * 0.54} 0 L${size * 0.76} 0`
  return `<g transform="translate(${tx} ${ty})">
    <path d="${d}" stroke="${hex}" stroke-opacity="0.35" stroke-width="${halo}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${d}" stroke="url(#line)" stroke-width="${stroke}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
  </g>`
}

function pulseDot(size, hex) {
  const cx = size * 0.78
  const cy = size * 0.26
  const haloR = size * 0.13
  const coreR = size * 0.055
  const dotR = size * 0.024
  return `<circle cx="${cx}" cy="${cy}" r="${haloR}" fill="url(#dot)"/>
    <circle cx="${cx}" cy="${cy}" r="${coreR}" fill="${hex}"/>
    <circle cx="${cx}" cy="${cy}" r="${dotR}" fill="#fff" fill-opacity="0.9"/>`
}

// --- TrayIcon SVG --------------------------------------------------------
// 16px: glowy core dot only (heartbeat trace is illegible at that scale).
// 32px+: heartbeat trace + halo, no rounded-rect background (tray icons sit
// on the OS taskbar; transparent BG reads better than a hard square).
function trayIconSvg(size, status) {
  const hex = STATUS[status].hex
  if (size <= 16) {
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="rd" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${hex}" stop-opacity="1"/>
      <stop offset="0.55" stop-color="${hex}" stop-opacity="1"/>
      <stop offset="0.8" stop-color="${hex}" stop-opacity="0.4"/>
      <stop offset="1" stop-color="${hex}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.46}" fill="url(#rd)"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.22}" fill="#fff" fill-opacity="0.95"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.22}" fill="${hex}" fill-opacity="0.85"/>
</svg>`
  }
  const stroke = Math.max(2, size * 0.09)
  const halo = stroke * 2.4
  const d = `M${size * 0.16} ${size * 0.55} L${size * 0.3} ${size * 0.55} L${size * 0.36} ${size * 0.3} L${size * 0.46} ${size * 0.78} L${size * 0.56} ${size * 0.22} L${size * 0.66} ${size * 0.55} L${size * 0.84} ${size * 0.55}`
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="50%" cy="55%" r="60%">
      <stop offset="0" stop-color="${hex}" stop-opacity="0.6"/>
      <stop offset="1" stop-color="${hex}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.48}" fill="url(#glow)"/>
  <path d="${d}" stroke="${hex}" stroke-opacity="0.45" stroke-width="${halo}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="${d}" stroke="${hex}" stroke-width="${stroke}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`
}

async function svgToPng(svg, size) {
  return sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

async function buildApp() {
  const sizes = [16, 32, 48, 64, 128, 256]
  const status = 'green'
  const pngs = await Promise.all(sizes.map(s => svgToPng(appIconSvg(s, status), s)))
  const ico = await pngToIco(pngs)
  await writeFile(join(OUT_DIR, 'app.ico'), ico)
  // Also keep PNGs around for documentation / future macOS/Linux packaging
  for (let i = 0; i < sizes.length; i++) {
    await writeFile(join(OUT_DIR, `app-${sizes[i]}.png`), pngs[i])
  }
  console.log(`✓ app.ico (${sizes.join(', ')})`)
}

async function buildTray() {
  const sizes = [16, 32]
  for (const status of Object.keys(STATUS)) {
    const pngs = await Promise.all(sizes.map(s => svgToPng(trayIconSvg(s, status), s)))
    const ico = await pngToIco(pngs)
    await writeFile(join(OUT_DIR, `tray-${status}.ico`), ico)
    for (let i = 0; i < sizes.length; i++) {
      await writeFile(join(OUT_DIR, `tray-${status}-${sizes[i]}.png`), pngs[i])
    }
    console.log(`✓ tray-${status}.ico (${sizes.join(', ')})`)
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  await buildApp()
  await buildTray()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
