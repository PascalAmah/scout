/**
 * Regenerate packages/types from the FastAPI OpenAPI schema.
 *
 * Cross-platform (Windows venv layout is .venv/Scripts, POSIX is .venv/bin).
 * Usage: node scripts/generate-types.mjs  (or pnpm generate:types)
 */

import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
  if (res.status !== 0) {
    console.error(`\ncommand failed: ${cmd} ${args.join(' ')}`)
    process.exit(res.status ?? 1)
  }
}

function apiPython() {
  const venv = path.join(root, 'apps', 'api', '.venv')
  for (const candidate of [
    path.join(venv, 'Scripts', 'python.exe'),
    path.join(venv, 'bin', 'python'),
  ]) {
    if (existsSync(candidate)) return candidate
  }
  return 'python' // fall back to PATH (requires deps installed)
}

run(apiPython(), ['scripts/export_openapi.py'], path.join(root, 'apps', 'api'))
run('pnpm', ['generate'], path.join(root, 'packages', 'types'))
console.log('\n✓ types regenerated')
