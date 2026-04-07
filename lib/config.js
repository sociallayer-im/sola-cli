import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import os from 'os'

const CONFIG_DIR = join(os.homedir(), '.sola')
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

export async function getToken() {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8')
    const cfg = JSON.parse(raw)
    return cfg.auth_token ?? null
  } catch {
    return null
  }
}

export async function saveToken(auth_token) {
  await mkdir(CONFIG_DIR, { recursive: true })
  await writeFile(CONFIG_PATH, JSON.stringify({ auth_token }, null, 2), 'utf8')
}
