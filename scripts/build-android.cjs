const { spawnSync } = require('node:child_process');
const path = require('node:path');

// Pasamos las variables directamente a EAS, sin depender de PowerShell o CMD.
const root = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('Ejecuta este archivo mediante npm run build:android.');
  process.exit(1);
}
const result = spawnSync(process.execPath, [
  npmCli, 'exec', '--yes', '--package=eas-cli', '--',
  'eas', 'build', '--platform', 'android', '--profile', 'preview',
], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, EAS_NO_VCS: '1', EAS_PROJECT_ROOT: root },
});
if (result.error) console.error('No se pudo iniciar EAS:', result.error.message);
process.exit(result.status ?? 1);
