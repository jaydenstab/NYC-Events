import React from 'react';
import { X, Map, Search, MousePointerClick, Heart } from 'lucide-react';
import DiscoverySuggestions from './DiscoverySuggestions';
import { dismissOnboarding } from '@/lib/onboarding';

interface OnboardingBannerProps {
  onDismiss: () => void;
  onExampleSearch: (query: string) => void;
}

const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ onDismiss, onExampleSearch }) => {
  const handleDismiss = () => {
    dismissOnboarding();
    onDismiss();
  };

  return (
    <div className="mx-5 mb-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 text-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="font-bold text-foreground">Welcome to WhatsUpNYC</p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss onboarding"
          className="shrink-0 p-1 rounded-lg hover:bg-black/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="space-y-2 text-muted-foreground mb-3">
        <li className="flex items-center gap-2">
          <Map className="w-4 h-4 shrink-0 text-primary" aria-hidden />
          Explore NYC events on the map
        </li>
        <li className="flex items-center gap-2">
          <Search className="w-4 h-4 shrink-0 text-primary" aria-hidden />
          Search naturally — try an example below
        </li>
        <li className="flex items-center gap-2">
          <MousePointerClick className="w-4 h-4 shrink-0 text-primary" aria-hidden />
          Tap a pin or card for details
        </li>
        <li className="flex items-center gap-2">
          <Heart className="w-4 h-4 shrink-0 text-primary" aria-hidden />
          Tap ♥ to save events — find them anytime with the saved filter
        </li>
      </ul>
      <DiscoverySuggestions variant="onboarding" onSelect={onExampleSearch} />
    </div>
  );
};

export default React.memo(OnboardingBanner);
