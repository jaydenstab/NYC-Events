export type EventLinkKind = 'event' | 'search';

export type LocationQuality =
  | 'geocoded'
  | 'fallback'
  | 'default'
  | 'pending'
  | 'venue_cache'
  | 'batch'
  | 'db_cache'
  | 'osm'
  | 'mapbox'
  | 'canonical';

export interface Event {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address: string;
  time: string;
  date: string | null;
  price: string;
  description: string;
  website?: string | null;
  /** Derived from website URL — search fallbacks vs real event pages */
  linkKind?: EventLinkKind | null;
  source?: string;
  locationQuality?: LocationQuality;
  score?: number;
  /** Phase B — optional until backend provides */
  imageUrl?: string | null;
  venue?: string | null;
  borough?: string | null;
}

export type EventCategory = 
  | 'music' 
  | 'art' 
  | 'food & drink' 
  | 'comedy' 
  | 'free' 
  | 'free food' 
  | 'influencers' 
  | 'heritage' 
  | 'sports' 
  | 'education' 
  | 'health & wellness' 
  | 'technology' 
  | 'business' 
  | 'theater' 
  | 'broadway' 
  | 'entertainment' 
  | 'performance' 
  | 'community' 
  | 'cultural' 
  | 'networking' 
  | 'workshop' 
  | 'tour' 
  | 'outdoor' 
  | 'family' 
  | 'nightlife' 
  | 'shopping' 
  | 'fashion' 
  | 'photography' 
  | 'gaming' 
  | 'other';

export const categories: string[] = [
  'all',
  'music',
  'art',
  'food & drink',
  'comedy',
  'free',
  'sports',
  'education',
  'health & wellness',
  'technology',
  'theater',
  'outdoor',
  'nightlife',
  'saved',
  'other'
];

export interface CategoryConfig {
  color: string;
  emoji: string;
}

export const categoryConfig: Record<string, CategoryConfig> = {
  'music': { color: '#FF6B6B', emoji: '🎵' },
  'art': { color: '#4ECDC4', emoji: '🎨' },
  'food & drink': { color: '#45B7D1', emoji: '🍽️' },
  'comedy': { color: '#96CEB4', emoji: '😂' },
  'free': { color: '#FFEAA7', emoji: '🆓' },
  'free food': { color: '#FFA500', emoji: '🍎' },
  'influencers': { color: '#E91E63', emoji: '📱' },
  'heritage': { color: '#8B4513', emoji: '🏛️' },
  'sports': { color: '#FF5722', emoji: '⚽' },
  'education': { color: '#2196F3', emoji: '📚' },
  'health & wellness': { color: '#4CAF50', emoji: '🧘' },
  'technology': { color: '#9C27B0', emoji: '💻' },
  'business': { color: '#607D8B', emoji: '💼' },
  'theater': { color: '#FF9800', emoji: '🎭' },
  'broadway': { color: '#FF9800', emoji: '🎭' },
  'entertainment': { color: '#E91E63', emoji: '🎪' },
  'performance': { color: '#FF9800', emoji: '🎭' },
  'community': { color: '#4CAF50', emoji: '🤝' },
  'cultural': { color: '#8B4513', emoji: '🏛️' },
  'networking': { color: '#607D8B', emoji: '🤝' },
  'workshop': { color: '#2196F3', emoji: '🔧' },
  'tour': { color: '#795548', emoji: '🚶' },
  'outdoor': { color: '#4CAF50', emoji: '🌳' },
  'family': { color: '#FFC107', emoji: '👨‍👩‍👧‍👦' },
  'saved': { color: '#FF2D55', emoji: '❤️' },
  'nightlife': { color: '#673AB7', emoji: '🌃' },
  'shopping': { color: '#FF5722', emoji: '🛍️' },
  'fashion': { color: '#E91E63', emoji: '👗' },
  'photography': { color: '#607D8B', emoji: '📸' },
  'gaming': { color: '#9C27B0', emoji: '🎮' },
  'other': { color: '#DDA0DD', emoji: '📍' }
};
