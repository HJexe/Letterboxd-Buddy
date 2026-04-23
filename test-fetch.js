import axios from "axios";

async function test() {
  const rssUrl = "https://letterboxd.com/hrooshi/rss/";
  try {
    const response = await axios.get(rssUrl, {
      headers: {
        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              'Accept': 'text/xml,application/xml,application/rss+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Referer': 'https://letterboxd.com/',
      },
      validateStatus: () => true
    });
    console.log("Status:", response.status);
    console.log("Headers:", response.headers);
    console.log("Data snippet:", typeof response.data === "string" ? response.data.substring(0, 200) : "not string");
  } catch (e) {
    console.error("error:", e);
  }
}
test();
