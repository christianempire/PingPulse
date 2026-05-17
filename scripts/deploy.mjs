#!/usr/bin/env node
// Builds PingPulse, packages it to a portable win-unpacked directory,
// copies the result to %LOCALAPPDATA%\Programs\PingPulse, optionally
// registers it for Windows autostart, and (optionally) launches it.
//
// Usage:
//   npm run deploy                      # build + copy (does NOT touch autostart)
//   npm run deploy -- --autostart       # also write the HKCU Run entry
//   npm run deploy -- --launch          # also launch the deployed app now
//   npm run deploy -- --autostart --launch

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir, platform } from 'node:os'
import { argv, exit, cwd, env } from 'node:process'

if (platform() !== 'win32') {
  console.error('deploy.mjs currently supports Windows only.')
  exit(1)
}

const flags = new Set(argv.slice(2))
const doAutostart = flags.has('--autostart')
const doLaunch = flags.has('--launch')

const localAppData = env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
const targetDir = join(localAppData, 'Programs', 'PingPulse')
const projectRoot = cwd()
const buildSource = resolve(projectRoot, 'release', 'win-unpacked')

function run(cmd, args, label) {
  console.log(`\n› ${label}`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd: projectRoot })
  if (r.status !== 0) {
    console.error(`  ${label} failed (exit ${r.status})`)
    exit(r.status ?? 1)
  }
}

console.log('PingPulse deploy → ' + targetDir)

run('npm', ['run', 'build'], 'Building renderer + main + preload')
run('npx', ['electron-builder', '--dir'], 'Packaging Electron app (--dir)')

if (!existsSync(buildSource)) {
  console.error(`Expected build output at ${buildSource} but it doesn't exist.`)
  exit(1)
}

console.log(`\n› Copying to ${targetDir}`)
if (existsSync(targetDir)) {
  rmSync(targetDir, { recursive: true, force: true })
}
mkdirSync(targetDir, { recursive: true })
cpSync(buildSource, targetDir, { recursive: true })

const exePath = join(targetDir, 'PingPulse.exe')
if (!existsSync(exePath)) {
  console.error(`PingPulse.exe not found at ${exePath} after copy.`)
  exit(1)
}

if (doAutostart) {
  console.log('\n› Registering Windows autostart (HKCU Run)')
  const psCmd = `New-Item -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Force | Out-Null; ` +
    `Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'PingPulse' -Value '"${exePath}" --hidden'`
  const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', psCmd], { stdio: 'inherit' })
  if (r.status !== 0) {
    console.error('  Failed to write autostart registry entry.')
    exit(r.status ?? 1)
  }
}

if (doLaunch) {
  console.log('\n› Launching deployed app (hidden)')
  spawnSync(exePath, ['--hidden'], { detached: true, stdio: 'ignore' }).unref?.()
}

console.log('\nDone.')
console.log(`  Installed at:  ${targetDir}`)
console.log(`  Executable:    ${exePath}`)
if (doAutostart) {
  console.log(`  Autostart:     enabled (HKCU Run "PingPulse")`)
} else {
  console.log(`  Autostart:     not changed. Re-run with --autostart, or toggle "Launch on Windows startup" in Settings.`)
}
console.log(`\nTo remove: npm run undeploy`)
