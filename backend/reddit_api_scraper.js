const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const { logger } = require('./logger');

/**
 * Reddit API-based event scraper using the official Reddit API
 */
class RedditAPIScraper {
  constructor() {
    this.baseURL = 'https://www.reddit.com';
    this.genAI = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null;
    this.model = this.genAI
      ? this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      : null;
  }

  async fetchRedditPosts() {
    try {
      logger.info('reddit_fetch_start');

      const response = await axios.get(`${this.baseURL}/r/nyc.json`, {
        headers: {
          'User-Agent': 'WhatsUpNYC-EventBot/1.0 (Educational Purpose)',
        },
        timeout: 15000,
      });

      const posts = response.data.data.children.map((child) => child.data);
      logger.info('reddit_fetch_done', { count: posts.length });

      return posts;
    } catch (error) {
      logger.warn('reddit_fetch_failed', { message: error.message });
      return [];
    }
  }

  async extractEventsFromPosts(posts) {
    if (!this.model) {
      logger.warn('reddit_extract_skipped', { reason: 'no_gemini_key' });
      return [];
    }

    try {
      logger.info('reddit_gemini_extract_start', { postCount: posts.length });

      const postData = posts.slice(0, 25).map((post) => ({
        title: post.title,
        selftext: post.selftext,
        author: post.author,
        created_utc: new Date(post.created_utc * 1000).toISOString(),
        url: `https://reddit.com${post.permalink}`,
        score: post.score,
        num_comments: post.num_comments,
      }));

      const prompt = `You are an expert data extraction bot specializing in finding ACTUAL EVENTS posted on Reddit. Analyze the following Reddit posts from r/nyc.

CRITICAL: Only extract posts that are clearly about specific, dateable events that people can attend. Examples:
- Concerts, shows, performances
- Meetups, gatherings, social events  
- Festivals, fairs, markets
- Free classes, workshops, talks
- Sports events, games
- Community events, fundraisers

DO NOT extract:
- General news articles
- Political discussions
- Random questions or complaints
- Discussion threads
- "Things to do" lists (unless they contain specific events)
- General advice or help requests

For each ACTUAL EVENT you find, extract:
- event_title: The specific event name/title
- potential_date: Specific date mentioned
- potential_location: Specific venue or location
- potential_time: Specific time mentioned
- reddit_url: The Reddit URL
- confidence: Your confidence (1-10) that this is a real event

Return ONLY a JSON array of actual events. If no real events are found, return an empty array [].

Reddit posts to analyze:
${JSON.stringify(postData, null, 2)}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const events = JSON.parse(jsonText);
        return events;
      } catch (parseError) {
        logger.warn('reddit_gemini_parse_failed', { message: parseError.message });
        if (process.env.NODE_ENV !== 'production') {
          logger.debug('reddit_gemini_raw_response', { text: text.slice(0, 500) });
        }
        return [];
      }
    } catch (error) {
      logger.warn('reddit_gemini_extract_failed', { message: error.message });
      return [];
    }
  }

  async scrapeEvents() {
    try {
      logger.info('reddit_scrape_start');

      if (!process.env.GEMINI_API_KEY) {
        logger.warn('reddit_scrape_skipped', { reason: 'missing_gemini_api_key' });
        return [];
      }

      const posts = await this.fetchRedditPosts();
      if (posts.length === 0) return [];

      const events = await this.extractEventsFromPosts(posts);

      logger.info('reddit_scrape_done', { count: events.length });
      return events;
    } catch (error) {
      logger.error('reddit_scrape_failed', { message: error.message });
      return [];
    }
  }
}

if (require.main === module) {
  const scraper = new RedditAPIScraper();
  scraper.scrapeEvents().catch((err) => {
    logger.error('reddit_cli_failed', { message: err.message });
    process.exit(1);
  });
}

module.exports = RedditAPIScraper;
