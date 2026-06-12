import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OfflineBanner from './OfflineBanner';

describe('OfflineBanner', () => {
  it('renders when visible and retries', () => {
    const onRetry = vi.fn();
    render(<OfflineBanner visible onRetry={onRetry} />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders nothing when hidden', () => {
    const { container } = render(<OfflineBanner visible={false} />);
    expect(container.firstChild).toBeNull();
  });
});
