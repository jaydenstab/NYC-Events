const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());
const { logger } = require('../logger');
const {
  BROWSER_PAGE_TIMEOUT_MS,
  BROWSER_SCRAPER_TIMEOUT_MS,
  BROWSER_MAX_CONCURRENT_PAGES,
  BROWSER_MAX_RSS_MB,
} = require('../configs/constants');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
];

class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.max) {
      this.current += 1;
      return;
    }
    await new Promise((resolve) => this.queue.push(resolve));
    this.current += 1;
  }

  release() {
    this.current -= 1;
    const next = this.queue.shift();
    if (next) next();
  }
}

class BrowserService {
  constructor() {
    this.browser = null;
    this._launchPromise = null;
    this._pageSemaphore = new Semaphore(BROWSER_MAX_CONCURRENT_PAGES);
  }

  _rssMb() {
    return process.memoryUsage().rss / (1024 * 1024);
  }

  _checkMemory() {
    const rss = this._rssMb();
    if (rss > BROWSER_MAX_RSS_MB) {
      throw new Error(`Browser memory pressure: RSS ${rss.toFixed(0)}MB exceeds ${BROWSER_MAX_RSS_MB}MB`);
    }
  }

  async getBrowser() {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    if (this._launchPromise) {
      return this._launchPromise;
    }

    this._launchPromise = this._doLaunch();
    try {
      return await this._launchPromise;
    } finally {
      this._launchPromise = null;
    }
  }

  async _doLaunch() {
    logger.info('puppeteer_launch_start');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    });

    browser.on('disconnected', () => {
      logger.warn('puppeteer_disconnected_unexpected');
      this.browser = null;
    });

    this.browser = browser;
    logger.info('puppeteer_launch_success');
    return browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('puppeteer_shutdown');
    }
  }

  async withPage(callback) {
    this._checkMemory();
    await this._pageSemaphore.acquire();

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    await page.setUserAgent(ua);

    page.setDefaultNavigationTimeout(BROWSER_PAGE_TIMEOUT_MS);
    page.setDefaultTimeout(BROWSER_PAGE_TIMEOUT_MS);

    const scraperTimeout = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Scraper timeout after ${BROWSER_SCRAPER_TIMEOUT_MS}ms`)),
        BROWSER_SCRAPER_TIMEOUT_MS
      );
    });

    try {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 2000));
      return await Promise.race([callback(page), scraperTimeout]);
    } catch (err) {
      logger.error('puppeteer_page_action_failed', { message: err.message });
      throw err;
    } finally {
      try {
        await page.close();
      } catch (closeErr) {
        logger.warn('puppeteer_page_close_failed', { message: closeErr.message });
      }
      this._pageSemaphore.release();
    }
  }
}

module.exports = new BrowserService();
