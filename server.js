// server.js
import express from "express";
import axios from "axios";
import cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;

// Crawl Shopee search page và parse HTML để lấy một số thông tin cơ bản
async function getShopeeTrending(keyword) {
  const url = `https://shopee.vn/search?keyword=${encodeURIComponent(keyword)}`;
  const { data } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "vi,en;q=0.9",
    },
  });

  const $ = cheerio.load(data);
  const items = [];

  // Selector có thể thay đổi theo cấu trúc Shopee — chúng ta thử các class phổ biến
  $("div.shopee-search-item-result__item").slice(0, 10).each((i, el) => {
    const name = $(el).find("div[data-sqe='name']").text().trim() || $(el).find(".yQmmFK").text().trim();
    const price = $(el).find(".x2i1C2").text().trim() || $(el).find(".vioxXd").text().trim();
    const a = $(el).find("a");
    const href = a.attr("href") || "";
    const link = href ? `https://shopee.vn${href}` : "";
    if (name && link) {
      items.push({ name, price, link });
    }
  });

  return items;
}

app.get("/trending", async (req, res) => {
  try {
    const keyword = req.query.keyword || "đèn ngủ";
    const items = await getShopeeTrending(keyword);
    res.json({ keyword, count: items.length, items });
  } catch (err) {
    console.error("Error fetching Shopee:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Shopee Affiliate API is running!");
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
