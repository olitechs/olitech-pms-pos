import React from 'react';
import {
  LayoutDashboard, UtensilsCrossed, CalendarCheck, Users, ChefHat,
  BedDouble, PackageSearch, Sparkles, Wrench, BarChart3, Settings,
  Bell, LayoutGrid, IdCard, Hotel,
} from 'lucide-react';
import { MODULES } from '@/data/platformData';

const ICON_MAP = {
  LayoutDashboard, UtensilsCrossed, CalendarCheck, Users, ChefHat,
  BedDouble, PackageSearch, Sparkles, Wrench, BarChart3, Settings,
  LayoutGrid, IdCard, Hotel,
};

export default function Sidebar({ activeModule, onModuleChange }) {
  return (
    <aside className="w-16 min-w-16 max-w-16 h-screen bg-[#090C11] flex flex-col items-center py-3 px-2 text-white shrink-0">
      <div className="flex items-center justify-center shrink-0 pb-3">
        <div className="w-9 h-9 rounded-xl bg-[#FFD300] text-[#090C11] font-bold text-xs flex items-center justify-center">
          OT
        </div>
      </div>

      <nav className="flex-1 flex flex-col items-center gap-1 overflow-y-auto w-full">
        {MODULES.map((mod) => {
          const Icon = ICON_MAP[mod.icon];
          const isActive = activeModule === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => !mod.comingSoon && onModuleChange(mod.id)}
              title={mod.comingSoon ? `${mod.label} (Coming Soon)` : mod.label}
              disabled={mod.comingSoon}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 border-l-[3px]
                ${isActive ? 'bg-[#262B32] text-[#FFD300] border-[#FFD300]' : 'text-[#757B81] border-transparent hover:bg-[#262B32] hover:text-white'}`}
            >
              {Icon && <Icon size={20} strokeWidth={1.9} />}
              {mod.badge && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#FFD300] text-[#090C11] text-[9px] font-bold flex items-center justify-center">
                  {mod.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="w-full flex flex-col items-center gap-3 pt-3 border-t border-white/10 shrink-0">
        <button title="Notifications" className="w-10 h-10 rounded-xl flex items-center justify-center text-[#757B81] hover:bg-[#262B32] hover:text-white transition-all duration-200">
          <Bell size={20} />
        </button>
        <div title="Amina Kariuki" className="w-9 h-9 rounded-full bg-[#FFD300] text-[#090C11] flex items-center justify-center text-xs font-bold">
          AK
        </div>
      </div>
    </aside>
  );
}
