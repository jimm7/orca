import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'

const repository = 'stablyai/orca'
const assetName = 'orca-windows-setup.exe'

export function selectInstaller(release) {
  const asset = release.assets?.find((candidate) => candidate.name === assetName)
  if (release.draft || release.prerelease || !asset) {
    throw new Error('No Windows installer in the latest stable Orca release.')
  }
  const url = new URL(asset.browser_download_url)
  if (url.origin !== 'https://github.com' ||
      !url.pathname.startsWith(`/${repository}/releases/download/`) ||
      !url.pathname.endsWith(`/${assetName}`)) {
    throw new Error('The installer URL is not an official Orca release asset.')
  }
  if (!/^sha256:[a-f0-9]{64}$/i.test(asset.digest ?? '')) {
    throw new Error('GitHub did not supply a SHA-256 digest. Download manually from the official release page.')
  }
  return { url: url.href, digest: asset.digest.slice(7).toLowerCase() }
}

export async function downloadInstaller(directory, request = fetch) {
  await mkdir(directory, { recursive: true })
  const destination = path.join(directory, assetName)
  // Never leave an older installer available after a failed verification.
  await rm(destination, { force: true })
  const staging = await mkdtemp(path.join(directory, 'download-'))
  try {
    const metadata = await request(`https://api.github.com/repos/${repository}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Orca-Quick-Setup' },
      signal: AbortSignal.timeout(60_000)
    })
    if (!metadata.ok) throw new Error(`GitHub release lookup failed (${metadata.status}).`)
    const release = await metadata.json()
    const installer = selectInstaller(release)
    console.log(`Downloading Orca ${release.tag_name} (approximately 220 MB)...`)
    const response = await request(installer.url, { signal: AbortSignal.timeout(30 * 60_000) })
    if (!response.ok || !response.body) throw new Error(`Installer download failed (${response.status}).`)
    const temporary = path.join(staging, assetName)
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary, { flags: 'wx' }))
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(temporary)) hash.update(chunk)
    if (hash.digest('hex') !== installer.digest) throw new Error('Installer checksum mismatch. Nothing was launched.')
    await rename(temporary, destination)
    console.log('Installer checksum verified against GitHub release metadata.')
    return destination
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.platform !== 'win32') throw new Error('This setup downloader is for Windows only.')
    if (!process.argv[2]) throw new Error('A download directory is required.')
    await downloadInstaller(process.argv[2])
  } catch (error) {
    console.error(`Setup stopped: ${error.message}`)
    process.exitCode = 1
  }
}
