import { htmlToText } from "./text.js";

async function fetchWpJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WP fetch failed: ${res.status} (${url})`);
  return res.json();
}

function normalizeWpItem(item) {
  const title = item?.title?.rendered || "";
  const link = item?.link || "";
  const html = item?.content?.rendered || "";
  const text = htmlToText(html);
  return { title, link, text };
}

export async function fetchPageById({ wpBase, pageId }) {
  const base = wpBase.replace(/\/$/, "");
  const tryUrls = [
    `${base}/wp-json/wp/v2/posts/${pageId}`,
    `${base}/wp-json/wp/v2/pages/${pageId}`,
  ];

  let lastErr;
  for (const url of tryUrls) {
    try {
      const item = await fetchWpJson(url);
      const norm = normalizeWpItem(item);
      return { pageId, ...norm };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Unable to fetch page by ID");
}