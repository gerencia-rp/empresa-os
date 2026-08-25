import http from 'node:http';
import { fetchWithTimeout } from '../api/_fetch.mjs';

const server = http.createServer((req, res) => {
  if (req.url === '/slow') return setTimeout(() => { res.writeHead(200); res.end('late'); }, 250);
  res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let fails = 0;
const check = (name, pass) => { console.log(`${pass ? '✅' : '❌'} ${name}`); if (!pass) fails++; };

try {
  const ok = await fetchWithTimeout(`${base}/ok`, {}, 500);
  check('la dependencia sana responde', ok.ok);
  let timedOut = false;
  try { await fetchWithTimeout(`${base}/slow`, {}, 40); } catch (error) { timedOut = /timeout|aborted|available/i.test(error.message); }
  check('la dependencia lenta falla dentro del límite', timedOut);
} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log(fails ? `\n❌ ${fails} FALLAS` : '\n✅ RESILIENCIA API OK');
process.exit(fails ? 1 : 0);
