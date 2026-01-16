import { GlobalNav } from './GlobalNav';
import { Sidebar } from './Sidebar';
import { useAppStore } from '@/stores/useAppStore';

export function Layout({ children }: { children: React.ReactNode }) {
  const { view } = useAppStore();
  const showSidebar = view === 'browser';

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#0f172a] text-white">
      {/* 1. Global Navigation (Far Left) */}
      <GlobalNav />

      {/* 2. Explorer Sidebar (Contextual) - Only shown in browser view */}
      {showSidebar && <Sidebar />}

      {/* 3. Main Content Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden bg-gray-900 border-l border-white/5">
         {children}
      </main>
    </div>
  );
}
