import { fetchImpersonated } from '../http.mjs';

const clean = (s) =>
  (s || '')
    .replace(/<!--.*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

export async function fetchListings(search) {
  const { body, finalUrl } = await fetchImpersonated(search.url);
  if (finalUrl.includes('perfdrive') || /ShieldSquare Captcha/i.test(body)) {
    throw new Error('blocked by ShieldSquare captcha');
  }

  // The "featured store" block shows an agency's random ads that don't match the search filters.
  const results = body.replace(/<section class="featuredStore"[\s\S]*?<\/section>/g, '');
  // Matches "listing" and "listing isPromoted", but not "listings"/"listingsBanner".
  const items = results.split(/<li class="listing(?: isPromoted)?"/).slice(1);
  if (items.length === 0) throw new Error('no listings found on page (layout change?)');

  return items.map((it) => {
    const id = Number(it.match(/oglas-(\d+)/)?.[1]);
    const href = it.match(/href="(\/nekretnine\/[^"]*oglas-\d+)"/)?.[1];
    const area = clean(it.match(/<dt[^>]*>Stambena površina<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/)?.[1]).match(/[\d.,]+/)?.[0];
    return {
      id,
      title: clean(it.match(/<h3[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/)?.[1]),
      url: href ? `https://www.njuskalo.hr${href}` : null,
      price: parseInt(clean(it.match(/class="price"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/)?.[1]).replace(/\D/g, ''), 10) || null,
      // "48.79 m²" uses a decimal dot, but allow Croatian "1.048,5" too
      area: area ? parseFloat(area.includes(',') ? area.replace(/\./g, '').replace(',', '.') : area) : null,
      location: clean(it.match(/class="locationText"[^>]*>([\s\S]*?)<\/span>/)?.[1]),
      image: it.match(/src="(https:\/\/www\.njuskalo\.hr\/image-[^"]+)"/)?.[1]?.replace(/\/image-[^/]+\//, '/image-w920x690/') || null,
    };
  }).filter((l, i, all) => l.id && all.findIndex((o) => o.id === l.id) === i); // promoted ads repeat in the list
}
