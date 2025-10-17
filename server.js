import express from "express";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 phút

async function fetchShopeeItems(keyword) {
  const cacheKey = `kw:${keyword}`;
  const now = Date.now();

  if (cache.has(cacheKey)) {
    const rec = cache.get(cacheKey);
    if (now - rec.ts < CACHE_TTL_MS) {
      console.log(`🌀 Dùng cache cho keyword: ${keyword}`);
      return rec.items;
    }
  }

  const url = `https://shopee.vn/api/v4/search/search_items?by=sales&limit=10&order=desc&keyword=${encodeURIComponent(keyword)}&page_type=search`;

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json",
        "Referer": `https://shopee.vn/search?keyword=${encodeURIComponent(keyword)}`,
        "x-shopee-language": "vi",
      },
      timeout: 15000,
    });

    const items = response.data?.items || [];
    const results = items.map((it) => ({
      name: it.item_basic.name,
      price: `${(it.item_basic.price / 100000).toLocaleString("vi-VN")}₫`,
      link: `https://shopee.vn/product/${it.item_basic.shopid}/${it.item_basic.itemid}`,
    }));

    console.log(`✅ FetchShopeeItems: lấy được ${results.length} sản phẩm`);
    cache.set(cacheKey, { ts: now, items: results });
    return results;
  } catch (err) {
    console.error(`❌ Lỗi Shopee API cho keyword ${keyword}:`, err.response?.status);
    return [];
  }
}

app.get("/trending", async (req, res) => {
  const keyword = (req.query.keyword || "đèn ngủ").trim();
  const items = await fetchShopeeItems(keyword);
  res.json({ keyword, count: items.length, items });
});

app.get("/", (req, res) => {
  res.send("✅ Shopee Affiliate Backend đang hoạt động (API JSON)");
});

app.listen(PORT, () => console.log(`🚀 Server đang chạy trên cổng ${PORT}`));
