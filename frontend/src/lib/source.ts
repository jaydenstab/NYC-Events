const SOURCE_URLS: Record<string, string> = {
  eventbrite: 'https://www.eventbrite.com/d/ny--new-york/events/',
  'nyc-go': 'https://www.nycgo.com/events',
  nycgo: 'https://www.nycgo.com/events',
  'the-skint': 'https://www.theskint.com/',
  theskint: 'https://www.theskint.com/',
  reddit: 'https://www.reddit.com/r/AskNYC/',
  'nyc-parks': 'https://www.nycgovparks.org/events',
  'oh-my-rockness': 'https://www.ohmyrockness.com/',
};

export function getSourceUrl(source: string | null | undefined): string | null {
  if (!source) return null;
  const key = source.toLowerCase().replace(/\s+/g, '-');
  return SOURCE_URLS[key] ?? null;
}

export function humanizeSource(source: string | null | undefined): string {
  if (!source) return '';
  const map: Record<string, string> = {
    eventbrite: 'Eventbrite',
    'nyc-go': 'NYC Go',
    nycgo: 'NYC Go',
    'the-skint': 'The Skint',
    theskint: 'The Skint',
    reddit: 'Reddit',
    'nyc-parks': 'NYC Parks',
    'oh-my-rockness': 'Oh My Rockness',
    'curated-fallback': 'Sample',
  };
  const key = source.toLowerCase().replace(/\s+/g, '-');
  return map[key] || source.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
