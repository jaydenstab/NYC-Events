import { describe, it, expect, vi } from 'vitest';
import { ensureEventPinImage, EVENT_PIN_IMAGE_ID } from './mapPinImage';

describe('ensureEventPinImage', () => {
  it('skips add when image already exists', async () => {
    const map = {
      hasImage: vi.fn(() => true),
      addImage: vi.fn(),
    };
    await ensureEventPinImage(map as never);
    expect(map.addImage).not.toHaveBeenCalled();
  });

  it('loads pin image when missing', async () => {
    class MockImage {
      width = 32;
      height = 40;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', MockImage as unknown as typeof Image);

    const map = {
      hasImage: vi.fn(() => false),
      addImage: vi.fn(),
    };
    await ensureEventPinImage(map as never);
    expect(map.addImage).toHaveBeenCalledWith(
      EVENT_PIN_IMAGE_ID,
      expect.any(MockImage),
      expect.objectContaining({ sdf: true })
    );
  });
});
