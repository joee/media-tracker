import { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatTime } from '../lib/yjs';
import type { Child, Session } from '../types';
import AddTimeModal from './AddTimeModal';

interface ChildCardProps {
  child: Child;
  activeSession: Session | null;
}

export default function ChildCard({ child, activeSession }: ChildCardProps) {
  const { startSession, stopSession } = useStore();
  const [showAddTimeModal, setShowAddTimeModal] = useState(false);

  const isNegative = child.availableSeconds < 0;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {child.name}
          </h2>
          {activeSession && (
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
              ACTIVE
            </span>
          )}
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Time Remaining
          </div>
          <div
            className={`text-4xl font-mono font-bold ${
              isNegative
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}
          >
            {formatTime(child.availableSeconds)}
          </div>
          {isNegative && (
            <div className="text-sm text-red-600 dark:text-red-400 mt-1">
              ⚠️ Overdrawn
            </div>
          )}
        </div>

        {activeSession && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Session started{' '}
              {new Date(activeSession.startTime).toLocaleTimeString()}
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              Duration: {formatTime(activeSession.secondsUsed)}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!activeSession ? (
            <>
              <button
                onClick={() => startSession(child.id)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                ▶ Start
              </button>
              <button
                onClick={() => setShowAddTimeModal(true)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                + Add Time
              </button>
            </>
          ) : (
            <button
              onClick={() => stopSession(child.id)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              ⏹ Stop
            </button>
          )}
        </div>
      </div>

      {showAddTimeModal && (
        <AddTimeModal
          child={child}
          onClose={() => setShowAddTimeModal(false)}
        />
      )}
    </>
  );
}
