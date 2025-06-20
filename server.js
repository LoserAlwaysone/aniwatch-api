import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('Aniwatch API is running');
});

app.get('/search/:query', async (req, res) => {
  try {
    const searchUrl = `https://gogoanime.cl/search.html?keyword=${req.params.query}`;
    const response = await fetch(searchUrl);
    const body = await response.text();
    const $ = cheerio.load(body);
    const results = [];

    $('.items li').each((i, el) => {
      const title = $(el).find('.name a').text();
      const id = $(el).find('.name a').attr('href').split('/')[2];
      const image = $(el).find('img').attr('src');
      results.push({ id, title, image });
    });

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch search results' });
  }
});

app.get('/anime/:id', async (req, res) => {
  try {
    const url = `https://gogoanime.cl/category/${req.params.id}`;
    const response = await fetch(url);
    const body = await response.text();
    const $ = cheerio.load(body);

    const ep_start = $('#episode_page li').first().find('a').attr('ep_start');
    const ep_end = $('#episode_page li').last().find('a').attr('ep_end');
    const epListUrl = `https://gogoanime.cl/ajax/load-list-episode?ep_start=${ep_start}&ep_end=${ep_end}&id=${req.params.id}`;

    const epResponse = await fetch(epListUrl);
    const epHtml = await epResponse.text();
    const $$ = cheerio.load(epHtml);
    const episodes = [];

    $$('#episode_related li a').each((i, el) => {
      const epId = $(el).attr('href').slice(1);
      const number = $(el).text().replace('EP ', '').trim();
      episodes.push({ id: epId, number });
    });

    res.json({ id: req.params.id, episodes: episodes.reverse() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch anime info' });
  }
});

app.get('/watch/:episodeId', async (req, res) => {
  try {
    const url = `https://gogoanime.cl/${req.params.episodeId}`;
    const response = await fetch(url);
    const body = await response.text();
    const $ = cheerio.load(body);
    const iframeUrl = $('iframe').attr('src');

    res.json({
      sources: [{ url: iframeUrl, quality: 'auto', isM3U8: false }]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Aniwatch API running on port ${PORT}`);
});
