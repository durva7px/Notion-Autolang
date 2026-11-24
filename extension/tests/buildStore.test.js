import { describe, it, expect } from 'vitest'
import { inflateRawSync } from 'node:zlib'
import { storeManifest, checkStoreBuild, packageFiles, createZip } from '../scripts/build-store.js'

const API = 'https://abc123.execute-api.ap-southeast-2.amazonaws.com'

const MANIFEST = {
  manifest_version: 3,
  name: 'Notion AutoLang',
  version: '0.3.0',
  icons: { 16: 'icons/icon-16.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
  host_permissions: [
    'http://localhost:3000/*',
    'http://127.0.0.1:3000/*',
    'https://www.notion.so/*',
    `${API}/*`,
  ],
}

const CONFIG = `export const API_URL = '${API}'\n`
const FILES = ['manifest.json', 'src/background.js', 'icons/icon-16.png', 'icons/icon-48.png', 'icons/icon-128.png']

describe('store manifest', () => {
  it('drops local development hosts from host_permissions', () => {
    expect(storeManifest(MANIFEST).host_permissions).toEqual(['https://www.notion.so/*', `${API}/*`])
  })

  it('leaves everything else as it is, and the original untouched', () => {
    const result = storeManifest(MANIFEST)

    expect({ ...result, host_permissions: undefined }).toEqual({ ...MANIFEST, host_permissions: undefined })
    expect(MANIFEST.host_permissions).toHaveLength(4)
  })
})

describe('store build checks', () => {
  const check = overrides => checkStoreBuild({ manifest: MANIFEST, configSource: CONFIG, files: FILES, ...overrides })

  it('passes a build that is ready for the store', () => {
    expect(check()).toEqual([])
  })

  it('refuses a build that still talks to a local backend', () => {
    expect(check({ configSource: "export const API_URL = 'http://localhost:3000'\n" }))
      .toContainEqual(expect.stringMatching(/API_URL.*localhost/))
  })

  it('refuses a build whose backend is missing from host_permissions', () => {
    const manifest = { ...MANIFEST, host_permissions: ['https://www.notion.so/*'] }

    expect(check({ manifest })).toContainEqual(expect.stringMatching(/host_permissions/))
  })

  it('refuses a build without 16, 48 and 128 px icons', () => {
    const manifest = { ...MANIFEST, icons: { 16: 'icons/icon-16.png' } }

    expect(check({ manifest })).toContainEqual(expect.stringMatching(/48.*128|icons/))
  })

  it('refuses a build whose icon files are missing', () => {
    expect(check({ files: ['manifest.json', 'src/background.js'] }))
      .toContainEqual(expect.stringMatching(/icons\/icon-128\.png/))
  })
})

describe('package contents', () => {
  it('ships the manifest, src/ and icons/ only', () => {
    const all = [
      'manifest.json',
      'src/background.js',
      'src/popup.html',
      'icons/icon-128.png',
      'tests/status.test.js',
      'dev/popup-preview.html',
      'node_modules/vitest/index.js',
      'package.json',
      'README.md',
      'scripts/build-store.js',
      'dist/old.zip',
    ]

    expect(packageFiles(all)).toEqual(['manifest.json', 'src/background.js', 'src/popup.html', 'icons/icon-128.png'])
  })
})

describe('zip file', () => {
  it('is a zip Chrome can read, with each file at its own path and the manifest at the root', () => {
    const entries = [
      { name: 'manifest.json', data: Buffer.from('{"name":"AutoLang"}') },
      { name: 'src/background.js', data: Buffer.from('console.log("hi")\n'.repeat(50)) },
    ]

    const files = readZip(createZip(entries))

    expect(files).toEqual({
      'manifest.json': '{"name":"AutoLang"}',
      'src/background.js': 'console.log("hi")\n'.repeat(50),
    })
  })
})

/** Reads a zip back through its central directory, the way unzip tools do. */
function readZip(zip) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  const count = zip.readUInt16LE(end + 10)
  let offset = zip.readUInt32LE(end + 16)
  const files = {}
  for (let i = 0; i < count; i++) {
    expect(zip.readUInt32LE(offset)).toBe(0x02014b50)
    const method = zip.readUInt16LE(offset + 10)
    const compressedSize = zip.readUInt32LE(offset + 20)
    const nameLength = zip.readUInt16LE(offset + 28)
    const extraLength = zip.readUInt16LE(offset + 30)
    const commentLength = zip.readUInt16LE(offset + 32)
    const localOffset = zip.readUInt32LE(offset + 42)
    const name = zip.toString('utf8', offset + 46, offset + 46 + nameLength)

    expect(zip.readUInt32LE(localOffset)).toBe(0x04034b50)
    const dataStart = localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28)
    const raw = zip.subarray(dataStart, dataStart + compressedSize)
    files[name] = (method === 8 ? inflateRawSync(raw) : raw).toString('utf8')

    offset += 46 + nameLength + extraLength + commentLength
  }
  return files
}
