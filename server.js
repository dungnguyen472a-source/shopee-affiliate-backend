// server.js
import express from "express";
import axios from "axios";
import cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

// Simple in-memory cache to reduce scrapes (keyed by keyword)
const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function fetchHTML(url) {
  const resp = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "vi,en;q=0.9",
    },
    timeout: 15000,
  });
  return resp.data;
}

function parseItemsFromHTML(html) {
  const $ = cheerio.load(html);
  const items = [];

  // Try primary selector (may change — we have fallbacks below)
  const containers = $("div.shopee-search-item-result__item");
  if (containers.length) {
    containers.slice(0, 12).each((i, el) => {
      const name = $(el).find("div[data-sqe='name']").text().trim() || $(el).find(".yQmmFK").text().trim();
      // Price selectors (different layouts)
      const price = $(el).find(".x2i1C2").text().trim() || $(el).find(".vioxXd").text().trim() || "";
      const href = $(el).find("a").attr("href") || "";
      const link = href ? `https://shopee.vn${href}` : "";
      if (name && link) items.push({ name, price, link });
    });
  }

  // Fallback: some pages embed JSON or different structure — try a second common class
  if (!items.length) {
    $("div._1NoI8_").slice(0, 12).each((i, el) => {
      const name = $(el).find(".yQmmFK").text().trim() || $(el).find(".a3W3R0").text().trim();
      const price = $(el).find(".vioxXd").text().trim() || "";
      const href = $(el).find("a").attr("href") || "";
      const link = href ? `https://shopee.vn${href}` : "";
      if (name && link) items.push({ name, price, link });
    });
  }

  return items.slice(0, 10); // safety: return up to 10
}

async function getShopeeTrending(keyword) {
  // check cache
  const now = Date.now();
  if (cache.has(keyword)) {
    const record = cache.get(keyword);
    if (now - record.ts < CACHE_TTL_MS) {
      return record.items;
    }
  }

  const url = `https://shopee.vn/search?keyword=${encodeURIComponent(keyword)}`;
  const html = await fetchHTML(url);
  const items = parseItemsFromHTML(html);
  // store to cache
  cache.set(keyword, { ts: now, items });
  return items;
}

// endpoints
app.get("/trending", async (req, res) => {
  try {
    const keyword = (req.query.keyword || "đèn ngủ").trim();
    const items = await getShopeeTrending(keyword);
    res.json({ keyword, count: items.length, items });
  } catch (err) {
    console.error("Error fetching Shopee:", err && err.message ? err.message : err);
    res.status(500).json({ error: String(err) });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Shopee Affiliate API is running!");
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
