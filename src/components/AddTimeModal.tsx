import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Child } from '../types';

interface AddTimeModalProps {
  child: Child;
  onClose: () => void;
}

export default function AddTimeModal({ child, onClose }: AddTimeModalProps) {
  const { addTime } = useStore();
  const [reason, setReason] = useState('');

  const quickAddMinutes = [15, 30, 45, 60];

  const handleQuickAdd = (minutes: number) => {
    const seconds = minutes * 60;
    addTime(child.id, seconds, reason || `Added ${minutes} minutes`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add Time for {child.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason (optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Cleaned bedroom, Did homework"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Add:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickAddMinutes.map((minutes) => (
              <button
                key={minutes}
                onClick={() => handleQuickAdd(minutes)}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Common reasons: Homework, Chores, Good behavior
        </div>
      </div>
    </div>
  );
}
