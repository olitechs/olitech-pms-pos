import React from 'react';
import {
  LayoutDashboard, UtensilsCrossed, CalendarCheck, Users, ChefHat,
  BedDouble, PackageSearch, Sparkles, Wrench, BarChart3, Settings, LayoutGrid, IdCard, Hotel,
} from 'lucide-react';
import { MODULES } from '@/data/platformData';
import { NAVY, BORDER_DARK, TEAL_LIGHT, MUTED_DARK } from '@/data/themePalette';

const ICON_MAP = {
  LayoutDashboard, UtensilsCrossed, CalendarCheck, Users, ChefHat,
  BedDouble, PackageSearch, Sparkles, Wrench, BarChart3, Settings, LayoutGrid, IdCard, Hotel,
};

// Bottom tab bar shown on small screens instead of the full icon sidebar.
// Surfaces the most-used modules; everything else stays reachable via
// Settings > … on mobile, keeping the bar from overflowing.
const PRIMARY_IDS = ['dashboard', 'pos', 'rooms', 'kitchen', 'settings'];

export default function POSTabs({ activeModule, onModuleChange }) {
  const tabs = PRIMARY_IDS
    .map((id) => MODULES.find((m) => m.id === id))
    .filter(Boolean);

  return (
    <nav
      className="flex items-stretch shrink-0 w-full"
      style={{ height: '60px', background: NAVY, borderTop: `1px solid ${BORDER_DARK}` }}
    >
      {tabs.map((mod) => {
        const Icon = ICON_MAP[mod.icon];
        const isActive = activeModule === mod.id;
        return (
          <button
            key={mod.id}
            onClick={() => !mod.comingSoon && onModuleChange(mod.id)}
            disabled={mod.comingSoon}
            className="flex-1 flex flex-col items-center justify-center gap-1"
            style={{ opacity: mod.comingSoon ? 0.35 : 1 }}
          >
            {Icon && <Icon size={18} style={{ color: isActive ? TEAL_LIGHT : MUTED_DARK }} />}
            <span className="text-[10px] font-medium" style={{ color: isActive ? TEAL_LIGHT : MUTED_DARK }}>
              {mod.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
