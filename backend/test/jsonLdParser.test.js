const { describe, it } = require('node:test');
const assert = require('node:assert');
const cheerio = require('cheerio');
const {
  parseJsonLd,
  collectEventItems,
  itemToEvent,
  formatAddress,
} = require('../utils/jsonLdParser');

describe('jsonLdParser', () => {
  it('traverses @graph and extracts Event nodes', () => {
    const payload = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', name: 'ignored' },
        {
          '@type': 'Event',
          name: 'Graph Event',
          startDate: '2026-06-06T18:00:00-04:00',
          location: { address: '123 Main St, Brooklyn, NY' },
        },
      ],
    };
    const items = collectEventItems(payload);
    assert.strictEqual(items.length, 1);
    const event = itemToEvent(items[0], 'test');
    assert.strictEqual(event.name, 'Graph Event');
    assert.strictEqual(event.date, '2026-06-06');
    assert.ok(event.address.includes('123 Main St'));
  });

  it('handles ItemList > itemListElement > item nesting', () => {
    const payload = {
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          item: {
            '@type': 'Event',
            name: 'Listed Event',
            startDate: '2026-07-01T12:00:00-04:00',
            location: 'Central Park, New York, NY',
          },
        },
      ],
    };
    const $ = cheerio.load(
      `<script type="application/ld+json">${JSON.stringify(payload)}</script>`
    );
    const events = parseJsonLd($, 'test');
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].name, 'Listed Event');
    assert.ok(events[0].address.includes('Central Park'));
  });

  it('formats string and PostalAddress locations', () => {
    assert.strictEqual(formatAddress('839 Broadway, Brooklyn'), '839 Broadway, Brooklyn');
    assert.ok(
      formatAddress({
        name: 'Venue',
        address: { streetAddress: '79 N 11th St', addressLocality: 'Brooklyn' },
      }).includes('79 N 11th St')
    );
  });

  it('parses offers array with free price', () => {
    const event = itemToEvent(
      {
        '@type': 'Event',
        name: 'Free Night',
        startDate: '2026-06-01T20:00:00-04:00',
        offers: [{ price: 0 }],
      },
      'test'
    );
    assert.strictEqual(event.price, 'Free');
  });
});
