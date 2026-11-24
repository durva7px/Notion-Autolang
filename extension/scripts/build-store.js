// Builds the zip to upload to the Chrome Web Store: `npm run build:store`.
//
// The manifest in the repo is for development (it lets the extension talk to
// a backend on localhost). The store copy drops local hosts, and the build
// refuses to run if it would ship something that isn't ready: a local
// API_URL, a backend missing from host_permissions, or missing icons.
// Output: extension/dist/notion-autolang-<version>.zip (git-ignored).

import { crc32, deflateRawSync } from 'node:zlib'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])([:/]|$)/
const REQUIRED_ICON_SIZES = ['16', '48', '128']
const SHIPPED_DIRS = ['src/', 'icons/']

/** The manifest as the store gets it: no local development hosts. */
export function storeManifest(manifest) {
  return {
    ...manifest,
    host_permissions: (manifest.host_permissions ?? []).filter(host => !LOCAL_HOST.test(host)),
  }
}

/** Reasons the build isn't ready for the store; empty when it is. */
export function checkStoreBuild({ manifest, configSource, files }) {
  const problems = []
  const store = storeManifest(manifest)

  const apiUrl = configSource.match(/API_URL\s*=\s*['"`]([^'"`]+)['"`]/)?.[1]
  if (!apiUrl) {
    problems.push('Could not find API_URL in src/config.js.')
  } else if (LOCAL_HOST.test(apiUrl)) {
    problems.push(`API_URL in src/config.js points at ${apiUrl}; set it to the deployed backend (localhost won't work for users).`)
  } else {
    const origin = new URL(apiUrl).origin
    if (!store.host_permissions.includes(`${origin}/*`)) {
      problems.push(`Add "${origin}/*" to host_permissions in manifest.json, or the extension can't reach the backend.`)
    }
  }

  const missingSizes = REQUIRED_ICON_SIZES.filter(size => !manifest.icons?.[size])
  if (missingSizes.length > 0) {
    problems.push(`manifest.json "icons" needs ${missingSizes.join(', ')} px entries.`)
  }
  for (const path of new Set(Object.values(manifest.icons ?? {}))) {
    if (!files.includes(path)) problems.push(`Icon file ${path} is missing.`)
  }

  return problems
}

/** The files that go in the zip: the manifest, src/ and icons/; never tests or tooling. */
export function packageFiles(allFiles) {
  return allFiles.filter(file => file === 'manifest.json' || SHIPPED_DIRS.some(dir => file.startsWith(dir)))
}

/**
 * A plain zip (deflate, UTF-8 names, forward-slash paths) from [{ name, data }].
 * Timestamps are fixed, so the same files always give the same zip.
 */
export function createZip(entries) {
  const DOS_TIME = 0
  const DOS_DATE = (0 << 9) | (1 << 5) | 1 // 1980-01-01
  const UTF8 = 0x0800
  const locals = []
  const centrals = []
  let offset = 0

  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, 'utf8')
    const compressed = deflateRawSync(data)
    const crc = crc32(data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(UTF8, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(DOS_TIME, 10)
    local.writeUInt16LE(DOS_DATE, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    locals.push(local, nameBytes, compressed)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(UTF8, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(DOS_TIME, 12)
    central.writeUInt16LE(DOS_DATE, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBytes.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBytes)

    offset += local.length + nameBytes.length + compressed.length
  }

  const centralDirectory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)

  return Buffer.concat([...locals, centralDirectory, end])
}

function listFiles(root, dir = root) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : listFiles(root, path)
    return [relative(root, path).split(sep).join('/')]
  })
}

function build() {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'))
  const files = packageFiles(listFiles(root))

  const problems = checkStoreBuild({
    manifest,
    configSource: readFileSync(join(root, 'src/config.js'), 'utf8'),
    files,
  })
  if (problems.length > 0) {
    console.error(`Not ready for the Chrome Web Store:\n- ${problems.join('\n- ')}`)
    process.exit(1)
  }

  const entries = files.map(name => ({
    name,
    data: name === 'manifest.json'
      ? Buffer.from(JSON.stringify(storeManifest(manifest), null, 2) + '\n')
      : readFileSync(join(root, name)),
  }))

  mkdirSync(join(root, 'dist'), { recursive: true })
  const out = join(root, 'dist', `notion-autolang-${manifest.version}.zip`)
  writeFileSync(out, createZip(entries))
  console.log(`Wrote ${relative(process.cwd(), out)} (${entries.length} files). Upload it in the Chrome Web Store dashboard.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) build()
