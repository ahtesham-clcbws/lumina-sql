import React from 'react';
import { LayoutDashboard, History, Settings2, Moon, Sun, SunDim, Zap } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

export function GlobalNav() {
  const { view, setView, theme, setTheme, currentServer } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isServerContext = !!currentServer && location.pathname.startsWith('/server/');

  const handleDashboardClick = () => {
      navigate('/');
  };

  const handleSqlClick = () => {
      if (currentServer) {
          if (!location.pathname.startsWith(`/server/${currentServer.id}`)) {
             navigate(`/server/${currentServer.id}`);
          }
          setView('query');
      } else {
          navigate('/');
      }
  };

  const handleSettingsClick = () => {
      // navigate('/settings');
      useAppStore.getState().setShowSettings(true);
  };

  return (
    <nav className="w-[72px] bg-canvas border-r border-border flex flex-col justify-between items-center py-5 z-50 shrink-0">
      <div className="flex flex-col gap-3 w-full items-center">
        <NavItem
          icon={<LayoutDashboard />}
          isActive={location.pathname === '/'}
          onClick={handleDashboardClick}
          title="Global Dashboard"
        />
        
        <NavItem
          icon={<History />}
          isActive={view === 'query' && isServerContext}
          onClick={handleSqlClick}
          title={currentServer ? "SQL Editor & History" : "Select a Server First"}
          disabled={!currentServer}
        />

        <div className="w-8 h-[1px] bg-border my-1 opacity-50" />

      <button
          className={cn(
              "nav-item",
              useAppStore.getState().showSettings 
                ? "active text-primary bg-primary/10" 
                : "text-text-muted hover:text-text-main"
          )}
          onClick={handleSettingsClick}
          title="Settings"
        >
          {React.cloneElement(<Settings2 />, { size: 26, strokeWidth: 2.5 })}
        </button>

        <button
          className={cn(
              "nav-item mt-2",
              useAppStore.getState().showHelp 
                ? "active text-purple-400 bg-purple-500/10" 
                : "text-text-muted hover:text-purple-400"
          )}
          onClick={() => useAppStore.getState().setShowHelp(true)}
          title="Help Center"
        >
           {/* @ts-ignore */}
           <div className="border-2 border-current rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">?</div>
        </button>
      </div>

      <div className="flex flex-col gap-3 items-center">
        <button
          onClick={() => {
              if (theme === 'dark') setTheme('light');
              else if (theme === 'light') setTheme('ultra-light');
              else if (theme === 'ultra-light') setTheme('neo');
              else setTheme('dark');
          }}
          className="nav-item flex items-center justify-center text-text-muted hover:text-text-main hover:bg-white/5"
          title={`Theme: ${theme}`}
        >
          {theme === 'dark' ? <Moon size={24} /> : 
           theme === 'light' ? <SunDim size={24} /> : 
           theme === 'ultra-light' ? <Sun size={24} /> : 
           <Zap size={24} />}
        </button>
        <div className="flex flex-col items-center gap-0.5 mt-4">
          <span className="text-[9px] opacity-30 font-semibold text-text-main">v0.1.0</span>
          <span className="text-[8px] opacity-20 text-text-main">Synced</span>
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
  disabled?: boolean;
}

function NavItem({ icon, isActive, onClick, title, disabled }: NavItemProps) {
  return (
    <button
      className={cn(
          "nav-item", 
          isActive 
            ? "active text-primary bg-primary/10" 
            : "text-text-muted hover:text-text-main",
          disabled && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-text-muted"
      )}
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 26, strokeWidth: 2.5 })}
    </button>
  )
}
