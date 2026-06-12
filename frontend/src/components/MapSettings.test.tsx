import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import MapSettings from './MapSettings';

function renderSettings(overrides: Partial<React.ComponentProps<typeof MapSettings>> = {}) {
  const onToggle = vi.fn();
  const onAppearanceChange = vi.fn();
  const onIs3DChange = vi.fn();

  const props: React.ComponentProps<typeof MapSettings> = {
    isOpen: true,
    onToggle,
    appearance: 'light',
    onAppearanceChange,
    is3D: true,
    onIs3DChange,
    listOnlyMode: false,
    ...overrides,
  };

  const view = render(<MapSettings {...props} />);
  return { ...view, onToggle, onAppearanceChange, onIs3DChange };
}

describe('MapSettings', () => {
  afterEach(() => cleanup());

  it('calls onAppearanceChange when appearance button clicked and stays open', () => {
    const { onAppearanceChange, onToggle } = renderSettings();
    const dialog = screen.getByRole('dialog', { name: /map settings/i });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dark' }));
    expect(onAppearanceChange).toHaveBeenCalledWith('dark');
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('calls onAppearanceChange for satellite', () => {
    const { onAppearanceChange } = renderSettings();
    const dialog = screen.getByRole('dialog', { name: /map settings/i });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Satellite' }));
    expect(onAppearanceChange).toHaveBeenCalledWith('satellite');
  });

  it('closes when clicking outside the panel', () => {
    const { onToggle } = renderSettings();
    fireEvent.click(document.body);
    expect(onToggle).toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const { onToggle } = renderSettings();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onToggle).toHaveBeenCalled();
  });

  it('fires onIs3DChange when 3D checkbox toggled', () => {
    const { onIs3DChange } = renderSettings();
    const dialog = screen.getByRole('dialog', { name: /map settings/i });
    fireEvent.click(within(dialog).getByLabelText(/3D buildings/i));
    expect(onIs3DChange).toHaveBeenCalledWith(false);
  });

  it('does not render dialog when closed', () => {
    renderSettings({ isOpen: false });
    expect(screen.queryByRole('dialog', { name: /map settings/i })).not.toBeInTheDocument();
  });
});
