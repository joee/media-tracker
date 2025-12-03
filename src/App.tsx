import { useEffect } from 'react';
import { useStore } from './store/useStore';
import ChildCard from './components/ChildCard';
import ActivityLog from './components/ActivityLog';

export default function App() {
  const {
    children,
    isLoading,
    initialize,
    getActiveSessionForChild,
  } = useStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
          Loading...
        </div>
      </div>
    );
  }

  const childrenArray = Object.values(children);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Kids Media Tracker
            </h1>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              📱 PWA v1.0
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {childrenArray.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              activeSession={getActiveSessionForChild(child.id)}
            />
          ))}
        </div>

        <div className="mt-8">
          <ActivityLog />
        </div>
      </main>
    </div>
  );
}
