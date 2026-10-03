import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

// Njuškalo's bot protection (ShieldSquare) rejects anything without a real Chrome TLS fingerprint,
// so those requests go through curl-impersonate instead of fetch.
// (Not named CURL_IMPERSONATE: curl-impersonate itself reads that variable as the browser target.)
export async function fetchImpersonated(url) {
  const bin = process.env.CURL_IMPERSONATE_BIN || 'curl-impersonate';
  const { stdout } = await run(
    bin,
    ['--compressed', '--impersonate', 'chrome146', '-s', '-L', '--max-time', '30', '-w', '\n%{url_effective}', url],
    { maxBuffer: 20 * 1024 * 1024 },
  );
  const cut = stdout.lastIndexOf('\n');
  return { body: stdout.slice(0, cut), finalUrl: stdout.slice(cut + 1) };
}

export async function fetchText(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}
