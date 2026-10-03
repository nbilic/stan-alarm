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

  const items = body.split('EntityList-item--Regular').slice(1);
  if (items.length === 0) throw new Error('no listings found on page (layout change?)');

  return items.map((it) => {
    const id = Number(it.match(/oglas-(\d+)/)?.[1]);
    const href = it.match(/href="(\/nekretnine\/[^"]*oglas-\d+)"/)?.[1];
    const area = it.match(/Stambena površina:\s*([\d.,]+)\s*m2/)?.[1];
    return {
      id,
      title: clean(it.match(/<h3[\s\S]*?<span>([\s\S]*?)<\/span>/)?.[1]),
      url: href ? `https://www.njuskalo.hr${href}` : null,
      price: parseInt(clean(it.match(/class="price price--hrk"[^>]*>([\s\S]*?)<\/strong>/)?.[1]).replace(/\D/g, ''), 10) || null,
      area: area ? parseFloat(area.replace(',', '.')) : null,
      location: clean(it.match(/Lokacija:<\/span>([\s\S]*?)<br>/)?.[1]),
      image: it.match(/src="(https:\/\/www\.njuskalo\.hr\/image-[^"]+)"/)?.[1]?.replace(/image-200x150/, 'image-w920x690') || null,
    };
  }).filter((l) => l.id);
}
