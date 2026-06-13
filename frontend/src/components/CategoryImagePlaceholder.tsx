import React from 'react';
import { categoryConfig } from '@/types/Event';
import { getCategoryIcon } from '@/lib/categoryIcons';

interface CategoryImagePlaceholderProps {
  category: string;
  eventId?: string;
  className?: string;
}

function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

const CategoryImagePlaceholder: React.FC<CategoryImagePlaceholderProps> = ({
  category,
  eventId = '',
  className = '',
}) => {
  const config = categoryConfig[category] || categoryConfig.other;
  const Icon = getCategoryIcon(category);
  const hue = hashHue(eventId || category);

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 45% 28%) 0%, ${config.color}88 100%)`,
      }}
      aria-hidden
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-40">
        <Icon className="w-8 h-8 text-white" />
      </div>
    </div>
  );
};

export default React.memo(CategoryImagePlaceholder);
