import { execFileSync } from 'node:child_process'

/**
 * Les hooks vivent dans le depot, pas dans `.git/hooks` : versionnes, relus
 * comme du code, et identiques pour tout le monde — y compris dans les
 * worktrees, ou `.git/hooks` n'existe pas.
 */
try {
  execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' })
} catch {
  // Pas de depot git (archive, image de build) : rien a installer.
  process.exit(0)
}

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' })
console.log('Hooks git installés : core.hooksPath = .githooks')
