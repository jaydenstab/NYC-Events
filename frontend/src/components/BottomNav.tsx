import React from 'react';
import { Compass, Heart, User } from 'lucide-react';

export type AppTab = 'discover' | 'saved' | 'profile';

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  savedCount?: number;
  hidden?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  savedCount = 0,
  hidden = false,
}) => {
  if (hidden) return null;

  const tabClass = (tab: AppTab) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-semibold transition-colors ${
      activeTab === tab ? 'text-primary' : 'text-muted-foreground'
    }`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1001] border-t border-border bg-surface-elevated/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        <button
          type="button"
          className={tabClass('discover')}
          aria-current={activeTab === 'discover' ? 'page' : undefined}
          onClick={() => onTabChange('discover')}
        >
          <Compass className="w-5 h-5" aria-hidden />
          Discover
        </button>
        <button
          type="button"
          className={tabClass('saved')}
          aria-current={activeTab === 'saved' ? 'page' : undefined}
          onClick={() => onTabChange('saved')}
        >
          <span className="relative">
            <Heart className="w-5 h-5" aria-hidden />
            {savedCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-primary text-[8px] text-primary-foreground font-bold flex items-center justify-center">
                {savedCount > 99 ? '99+' : savedCount}
              </span>
            )}
          </span>
          Saved
        </button>
        <button
          type="button"
          className={tabClass('profile')}
          aria-current={activeTab === 'profile' ? 'page' : undefined}
          onClick={() => onTabChange('profile')}
        >
          <User className="w-5 h-5" aria-hidden />
          Profile
        </button>
      </div>
    </nav>
  );
};

export default React.memo(BottomNav);
