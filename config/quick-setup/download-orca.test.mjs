import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { downloadInstaller, selectInstaller } from './download-orca.mjs'

const bytes = Buffer.from('mock installer bytes')
const release = {
  tag_name: 'v1.0.0',
  draft: false,
  prerelease: false,
  assets: [{
    name: 'orca-windows-setup.exe',
    browser_download_url: 'https://github.com/stablyai/orca/releases/download/v1.0.0/orca-windows-setup.exe',
    digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`
  }]
}

function requester(metadata = release, payload = bytes, status = 200) {
  return async (url) => url.includes('api.github.com')
    ? new Response(JSON.stringify(metadata), { status })
    : new Response(payload)
}

test('rejects non-official assets, missing checksums and unstable releases', () => {
  for (const url of [
    'https://example.com/orca-windows-setup.exe',
    'https://github.com/other/orca/releases/download/v1/orca-windows-setup.exe',
    'http://github.com/stablyai/orca/releases/download/v1/orca-windows-setup.exe'
  ]) {
    assert.throws(() => selectInstaller({ ...release, assets: [{ ...release.assets[0], browser_download_url: url }] }), /official/)
  }
  assert.throws(() => selectInstaller({ ...release, assets: [{ ...release.assets[0], digest: null }] }), /SHA-256/)
  assert.throws(() => selectInstaller({ ...release, prerelease: true }), /stable/)
  assert.throws(() => selectInstaller({ ...release, draft: true }), /stable/)
  assert.throws(() => selectInstaller({ ...release, assets: [] }), /installer/)
})

test('streams a verified installer into a path with spaces', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'orca setup '))
  try {
    const destination = await downloadInstaller(directory, requester())
    assert.deepEqual(await readFile(destination), bytes)
    assert.deepEqual(await readdir(directory), ['orca-windows-setup.exe'])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('checksum failure removes stale installers and staging files', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'orca-setup-'))
  try {
    await writeFile(path.join(directory, 'orca-windows-setup.exe'), 'old installer')
    await assert.rejects(downloadInstaller(directory, requester(release, 'tampered')), /checksum mismatch/)
    assert.deepEqual(await readdir(directory), [])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('release API failure leaves no executable behind', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'orca-setup-'))
  try {
    await assert.rejects(downloadInstaller(directory, requester(release, bytes, 403)), /403/)
    assert.deepEqual(await readdir(directory), [])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('interrupted download leaves no executable behind', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'orca-setup-'))
  const request = async (url) => {
    if (url.includes('api.github.com')) return new Response(JSON.stringify(release))
    return new Response(new ReadableStream({ start(controller) { controller.error(new Error('connection lost')) } }))
  }
  try {
    await assert.rejects(downloadInstaller(directory, request), /connection lost/)
    assert.deepEqual(await readdir(directory), [])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
