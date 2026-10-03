const NTFY_URL = process.env.NTFY_URL || 'https://ntfy.sh';
const SOURCE_NAMES = { njuskalo: 'Njuškalo', index: 'Index', nekretnine: 'nekretnine.hr' };

const eur = (n) => `${Math.round(n).toLocaleString('de-DE')} €`;

async function publish(payload) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.log('[dry-run]', JSON.stringify(payload));
    return;
  }
  // JSON publishing (instead of headers) so Croatian characters in titles survive.
  const res = await fetch(NTFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, ...payload }),
  });
  if (!res.ok) throw new Error(`ntfy HTTP ${res.status}: ${await res.text()}`);
}

export function notifyListing(source, l) {
  const headline = [l.price && eur(l.price), l.area && `${l.area} m²`, l.location].filter(Boolean).join(' · ');
  const perM2 = l.price && l.area ? ` · ${eur(l.price / l.area)}/m²` : '';
  return publish({
    title: headline || 'Novi stan',
    message: `${l.title}\n${SOURCE_NAMES[source]}${perM2}`,
    click: l.url,
    ...(l.image && { attach: l.image }),
    tags: ['house'],
    actions: [{ action: 'view', label: 'Otvori oglas', url: l.url }],
  });
}

export function notifySummary(source, count, searchUrl) {
  return publish({
    title: `${count} novih oglasa na ${SOURCE_NAMES[source]}`,
    message: 'Previše odjednom za pojedinačne obavijesti, pogledaj pretragu.',
    click: searchUrl,
    tags: ['house'],
  });
}

export function notifyProblem(source, error) {
  return publish({
    title: `stan-alarm: ${SOURCE_NAMES[source]} ne radi`,
    message: `Zadnjih sat vremena ne uspijeva dohvat: ${error}`,
    tags: ['warning'],
    priority: 4,
  });
}

export function notifyRecovered(source) {
  return publish({ title: `stan-alarm: ${SOURCE_NAMES[source]} opet radi`, message: 'Dohvat ponovno prolazi.', tags: ['white_check_mark'] });
}
