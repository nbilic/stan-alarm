import { fetchText } from '../http.mjs';

// Listings are server-rendered into the Next.js page data. Note: search URLs in map mode
// (mapCenter/zoom params) load listings client-side and come back empty here.
export async function fetchListings(search) {
  const html = await (await fetchText(search.url)).text();
  const json = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new Error('no __NEXT_DATA__ on page');

  const queries = JSON.parse(json).props?.pageProps?.dehydratedState?.queries || [];
  const results = queries.find((q) => Array.isArray(q.state?.data?.results))?.state.data.results;
  if (!results) throw new Error('no results in page data (map-mode URL?)');

  return results.map(({ realEstate: re, seo }) => {
    const p = re.properties?.[0] || {};
    return {
      id: re.id,
      title: re.title,
      url: seo?.url || `https://www.nekretnine.hr/oglasi/${re.id}/`,
      price: re.price?.value || null,
      area: parseFloat(p.surface) || null,
      location: [p.location?.microzone, p.floor?.floorOnlyValue].filter(Boolean).join(', '),
      image: p.photo?.urls?.small?.replace('xxs-c.jpg', 'xl.jpg') || null,
    };
  });
}
