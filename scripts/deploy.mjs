#!/usr/bin/env node
// Builds PingPulse, packages it to a portable win-unpacked directory,
// copies the result to %LOCALAPPDATA%\Programs\PingPulse, and launches it.
//
// Usage:
//   npm run deploy                      # build, copy, and launch
//
// Autostart is owned entirely by the app itself: toggle "Launch on Windows
// startup" in Settings, which writes the HKCU Run entry via Electron's
// setLoginItemSettings (registry value "com.pingpulse.app"). This script no
// longer writes its own Run entry, and removes the legacy "PingPulse" one if
// a previous --autostart deploy left it behind.

import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir, platform } from 'node:os'
import { exit, cwd, env } from 'node:process'

if (platform() !== 'win32') {
  console.error('deploy.mjs currently supports Windows only.')
  exit(1)
}

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

// On Windows without Developer Mode or admin rights, 7za can't create the
// symlinks bundled in winCodeSign-*.7z (the macOS libcrypto/libssl dylibs),
// which makes electron-builder loop forever re-downloading the archive.
// We pre-extract the archive while excluding those two symlink entries
// (harmless — they're macOS-only and unused for a Windows --dir build) and
// park it at the cache name electron-builder expects, so it skips its own
// failing extraction.
function primeWinCodeSignCache() {
  const cacheDir = join(localAppData, 'electron-builder', 'Cache', 'winCodeSign')
  const expectedName = 'winCodeSign-2.6.0'
  const expectedPath = join(cacheDir, expectedName)
  if (existsSync(join(expectedPath, 'windows-10'))) return // already primed

  console.log('\n› Priming winCodeSign cache (workaround for Windows symlink restriction)')

  const sevenZip = resolve(projectRoot, 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe')
  if (!existsSync(sevenZip)) {
    console.error(`  7za.exe not found at ${sevenZip}`)
    exit(1)
  }

  mkdirSync(cacheDir, { recursive: true })

  // Reuse any leftover .7z in the cache; otherwise download a fresh one.
  let archive = null
  for (const name of readdirSync(cacheDir)) {
    const p = join(cacheDir, name)
    if (name.toLowerCase().endsWith('.7z') && statSync(p).isFile()) { archive = p; break }
  }
  if (!archive) {
    archive = join(cacheDir, `${expectedName}.7z`)
    const url = `https://github.com/electron-userland/electron-builder-binaries/releases/download/${expectedName}/${expectedName}.7z`
    console.log(`  downloading ${url}`)
    const dl = spawnSync('powershell.exe',
      ['-NoProfile', '-Command',
        `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ` +
        `Invoke-WebRequest -UseBasicParsing -Uri '${url}' -OutFile '${archive}'`],
      { stdio: 'inherit' })
    if (dl.status !== 0) {
      console.error('  Failed to download winCodeSign archive.')
      exit(dl.status ?? 1)
    }
  } else {
    console.log(`  reusing cached archive ${archive}`)
  }

  // Clean stale numeric temp dirs from prior failed attempts.
  for (const name of readdirSync(cacheDir)) {
    const p = join(cacheDir, name)
    if (/^\d+$/.test(name) && statSync(p).isDirectory()) {
      rmSync(p, { recursive: true, force: true })
    }
  }

  const stagingDir = join(cacheDir, `${expectedName}.staging`)
  if (existsSync(stagingDir)) rmSync(stagingDir, { recursive: true, force: true })

  // -x!: exclude the two symlink entries that fail without elevated rights.
  // -y: assume Yes on prompts. -bd: no progress indicator.
  const ex = spawnSync(sevenZip,
    ['x', '-bd', '-y',
      '-xr!libcrypto.dylib',
      '-xr!libssl.dylib',
      archive, `-o${stagingDir}`],
    { stdio: 'inherit' })
  if (ex.status !== 0) {
    console.error(`  7za extraction failed (exit ${ex.status})`)
    exit(ex.status ?? 1)
  }

  if (existsSync(expectedPath)) rmSync(expectedPath, { recursive: true, force: true })
  renameSync(stagingDir, expectedPath)
  console.log(`  primed ${expectedPath}`)
}

console.log('PingPulse deploy → ' + targetDir)

primeWinCodeSignCache()

run('npm', ['run', 'build'], 'Building renderer + main + preload')
run('npx', ['electron-builder', '--dir'], 'Packaging Electron app (--dir)')

if (!existsSync(buildSource)) {
  console.error(`Expected build output at ${buildSource} but it doesn't exist.`)
  exit(1)
}

// Windows locks the .exe of a running process, which would make the rmSync
// below fail partway through and leave a half-wiped install dir. Kill any
// running instance first; ignore exit code (128 = "not running" is fine).
console.log('\n› Stopping any running PingPulse instance')
spawnSync('taskkill', ['/IM', 'PingPulse.exe', '/F'], { stdio: 'ignore' })

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

// Autostart is owned solely by the app (Electron setLoginItemSettings, value
// "com.pingpulse.app"). Remove the legacy "PingPulse" Run entry that older
// --autostart deploys created, so only one mechanism controls login launch.
console.log('\n› Removing legacy autostart entry (if present)')
spawnSync('powershell.exe',
  ['-NoProfile', '-Command',
    `Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' ` +
    `-Name 'PingPulse' -ErrorAction SilentlyContinue`],
  { stdio: 'ignore' })

console.log('\n› Launching deployed app')
// spawn (not spawnSync) so we don't block waiting for the long-running app
// to exit. detached + stdio:'ignore' + unref let Node exit immediately.
const child = spawn(exePath, [], { detached: true, stdio: 'ignore' })
child.unref()

console.log('\nDone.')
console.log(`  Installed at:  ${targetDir}`)
console.log(`  Executable:    ${exePath}`)
console.log(`  Autostart:     controlled in-app via "Launch on Windows startup" (Settings)`)
console.log(`\nTo remove: npm run undeploy`)
