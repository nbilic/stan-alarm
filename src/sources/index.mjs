import { fetchText } from '../http.mjs';

const API = 'https://www.index.hr/oglasi/api/aditem';

// The API answers "Bad request" unless the request carries the `dpc` cookie,
// which the search page sets on a plain visit.
async function getSessionCookie(pageUrl) {
  const res = await fetchText(pageUrl);
  const cookies = res.headers.getSetCookie().map((c) => c.split(';')[0]);
  if (!cookies.some((c) => c.startsWith('dpc='))) throw new Error('search page did not set dpc cookie');
  return cookies.join('; ');
}

export async function fetchListings(search) {
  const cookie = await getSessionCookie(search.pageUrl);
  const qs = new URLSearchParams(Object.entries(search.apiParams).map(([k, v]) => [k, String(v)]));
  const res = await fetchText(`${API}?${qs}`, { Accept: 'application/json', Cookie: cookie, Referer: search.pageUrl });
  const { data } = await res.json();
  if (!Array.isArray(data)) throw new Error('unexpected API response');

  return data.map((ad) => ({
    id: ad.code,
    title: ad.title,
    url: `https://www.index.hr/oglasi/nekretnine/prodaja-stanova/oglas/${ad.smartLink}/${ad.code}`,
    price: ad.price || null,
    area: ad.summary?.area || null,
    location: ad.locationName || '',
    image: ad.images?.[0] ? `https://www.index.hr/oglasi/api/image/direct/${ad.images[0]}` : null,
  }));
}
