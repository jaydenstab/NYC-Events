const browserService = require('./services/browserService');
const { logger } = require('./logger');
const chrono = require('chrono-node');
const { isNavJunkTitle } = require('./utils/blocklist');
const { checkOmrStructure } = require('./utils/scraperHealth');
const cheerio = require('cheerio');
const { parseJsonLd } = require('./utils/jsonLdParser');
const { todayNYC } = require('./utils/dateUtils');

const LIST_PAGES = [
  'https://www.ohmyrockness.com/shows/just-announced',
  'https://www.ohmyrockness.com/shows/popular',
  'https://www.ohmyrockness.com/shows',
];

const MAX_SHOW_PAGES = 40;
const TARGET_SHOWS = 25;

/**
 * Oh My Rockness scraper — collects show detail URLs and parses detail pages.
 */
class OhMyRocknessScraper {
  async scrapeUpcomingShows() {
    logger.info('scraper_start', { scraper: 'oh_my_rockness' });

    try {
      const { results: shows, listUrlsFound } = await browserService.withPage(async (page) => {
        const showUrls = [];

        for (const listUrl of LIST_PAGES) {
          try {
            await page.goto(listUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            const urls = await page.evaluate(() =>
              Array.from(document.querySelectorAll('a[href*="/shows/"]'))
                .map((a) => a.href.split('?')[0])
                .filter((h) => /\/shows\/\d+-[\w-]+$/i.test(h))
            );
            showUrls.push(...urls);
          } catch (err) {
            logger.warn('omr_list_page_failed', { url: listUrl, message: err.message });
          }
        }

        const uniqueUrls = [...new Set(showUrls)];
        const results = [];
        const todayStr = todayNYC();

        for (const url of uniqueUrls.slice(0, MAX_SHOW_PAGES)) {
          if (results.length >= TARGET_SHOWS) break;

          try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

            const html = await page.content();
            const $ = cheerio.load(html);
            const jsonLdEvents = parseJsonLd($, 'oh_my_rockness');
            const jsonLdEvent = jsonLdEvents.length > 0 ? jsonLdEvents[0] : null;
            const show = await page.evaluate((showUrl) => {
              const title = document.title || '';
              const bodyText = document.body.innerText || '';

              const h1Match = title.match(/^(.+?) @ (.+?) in NYC on (\d{2}\/\d{2}\/\d{4})/i);
              const timeMatch = bodyText.match(
                /(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{1,2}:\d{2}(?:AM|PM))/i
              );

              let name = '';
              let venue = '';
              let date = '';
              let time = 'TBD';

              if (h1Match) {
                name = h1Match[1].trim();
                venue = h1Match[2].trim();
                date = h1Match[3];
              } else if (timeMatch) {
                date = timeMatch[1];
                time = timeMatch[2];
                const lines = bodyText.split('\n').map((l) => l.trim()).filter(Boolean);
                const dateIdx = lines.findIndex((l) => l.includes(date));
                if (dateIdx >= 0 && lines[dateIdx + 1]) {
                  name = lines[dateIdx + 1];
                }
                if (dateIdx >= 0 && lines[dateIdx + 2] && !/all ages|recommended|tickets/i.test(lines[dateIdx + 2])) {
                  venue = lines[dateIdx + 2];
                }
              }

              if (!name) {
                const slugMatch = showUrl.match(/\/shows\/\d+-([\w-]+)$/i);
                if (slugMatch) {
                  name = slugMatch[1]
                    .split('-')
                    .slice(0, 4)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
                }
              }

              const venueAddress =
                document.querySelector('.venue-address, [itemprop="address"], address')
                  ?.textContent?.trim() || '';

              const ticketLink =
                document.querySelector('a[href*="ticket"], a[href*="dice.fm"], a[href*="eventbrite"]')
                  ?.href || showUrl;

              return {
                name,
                venue,
                venueAddress,
                date,
                time,
                url: ticketLink,
                description: title,
              };
            }, url);

            if (!show.name || show.name.length < 4) continue;

            if (jsonLdEvent) {
              if (jsonLdEvent.date && jsonLdEvent.date !== 'TBD') show.date = jsonLdEvent.date;
              if (jsonLdEvent.startTime && jsonLdEvent.startTime !== 'TBD') show.time = jsonLdEvent.startTime;
              if (jsonLdEvent.address && jsonLdEvent.address !== 'New York, NY') show.venue = jsonLdEvent.address;
            }

            const looksLikeStreet = (value) =>
              /\d/.test(value) || /\b(st|street|ave|avenue|blvd|boulevard|rd|road)\b/i.test(value);

            if (!looksLikeStreet(show.venue)) {
              if (show.venueAddress && looksLikeStreet(show.venueAddress)) {
                show.venue = show.venueAddress;
              } else if (jsonLdEvent?.address && looksLikeStreet(jsonLdEvent.address)) {
                show.venue = jsonLdEvent.address;
              }
            }

            const isoDate = OhMyRocknessScraper.parseShowDate(show.date);
            if (isoDate !== 'TBD' && isoDate < todayStr) continue;

            results.push({
              ...show,
              date: show.date || 'TBD',
              source: 'oh_my_rockness',
              scrapedAt: new Date().toISOString(),
            });
          } catch (err) {
            logger.warn('omr_show_page_failed', { url, message: err.message });
          }
        }

        return { results, listUrlsFound: uniqueUrls.length };
      });

      const deduped = this._dedupeShows(shows);
      const structure = checkOmrStructure({ count: deduped.length, listUrlsFound });
      if (!structure.ok) {
        logger.warn('scraper_structural_failure', {
          source: 'oh_my_rockness',
          ...structure,
        });
      }

      logger.info('scraper_success', { scraper: 'oh_my_rockness', count: deduped.length });
      return deduped;
    } catch (err) {
      logger.error('scraper_failed', { scraper: 'oh_my_rockness', message: err.message });
      return [];
    }
  }

  _dedupeShows(shows) {
    const filtered = shows.filter((show) => {
      if (!show.name || show.name.length < 4) return false;
      if (isNavJunkTitle(show.name)) return false;
      if (/^(new york city|los angeles|chicago|boston|philadelphia)$/i.test(show.name.trim())) {
        return false;
      }
      if (/win tickets|click to enter|newsletter|sign up|login/i.test(show.name)) return false;
      return true;
    });

    return filtered.filter(
      (show, index, self) =>
        index ===
        self.findIndex(
          (s) =>
            s.name.toLowerCase() === show.name.toLowerCase() &&
            s.date === show.date &&
            s.venue === show.venue
        )
    );
  }

  static parseShowDate(rawDate, referenceDate = new Date()) {
    if (!rawDate || rawDate === 'TBD') return 'TBD';
    const parsed = chrono.parseDate(rawDate, referenceDate, { forwardDate: true });
    if (!parsed) return rawDate;
    return parsed.toISOString().split('T')[0];
  }
}

module.exports = OhMyRocknessScraper;
