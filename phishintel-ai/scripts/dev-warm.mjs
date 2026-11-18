import { spawn } from 'node:child_process';
import path from 'node:path';

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const nextProcess = spawn(npxCmd, ['next', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

// Run warmup script in parallel; it will wait for the server to be ready
const warmProcess = spawn('node', [path.resolve('scripts/warm-routes.mjs')], {
  stdio: 'inherit',
});

process.on('SIGINT', () => {
  nextProcess.kill('SIGINT');
  warmProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  nextProcess.kill('SIGTERM');
  warmProcess.kill('SIGTERM');
  process.exit(0);
});

nextProcess.on('exit', (code) => {
  process.exit(code || 0);
});
