import { readFile, writeFile, mkdir } from 'node:fs/promises';
import * as njuskalo from './sources/njuskalo.mjs';
import * as index from './sources/index.mjs';
import * as nekretnine from './sources/nekretnine.mjs';
import { notifyListing, notifySummary, notifyProblem, notifyRecovered } from './notify.mjs';

const SOURCES = { njuskalo, index, nekretnine };
const STATE_FILE = 'state/state.json';
const MAX_SEEN = 3000;
const MAX_INDIVIDUAL = 8;
const FAILS_BEFORE_ALERT = 6; // ~1h at a 10 min schedule

const config = JSON.parse(await readFile('config.json', 'utf8'));
const state = await readFile(STATE_FILE, 'utf8').then(JSON.parse).catch(() => ({}));

for (const search of config.searches) {
  const key = search.source;
  const s = (state[key] ??= { seen: [], seedMax: null, fails: 0 });

  let listings;
  try {
    listings = await SOURCES[key].fetchListings(search);
  } catch (err) {
    s.fails++;
    console.error(`[${key}] fetch failed (${s.fails}x): ${err.message}`);
    if (s.fails === FAILS_BEFORE_ALERT) await notifyProblem(key, err.message).catch(() => {});
    continue;
  }
  if (s.fails >= FAILS_BEFORE_ALERT) await notifyRecovered(key).catch(() => {});
  s.fails = 0;

  // First run only records what's already there, so we don't flood the phone with old listings.
  if (s.seedMax === null) {
    s.seen = listings.map((l) => l.id);
    s.seedMax = Math.max(...s.seen);
    console.log(`[${key}] seeded with ${s.seen.length} listings, seedMax=${s.seedMax}`);
    continue;
  }

  // Agencies "refresh" old ads to push them to the top, so a listing only counts as new
  // if we've never seen its id AND the id is newer than everything that existed when we started.
  const seen = new Set(s.seen);
  const fresh = listings.filter((l) => !seen.has(l.id) && l.id > s.seedMax);
  console.log(`[${key}] ${listings.length} listings, ${fresh.length} new`);

  if (fresh.length > MAX_INDIVIDUAL) {
    await notifySummary(key, fresh.length, search.url || search.pageUrl);
  } else {
    for (const l of fresh) {
      await notifyListing(key, l);
      console.log(`[${key}] notified ${l.id} ${l.title}`);
    }
  }

  s.seen = [...new Set([...listings.map((l) => l.id), ...s.seen])].slice(0, MAX_SEEN);
}

await mkdir('state', { recursive: true });
await writeFile(STATE_FILE, JSON.stringify(state, null, 1));
