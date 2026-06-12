const axios = require('axios');
const cheerio = require('cheerio');
const chrono = require('chrono-node');
const browserService = require('./services/browserService');
const { logger } = require('./logger');
const { isNavJunkTitle } = require('./utils/blocklist');
const { parseJsonLd } = require('./utils/jsonLdParser');

const EVENTBRITE_URL = 'https://www.eventbrite.com/d/ny--new-york/free--food-and-drink--events/';
const MAX_EVENTS = 25;
const DEFAULT_ADDRESS = 'New York, NY';
const GENERIC_DESC_SUFFIX = ' — NYC free event';
const BATCH_SIZE = 3;
const HTML_SNAPSHOT_LEN = 2048;

const BOT_BLOCK_PATTERNS = [
  /cf-browser-verification/i,
  /challenge-platform/i,
  /attention required/i,
  /just a moment/i,
  /enable javascript and cookies/i,
];

class EventbriteScraper {
  async scrapeEvents() {
    logger.info('scraper_start', { source: 'eventbrite', url: EVENTBRITE_URL });

    let events = await this._scrapeWithAxios();
    let listingMethod = events.length > 0 ? 'axios_html' : null;
    const axiosIncomplete = this._incompleteRate(events);

    // Axios often returns card shells without dates; prefer Puppeteer when quality is low
    if (events.length === 0 || axiosIncomplete > 0.25) {
      const puppeteerResult = await this._scrapeWithPuppeteer();
      if (puppeteerResult.events.length > 0) {
        const puppeteerIncomplete = this._incompleteRate(puppeteerResult.events);
        if (events.length === 0 || puppeteerIncomplete < axiosIncomplete) {
          events = puppeteerResult.events;
          listingMethod = puppeteerResult.method;
        } else {
          events = this._mergeEventLists(events, puppeteerResult.events);
          listingMethod = 'merged';
        }
      }
    }

    logger.info('listing_extraction', {
      source: 'eventbrite',
      method: listingMethod || 'none',
      count: events.length,
      incomplete_rate: this._incompleteRate(events).toFixed(2),
    });

    let deepEvents = await this._enrichEvents(events);

    // Re-fetch detail pages for stale DB rows no longer on the listing page
    const backfilled = await this.backfillIncompleteFromDb();
    if (backfilled.length > 0) {
      deepEvents = this._mergeEventLists(deepEvents, backfilled);
      logger.info('eventbrite_backfill', { count: backfilled.length });
    }

    logger.info('scraper_done', { source: 'eventbrite', count: deepEvents.length });
    return deepEvents.slice(0, MAX_EVENTS);
  }

  /**
   * Re-enrich Eventbrite events already in DB with TBD / placeholder fields.
   */
  async backfillIncompleteFromDb(max = 15) {
    const dbService = require('./services/dbService');
    let all = [];
    try {
      all = await dbService.getAllEvents();
    } catch (err) {
      logger.warn('eventbrite_backfill_db_failed', { message: err.message });
      return [];
    }

    const stale = all
      .filter(
        (e) =>
          e.source === 'eventbrite' &&
          e.website &&
          (e.date === 'TBD' ||
            e.address === DEFAULT_ADDRESS ||
            this._isGenericDescription(e.description, e.name))
      )
      .slice(0, max);

    if (stale.length === 0) return [];

    logger.info('eventbrite_backfill_start', { count: stale.length });

    const stubs = stale.map((e) => ({
      name: e.name,
      description: e.description,
      date: e.date,
      startTime: e.startTime,
      address: e.address,
      price: e.price,
      website: e.website,
      category: e.category || 'Food & Drink',
      source: 'eventbrite',
      scrapedAt: new Date().toISOString(),
    }));

    await this._enrichEvents(stubs);
    return stubs.filter(
      (e) =>
        e.date !== 'TBD' ||
        e.address !== DEFAULT_ADDRESS ||
        !this._isGenericDescription(e.description, e.name)
    );
  }

  _incompleteRate(events) {
    if (!events.length) return 0;
    const incomplete = events.filter(
      (e) => e.date === 'TBD' || e.address === DEFAULT_ADDRESS
    ).length;
    return incomplete / events.length;
  }

  _completenessScore(ev) {
    let score = 0;
    if (ev.date && ev.date !== 'TBD') score += 2;
    if (ev.address && ev.address !== DEFAULT_ADDRESS) score += 2;
    if (!this._isGenericDescription(ev.description, ev.name)) score += 1;
    return score;
  }

