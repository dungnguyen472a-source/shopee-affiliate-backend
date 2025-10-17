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
  const items = [];

  // Tìm đoạn script chứa dữ liệu sản phẩm
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
  if (!match) {
    console.warn("⚠️ Không tìm thấy script __NEXT_DATA__ trong HTML");
    return items;
  }

  try {
    const json = JSON.parse(match[1]);
    const list =
      json?.props?.pageProps?.initialState?.search?.searchResult?.itemModules || [];

    for (const it of list.slice(0, 10)) {
      const name = it?.name || "";
      const price = it?.price ? (it.price / 100000).toLocaleString("vi-VN") + "₫" : "";
      const link = `https://shopee.vn/product/${it.shopid}/${it.itemid}`;
      if (name && link) items.push({ name, price, link });
    }
  } catch (err) {
    console.error("❌ Lỗi parse JSON:", err);
  }

  console.log(`✅ Parse được ${items.length} sản phẩm`);
  return items;
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
