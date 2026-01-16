import React from 'react';
import { LayoutDashboard, History, Settings2, Moon, Sun } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/lib/utils';

export function GlobalNav() {
  const { view, setView, theme, setTheme } = useAppStore();

  return (
    <nav className="w-[72px] bg-[#0f172a] border-r border-white/10 flex flex-col justify-between items-center py-5 z-50 shrink-0">
      <div className="flex flex-col gap-3 w-full items-center">
        <NavItem 
          icon={<LayoutDashboard />} 
          isActive={view === 'dashboard'} 
          onClick={() => setView('dashboard')} 
          title="Dashboard" 
        />
        <NavItem 
          icon={<History />} 
          isActive={view === 'query'} 
          onClick={() => setView('query')} 
          title="SQL Editor & History" 
        />
        <NavItem 
          icon={<Settings2 />} 
          isActive={view === 'settings'} 
          onClick={() => setView('settings')} 
          title="Settings" 
        />
      </div>
      
      <div className="flex flex-col gap-3 items-center">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="nav-item flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/5"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
        </button>
        <div className="flex flex-col items-center gap-0.5 mt-4">
             <span className="text-[9px] opacity-30 font-semibold text-white">v0.1.0</span>
             <span className="text-[8px] opacity-20 text-white">Synced</span>
        </div>
      </div>
    </nav>
  );
}

interface NavItemProps {
    icon: React.ReactElement;
    isActive: boolean;
    onClick: () => void;
    title: string;
}

function NavItem({ icon, isActive, onClick, title }: NavItemProps) {
    return (
        <button 
            className={cn("nav-item", isActive && "active")}
            onClick={onClick}
            title={title}
        >
            {React.cloneElement(icon as React.ReactElement<any>, { size: 26, strokeWidth: 2.5 })}
        </button>
    )
}
