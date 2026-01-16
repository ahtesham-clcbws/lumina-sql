import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout';
import { useAppStore } from './stores/useAppStore';
import { Dashboard } from './features/dashboard/Dashboard';
import { Browser } from './features/browser/Browser';
import { QueryEditor } from './features/query/QueryEditor';
import { Structure } from './features/structure/Structure';
import { Designer } from './features/designer/Designer';
import { Routines } from './features/routines/Routines';
import { Export } from './features/export/Export';
import { ViewTabs } from './features/common/ViewTabs';

const queryClient = new QueryClient();

function App() {
  const { view, currentDb } = useAppStore();

  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        {/* Context Tabs (Only show if DB selected and not in global settings/dashboard) */}
        {currentDb && view !== 'dashboard' && view !== 'settings' && <ViewTabs />}

        <div className="flex-1 overflow-hidden relative">
            {view === 'dashboard' && <Dashboard />}
            {view === 'browser' && <Browser />}
            {view === 'structure' && <Structure />}
            {view === 'routines' && <Routines />}
            {view === 'designer' && <Designer />}
            {view === 'query' && <QueryEditor />}
            {view === 'export' && <Export />}
            {view === 'settings' && (
                <div className="p-8 flex items-center justify-center h-full text-white/30">
                    Settings View Placeholder
                </div>
            )}
        </div>
      </Layout>
    </QueryClientProvider>
  )
}

export default App
