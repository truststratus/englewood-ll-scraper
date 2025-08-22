import fetch from "node-fetch";
import { load } from "cheerio";
import { saveSnapshot, toSnapshotPath, limit } from "./util.mjs";

const START_URL = "https://www.englewoodlittleleague.com/";
const MAX_PAGES = 150;                    // safety cap
const USER_AGENT = "EnglewoodLL-Bot/1.0 (+contact: your-email@example.com)";

const queue = [START_URL];
const seen = new Set();
const originHost = new URL(START_URL).host;

function isInternal(u) {
  try {
    const url = new URL(u, START_URL);
    return url.host === originHost && url.protocol.startsWith("http");
  } catch { return false; }
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`);
  return res.text();
}

async function crawl() {
  let count = 0;

  while (queue.length && count < MAX_PAGES) {
    const url = queue.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);

    try {
      const html = await limit(() => fetchPage(url));
      const filePath = toSnapshotPath(new URL(url));
      await saveSnapshot(filePath, html);
      count++;

      // Parse links to find more internal pages
      const $ = load(html);
      $("a[href]").each((_, a) => {
        const href = $(a).attr("href");
        if (!href) return;
        const next = new URL(href, url).toString();
        if (isInternal(next) && !seen.has(next) && !queue.includes(next)) {
          queue.push(next);
        }
      });

      // be nice: small delay (1 req/sec)
      await new Promise(r => setTimeout(r, 1000));
      console.log(`Saved ${filePath} (${count}/${MAX_PAGES})`);
    } catch (e) {
      console.warn(`Skip ${url}: ${e.message}`);
    }
  }

  console.log(`Done. Snapshots written. Visited ${count} page(s).`);
}

crawl();
