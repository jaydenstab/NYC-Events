export function openDirections(address: string): void {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

export function openInMaps(lat: number, lng: number, label?: string): void {
  const query = label ? `${lat},${lng} (${label})` : `${lat},${lng}`;
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    '_blank',
    'noopener,noreferrer'
  );
}
