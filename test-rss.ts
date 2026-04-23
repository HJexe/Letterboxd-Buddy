import axios from 'axios';
async function test() {
  const users = ['@hrooshi', 'hrooshi'];
  for (const u of users) {
      try {
          console.log(`Testing ${u}...`);
          let res = await axios.get(`https://letterboxd.com/${u}/rss/`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          console.log(`${u} worked`, res.status);
          continue;
      } catch(e) {
          console.log(`${u} direct fail:`, e.message);
      }
  }
}
test();
