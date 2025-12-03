import { useStore } from '../store/useStore';
import { formatTime } from '../lib/yjs';

export default function ActivityLog() {
  const { logs, children } = useStore();

  // Show last 10 logs, most recent first
  const recentLogs = [...logs].reverse().slice(0, 10);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getLogTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      manual_addition: '+ Added time',
      session_start: '▶ Session started',
      session_end: '⏹ Session ended',
      weekly_allocation: '📅 Weekly allowance',
    };
    return labels[type] || type;
  };

  if (recentLogs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Activity Log
        </h2>
        <p className="text-gray-500 dark:text-gray-400">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Activity Log
      </h2>

      <div className="space-y-3">
        {recentLogs.map((log) => {
          const child = children[log.childId];
          const childName = child?.name || log.childId;

          return (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {childName}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {getLogTypeLabel(log.type)}
                  </span>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(log.timestamp)}
                </div>

                {log.metadata.reason && (
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    "{log.metadata.reason}"
                  </div>
                )}
              </div>

              <div className="text-right">
                <div
                  className={`font-mono font-bold ${
                    log.deltaSeconds >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {log.deltaSeconds >= 0 ? '+' : ''}
                  {formatTime(Math.abs(log.deltaSeconds))}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Balance: {formatTime(log.newBalance)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
