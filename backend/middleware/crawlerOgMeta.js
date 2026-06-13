const BOT_UA =
  /bot|crawler|spider|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Applebot|bingpreview|Embedly/i;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getPublicSiteUrl(req) {
  if (process.env.PUBLIC_SITE_URL) {
    return process.env.PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

function isCrawler(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return false;
  return BOT_UA.test(userAgent);
}

function upsertMeta(html, attr, key, value) {
  const escaped = escapeHtml(value);
  const re = new RegExp(`<meta ${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${escaped}">`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `  ${tag}\n</head>`);
}

function injectOgMeta(html, tags) {
  let out = html;
  for (const [key, value] of Object.entries(tags)) {
    if (key.startsWith('twitter:')) {
      out = upsertMeta(out, 'name', key, value);
    } else {
      out = upsertMeta(out, 'property', key, value);
    }
  }
  return out;
}

async function fetchEventForOgMeta(dbService, id) {
  await dbService.init();
  const rows = await dbService.getEventsByIds([id]);
  const { rowToEvent } = require('../utils/rowToEvent');
  return rowToEvent(rows[0]) || null;
}

function createCrawlerOgMiddleware({ indexHtmlPath, dbService, fs }) {
  return async function crawlerOgMiddleware(req, res, next) {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api/')) return next();

    const userAgent = req.get('user-agent') || '';
    if (!isCrawler(userAgent)) return next();

    let eventId = null;
    if (req.path.startsWith('/event/')) {
      eventId = req.path.replace(/^\/event\//, '').split('/')[0];
    } else if (req.path === '/' || req.path === '/index.html') {
      eventId = typeof req.query.event === 'string' ? req.query.event : null;
    }

    if (!eventId || !fs.existsSync(indexHtmlPath)) return next();

    try {
      const event = await fetchEventForOgMeta(dbService, eventId);
      if (!event) return next();

      const siteUrl = getPublicSiteUrl(req);
      const pageUrl = `${siteUrl}/?event=${encodeURIComponent(eventId)}`;
      const ogImage = `${siteUrl}/api/og/event/${encodeURIComponent(eventId)}.png`;
      const title = event.name || 'WhatsUpNYC Event';
      const description =
        (event.description && String(event.description).slice(0, 160)) ||
        `${title} in NYC`;

      let html = fs.readFileSync(indexHtmlPath, 'utf8');
      html = injectOgMeta(html, {
        'og:title': title,
        'og:description': description,
        'og:image': ogImage,
        'og:url': pageUrl,
        'twitter:card': 'summary_large_image',
        'twitter:title': title,
        'twitter:description': description,
        'twitter:image': ogImage,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.send(html);
    } catch {
      return next();
    }
  };
}

module.exports = {
  createCrawlerOgMiddleware,
  isCrawler,
  getPublicSiteUrl,
};
