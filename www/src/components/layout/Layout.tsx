import { GlobalNav } from './GlobalNav';
import { useAppStore } from '@/stores/useAppStore';

export function Layout({ children }: { children: React.ReactNode }) {
  const { view } = useAppStore();

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-canvas text-text-main">
      {/* 1. Global Navigation (Far Left) */}
      <GlobalNav />

      {/* 2. Main Content Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden bg-main">
         {children}
      </main>
    </div>
  );
}
