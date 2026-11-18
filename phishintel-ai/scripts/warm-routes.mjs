import http from 'node:http';

const ROUTES = [
  '/dashboard',
  '/analyzer',
  '/explainability',
  '/analytics',
  '/history',
  '/profile',
  '/settings',
  '/account',
];

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MAX_WAIT_MS = 60000;
const RETRY_INTERVAL_MS = 800;

function ping(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

function fetchRoute(route) {
  return new Promise((resolve) => {
    const start = performance.now();
    const req = http.get(`${BASE_URL}${route}`, (res) => {
      res.resume();
      res.on('end', () => {
        const duration = Math.round(performance.now() - start);
        resolve({ route, status: res.statusCode, duration, ok: true });
      });
    });
    req.on('error', (err) => {
      const duration = Math.round(performance.now() - start);
      resolve({ route, status: 0, duration, ok: false, error: err.message });
    });
  });
}

async function waitForServer() {
  const start = Date.now();
  process.stdout.write(`Waiting for server at ${BASE_URL}...`);
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const code = await ping(`${BASE_URL}/dashboard`);
      if (code) {
        console.log(` Ready (HTTP ${code})`);
        return true;
      }
    } catch {
      process.stdout.write('.');
      await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
    }
  }
  console.log(' Timed out waiting for server.');
  return false;
}

async function runWarmup() {
  const ready = await waitForServer();
  if (!ready) {
    process.exit(1);
  }

  console.log('\n[PhishIntel Warm-Up] Compiling and warming all routes sequentially:');
  const results = [];

  for (const route of ROUTES) {
    const res = await fetchRoute(route);
    results.push(res);
    const mark = res.ok && res.status === 200 ? '✓' : '✗';
    console.log(`  ${mark} ${route.padEnd(18)} ${res.duration.toString().padStart(5)}ms  (HTTP ${res.status})`);
  }

  const totalTime = results.reduce((acc, r) => acc + r.duration, 0);
  console.log(`\n[PhishIntel Warm-Up] All ${ROUTES.length} routes warmed in ${totalTime}ms. Instant navigation ready!\n`);
}

runWarmup();
