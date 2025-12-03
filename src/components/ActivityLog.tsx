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

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Date', 'Child', 'Type', 'Delta (seconds)', 'Previous Balance', 'New Balance', 'Reason'];

    const rows = [...logs].reverse().map((log) => {
      const child = children[log.childId];
      const childName = child?.name || log.childId;
      const reason = log.metadata.reason || '';

      return [
        log.timestamp,
        formatDate(log.timestamp),
        childName,
        log.type,
        log.deltaSeconds,
        log.previousBalance,
        log.newBalance,
        reason,
      ].map(val => {
        // Escape quotes and wrap in quotes if contains comma or quote
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `media-tracker-activity-${timestamp}.csv`, 'text/csv');
  };

  const exportToJSON = () => {
    const exportData = [...logs].reverse().map((log) => {
      const child = children[log.childId];
      return {
        id: log.id,
        timestamp: log.timestamp,
        date: formatDate(log.timestamp),
        childId: log.childId,
        childName: child?.name || log.childId,
        type: log.type,
        deltaSeconds: log.deltaSeconds,
        previousBalance: log.previousBalance,
        newBalance: log.newBalance,
        metadata: log.metadata,
      };
    });

    const json = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(json, `media-tracker-activity-${timestamp}.json`, 'application/json');
  };

  if (recentLogs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Activity Log
          </h2>
        </div>
        <p className="text-gray-500 dark:text-gray-400">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Activity Log
        </h2>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            title="Export to CSV"
          >
            📊 CSV
          </button>
          <button
            onClick={exportToJSON}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            title="Export to JSON"
          >
            📦 JSON
          </button>
        </div>
      </div>

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
