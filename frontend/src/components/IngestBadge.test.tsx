import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import IngestBadge from './IngestBadge';

describe('IngestBadge', () => {
  it('uses semantic primary tokens when sources are degraded', () => {
    const { container } = render(
      <IngestBadge active={false} degradedSources={['Eventbrite']} />
    );
    expect(screen.getByText('Updating')).toBeInTheDocument();
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toMatch(/bg-primary\/10/);
    expect(badge.className).not.toMatch(/orange-50/);
    expect(badge.className).not.toMatch(/dark:/);
  });

  it('uses status-success tokens when live in dev', () => {
    const { container } = render(<IngestBadge active degradedSources={[]} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toMatch(/bg-status-success\/10/);
    expect(badge.className).not.toMatch(/emerald-50/);
  });
});