  _mergeEventLists(...lists) {
    const byUrl = new Map();
    for (const list of lists) {
      for (const ev of list) {
        const key = (ev.website || '').split('?')[0].toLowerCase();
        if (!key) continue;
        const existing = byUrl.get(key);
        if (!existing || this._completenessScore(ev) > this._completenessScore(existing)) {
          byUrl.set(key, ev);
        }
      }
    }
    return [...byUrl.values()];
  }

  async _scrapeWithAxios() {
    try {
      const response = await axios.get(EVENTBRITE_URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
      });
      return this._parseHtml(response.data, 'axios_html');
    } catch (err) {
      logger.warn('eventbrite_axios_failed', { message: err.message });
      return [];
    }
  }

  async _scrapeWithPuppeteer() {
    try {
      return await browserService.withPage(async (page) => {
        const apiEvents = [];
        const onResponse = async (response) => {
          try {
            const url = response.url();
            const contentType = response.headers()['content-type'] || '';
            if (!url.includes('/api/v3/') || !contentType.includes('json')) return;
            const json = await response.json();
            apiEvents.push(...this._parseApiResponse(json));
          } catch {
            // ignore parse errors on individual responses
          }
        };

        page.on('response', onResponse);
        await page.goto(EVENTBRITE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
        page.off('response', onResponse);

        if (apiEvents.length > 0) {
          return { events: this._dedupeEvents(apiEvents), method: 'api_intercept' };
        }

        const html = await page.content();
        const htmlEvents = this._parseHtml(html, 'puppeteer_html');
        return { events: htmlEvents, method: htmlEvents.length > 0 ? 'puppeteer_html' : 'none' };
      });
    } catch (err) {
      logger.warn('eventbrite_puppeteer_failed', { message: err.message });
      return { events: [], method: 'failed' };
    }
  }

  /**
   * Parse Eventbrite internal API JSON (destination search, event detail, etc.)
   */
  _parseApiResponse(json) {
    const events = [];
    const candidates = this._collectApiEventNodes(json);

    for (const node of candidates) {
      const mapped = this._mapApiEvent(node);
      if (mapped) events.push(mapped);
    }

    return events;
  }

  _collectApiEventNodes(data, out = [], depth = 0) {
    if (data == null || depth > 8) return out;

    if (Array.isArray(data)) {
      data.forEach((item) => this._collectApiEventNodes(item, out, depth + 1));
      return out;
    }

    if (typeof data !== 'object') return out;

    const hasEventShape =
      (data.name || data.title) &&
      (data.start_date ||
        data.startDate ||
        data.start ||
        data.start_time ||
        data.url ||
        data.eventbrite_event_id ||
        data.id);

    if (hasEventShape && (data.url || data.eventbrite_event_id || data.id)) {
      out.push(data);
    }

    const nestedKeys = [
      'events',
      'results',
      'data',
      'items',
      'event',
      'body',
      'content',
      'event_list',
    ];
    for (const key of nestedKeys) {
      if (data[key] != null) {
        this._collectApiEventNodes(data[key], out, depth + 1);
      }
    }

    return out;
  }

  _mapApiEvent(node) {
    const name = (node.name || node.title || '').trim();
    if (!name || name.length < 5 || isNavJunkTitle(name)) return null;

    const startRaw =
      node.start_date ||
      node.startDate ||
      node.start?.local ||
      node.start?.utc ||
      node.start_time ||
      node.start;

    const { date, startTime } = this._parseDateTime(startRaw);

    const venue =
      node.primary_venue ||
      node.venue ||
      node.location ||
      node.venue_info ||
      {};

    const address = this._formatApiAddress(venue, node);

    let website = node.url || node.public_url || node.event_url || '';
    if (!website && node.eventbrite_event_id) {
      website = `https://www.eventbrite.com/e/${node.eventbrite_event_id}`;
    }
    if (website && !website.startsWith('http')) {
      website = `https://www.eventbrite.com${website.startsWith('/') ? '' : '/'}${website}`;
    }

    const isFree =
      node.is_free === true ||
      node.isFree === true ||
      node.ticket_availability?.is_free ||
      node.ticket_availability?.minimum_ticket_price?.major_value === '0';

    const price = isFree ? 'Free' : node.ticket_availability?.minimum_ticket_price?.display || 'Check details';

    const description =
      (node.summary || node.description || node.short_description || '').trim() ||
      `${name}${GENERIC_DESC_SUFFIX}`;

    return {
      name,
      description,
      date,
      startTime,
      address,
      price,
      website: website.split('?')[0],
      category: 'Food & Drink',
      source: 'eventbrite',
      scrapedAt: new Date().toISOString(),
      extractionMethod: 'api_intercept',
    };
  }

  _formatApiAddress(venue, node) {
    if (typeof venue === 'string' && venue.trim()) return venue.trim();

    const parts = [
      venue.name,
      venue.address?.localized_address_display,
      venue.address?.address_1,
      venue.address?.address_2,
      venue.address?.city,
      venue.address?.region,
      venue.address?.postal_code,
      node.address?.localized_address_display,
      node.address?.address_1,
      node.address?.city,
    ].filter(Boolean);

    if (parts.length > 0) return parts.join(', ');
    return DEFAULT_ADDRESS;
  }

  async _enrichEvents(events) {
    const targets = events
      .filter((ev) => ev.website && (ev.date === 'TBD' || ev.address === DEFAULT_ADDRESS))
      .slice(0, MAX_EVENTS);

    if (targets.length === 0) return events;

    logger.info('enrichment_start', { count: targets.length });

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (event) => {
          try {
            await browserService.withPage(async (page) => {
              const apiEvents = [];
              const onResponse = async (response) => {
                try {
                  const url = response.url();
                  const contentType = response.headers()['content-type'] || '';
                  if (!url.includes('/api/v3/') || !contentType.includes('json')) return;
                  const json = await response.json();
                  apiEvents.push(...this._parseApiResponse(json));
                } catch {
                  // ignore
                }
              };

              page.on('response', onResponse);
              await page.goto(event.website, { waitUntil: 'networkidle2', timeout: 15000 });
              page.off('response', onResponse);

              const html = await page.content();
              const botBlocked = this._isBotBlocked(html);

              if (apiEvents.length > 0) {
                this._mergeDetail(event, apiEvents[0], 'api_intercept');
                this._logExtraction(event, 'api_intercept');
                return;
              }

              const $ = cheerio.load(html);
              const ldEvents = parseJsonLd($, 'eventbrite');
              if (ldEvents.length > 0) {
                this._mergeDetail(event, ldEvents[0], 'json_ld');
                this._logExtraction(event, 'json_ld');
                return;
              }

              const domDetail = this._parseDetailDom($);
              if (domDetail.date !== 'TBD' || domDetail.address !== DEFAULT_ADDRESS) {
                this._mergeDetail(event, domDetail, 'dom');
                this._logExtraction(event, 'dom');
                return;
              }

              const reason = botBlocked ? 'bot_blocked' : 'parse_failure';
              logger.warn('enrichment_failed', {
                url: event.website,
                reason,
                html_snapshot: html.slice(0, HTML_SNAPSHOT_LEN),
              });
              this._logExtraction(event, 'failed', { reason });
            });
          } catch (err) {
            const reason = err.message?.includes('timeout') ? 'timeout' : 'error';
            logger.warn('enrichment_failed', {
              url: event.website,
              reason,
              message: err.message,
            });
            this._logExtraction(event, 'failed', { reason });
          }
        })
      );
    }

    return events;
  }

  _mergeDetail(event, detail, method) {
    if (detail.date && detail.date !== 'TBD') event.date = detail.date;
    if (detail.startTime && detail.startTime !== 'TBD') event.startTime = detail.startTime;
    if (detail.address && detail.address !== DEFAULT_ADDRESS) event.address = detail.address;
    if (detail.description && !this._isGenericDescription(event.description, event.name)) {
      event.description = detail.description;
    } else if (detail.description && this._isGenericDescription(event.description, event.name)) {
      event.description = detail.description;
    }
    if (detail.price) {
      event.price =
        detail.price === '0' || detail.price === '0.0' || detail.price === 0 ? 'Free' : detail.price;
    }
    event.extractionMethod = method;
  }

  _parseDetailDom($) {
    const dateText =
      $('time[datetime]').first().attr('datetime') ||
      $('time').first().text().trim() ||
      $('[data-testid="event-date"]').text().trim() ||
      $('meta[itemprop="startDate"]').attr('content') ||
      '';

    const { date, startTime } = this._parseDateTime(dateText);

    const loc =
      $('address').first().text().trim() ||
      $('[data-testid="location-info"]').text().trim() ||
      $('[class*="location-info"]').first().text().trim() ||
      $('meta[itemprop="streetAddress"]').attr('content') ||
      '';

    let address = DEFAULT_ADDRESS;
    if (loc) {
      address = loc.includes('NY') ? loc : `${loc}, New York, NY`;
    }

    const description =
      $('[data-testid="event-description"]').text().trim() ||
      $('meta[itemprop="description"]').attr('content') ||
      $('.structured-content-rich-text').first().text().trim() ||
      '';

    const text = $('body').text().toLowerCase();
    const price = text.includes('free') ? 'Free' : 'Check details';

    return { date, startTime, address, description, price };
  }

  _parseHtml(html, method = 'html') {
    const $ = cheerio.load(html);
    const seen = new Set();
    const results = [];

    parseJsonLd($, 'eventbrite').forEach((ev) => {
      if (ev.name && ev.name.length >= 5 && !isNavJunkTitle(ev.name)) {
        const key = `${ev.name}|${ev.date}|${ev.website}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ ...ev, extractionMethod: 'json_ld', category: 'Food & Drink' });
        }
      }
    });

    $('a[href*="eventbrite.com/e/"]').each((_, anchor) => {
      const $a = $(anchor);
      const card =
        $a.closest('[data-testid="event-card"], article, li, [class*="EventCard"], [class*="event-card"]') ||
        $a.parent();
      const $el = card.length ? card : $a;

      const name =
        $el.find('h2, h3, h4, [data-testid*="title"]').first().text().trim() ||
        $a.text().trim();
      if (!name || name.length < 5 || isNavJunkTitle(name)) return;
      if (results.some((r) => r.name === name)) return;

      const website = $a.attr('href') || '';
      const dateText =
        $el.find('[data-event-start-date]').attr('data-event-start-date') ||
        $el.find('meta[itemprop="startDate"]').attr('content') ||
        $el.find('time[datetime]').attr('datetime') ||
        $el.find('time').first().text().trim() ||
        '';

      const locationText =
        $el.find('address, [data-testid*="location"], p').first().text().trim() || DEFAULT_ADDRESS;

      const { date, startTime } = this._parseDateTime(dateText);
      const text = $el.text().toLowerCase();
      const price = text.includes('free') ? 'Free' : (text.match(/\$\d+/) || ['Check details'])[0];

      const key = `${name}|${date}|${website}`;
      if (seen.has(key)) return;
      seen.add(key);

      results.push({
        name,
        description: `${name}${GENERIC_DESC_SUFFIX}`,
        date,
        startTime,
        address: locationText.includes('NY') ? locationText : `${locationText}, New York, NY`,
        price,
        website,
        category: 'Food & Drink',
        source: 'eventbrite',
        scrapedAt: new Date().toISOString(),
        extractionMethod: method,
      });
    });

    return results;
  }

  _parseDateTime(dateText) {
    if (!dateText) return { date: 'TBD', startTime: 'TBD' };

    if (typeof dateText === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateText)) {
      const d = new Date(dateText);
      if (!Number.isNaN(d.getTime())) {
        return {
          date: d.toISOString().split('T')[0],
          startTime: formatStartTime(d),
        };
      }
    }

    const parsed = chrono.parse(String(dateText));
    if (parsed.length === 0) return { date: 'TBD', startTime: 'TBD' };
    const start = parsed[0].start.date();
    return {
      date: start.toISOString().split('T')[0],
      startTime: parsed[0].start.isCertain('hour')
        ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : 'TBD',
    };
  }

  _dedupeEvents(events) {
    const seen = new Set();
    return events.filter((ev) => {
      const key = `${ev.name}|${ev.date}|${ev.website}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  _isBotBlocked(html) {
    const sample = html.slice(0, HTML_SNAPSHOT_LEN).toLowerCase();
    return BOT_BLOCK_PATTERNS.some((re) => re.test(sample));
  }

  _isGenericDescription(description, name) {
    if (!description) return true;
    return description === `${name}${GENERIC_DESC_SUFFIX}` || description.endsWith(GENERIC_DESC_SUFFIX);
  }

  _logExtraction(event, method, extra = {}) {
    const fieldsComplete = {
      date: event.date !== 'TBD',
      address: event.address !== DEFAULT_ADDRESS,
      description: !this._isGenericDescription(event.description, event.name),
    };
    const fieldsTbd = Object.entries(fieldsComplete)
      .filter(([, ok]) => !ok)
      .map(([field]) => field);

    logger.info('extraction_result', {
      source: 'eventbrite',
      event: event.name,
      method,
      fields_complete: fieldsComplete,
      fields_tbd: fieldsTbd,
      ...extra,
    });
  }
}

function formatStartTime(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

module.exports = EventbriteScraper;
