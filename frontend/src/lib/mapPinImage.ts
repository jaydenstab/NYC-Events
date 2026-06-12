import type mapboxgl from 'mapbox-gl';

export const EVENT_PIN_IMAGE_ID = 'event-pin';

/** Teardrop marker — black fill for SDF tinting via icon-color */
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
  <path fill="#000000" d="M16 0C9.373 0 4 5.373 4 12c0 8.5 12 28 12 28s12-19.5 12-28C28 5.373 22.627 0 16 0zm0 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
</svg>`;

export function ensureEventPinImage(map: mapboxgl.Map): Promise<void> {
  if (map.hasImage(EVENT_PIN_IMAGE_ID)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const img = new Image(32, 40);
    img.onload = () => {
      try {
        if (!map.hasImage(EVENT_PIN_IMAGE_ID)) {
          map.addImage(EVENT_PIN_IMAGE_ID, img, { sdf: true, pixelRatio: 2 });
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load event pin image'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PIN_SVG)}`;
  });
}
