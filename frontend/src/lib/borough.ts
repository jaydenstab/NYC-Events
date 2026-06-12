const BOROUGH_PATTERNS: Array<{ borough: string; pattern: RegExp }> = [
  { borough: 'Manhattan', pattern: /\b(manhattan|new york,?\s*ny)\b/i },
  { borough: 'Brooklyn', pattern: /\bbrooklyn\b/i },
  { borough: 'Queens', pattern: /\bqueens\b/i },
  { borough: 'Bronx', pattern: /\b(bronx|the bronx)\b/i },
  { borough: 'Staten Island', pattern: /\bstaten island\b/i },
];

export function parseBorough(address: string): string | null {
  if (!address) return null;
  for (const { borough, pattern } of BOROUGH_PATTERNS) {
    if (pattern.test(address)) return borough;
  }
  return null;
}
