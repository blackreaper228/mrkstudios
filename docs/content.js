export function parsePortfolio(data, base = import.meta.url) {
  return Array.from({ length: 5 }, (_, index) => {
    const slide = data?.[`slide${index + 1}`];
    if (!slide || typeof slide.title !== 'string' || !slide.title.trim() || slide.title.trim().length > 80 || typeof slide.image !== 'string' || !slide.image.trim()) {
      throw new Error(`Invalid portfolio slide ${index + 1}`);
    }
    let path = slide.image.trim();
    if (path.startsWith('/mrkstudios/')) path = path.slice('/mrkstudios/'.length);
    const url = new URL(path, base);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported image URL');
    return { title: slide.title.trim(), src: url.href };
  });
}
export async function loadPortfolio() {
  const response = await fetch(new URL('content/portfolio.json', import.meta.url), { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Portfolio request failed (${response.status})`);
  return parsePortfolio(await response.json());
}
