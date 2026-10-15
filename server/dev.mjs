import { spawn } from 'node:child_process';
import path from 'node:path';
const children = [
  spawn(process.execPath, ['--watch', 'server/index.mjs'], { stdio: 'inherit', env: { ...process.env, PORT: '4173' } }),
  spawn(process.execPath, [path.resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { stdio: 'inherit' }),
];
const stop = () => children.forEach(child => child.kill());
process.on('SIGINT', () => { stop(); process.exit(); });
process.on('SIGTERM', () => { stop(); process.exit(); });
children.forEach(child => child.on('exit', code => { stop(); process.exit(code || 0); }));
