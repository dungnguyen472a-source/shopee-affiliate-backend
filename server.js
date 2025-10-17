// server.js
import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";  // ✅ Sửa dòng này

const app = express();
const PORT = process.env.PORT || 3000;

const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 phút

async function fetchHTML(url) {
  const resp = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "vi,en;q=0.9"
    },
    timeout: 15000
  });
  return resp.data;
}

function parseItemsFromHTML(html) {
  const $ = cheerio.load(html);
  const items = [];

  // Shopee 2025: layout mới dùng div.shopee-search-item-result__item-wrapper
  $("div.shopee-search-item-result__item-wrapper, div.shopee-search-item-result__item").each((i, el) => {
    const name =
      $(el).find("div[data-sqe='name']").text().trim() ||
      $(el).find(".Cve6sh, ._1NoI8_, .zGGwiV").first().text().trim();

    const price =
      $(el).find(".x2i1C2, .vioxXd, .ZEgDH9").first().text().trim();

    // link sản phẩm nằm trong thẻ a[href*="/product/"] hoặc a.shopee-item-card
    let href =
      $(el).find("a[href*='/product/']").attr("href") ||
      $(el).find("a[href*='/i.']").attr("href") ||
      $(el).find("a").attr("href") ||
      "";

    if (!href.startsWith("http")) href = "https://shopee.vn" + href;

    if (name && href) items.push({ name, price, link: href });
  });

  console.log(`✅ Parse được ${items.length} sản phẩm`);
  return items.slice(0, 10);
}


async function getTrendingByKeyword(keyword) {
  const key = `kw:${keyword}`;
  const now = Date.now();
  if (cache.has(key)) {
    const rec = cache.get(key);
    if (now - rec.ts < CACHE_TTL_MS) return rec.items;
  }
  const url = `https://shopee.vn/search?keyword=${encodeURIComponent(keyword)}`;
  const html = await fetchHTML(url);
  const items = parseItemsFromHTML(html);
  cache.set(key, { ts: now, items });
  return items;
}

app.get("/trending", async (req, res) => {
  try {
    const keyword = (req.query.keyword || "đèn ngủ").trim();
    const items = await getTrendingByKeyword(keyword);
    res.json({ keyword, count: items.length, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.get("/", (req, res) => res.send("✅ Shopee Affiliate Backend đang hoạt động!"));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
