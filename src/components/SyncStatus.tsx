import { useState, useEffect } from 'react';
import { getSyncConfig, enableSync, disableSync } from '../lib/yjs';

type SyncConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export default function SyncStatus() {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [synced, setSynced] = useState(false);
  const [status, setStatus] = useState<SyncConnectionStatus>('disconnected');
  const [roomId, setRoomId] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customRoom, setCustomRoom] = useState('');

  useEffect(() => {
    // Load initial config
    const config = getSyncConfig();
    setSyncEnabled(config.syncEnabled);
    setRoomId(config.roomId);
    setCustomUrl(config.syncUrl);
    setCustomRoom(config.roomId);

    // Listen for sync status events
    const handleStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setStatus(detail.status as SyncConnectionStatus);
    };

    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSynced(detail.synced);
    };

    window.addEventListener('sync-status', handleStatus);
    window.addEventListener('sync-change', handleSync);

    return () => {
      window.removeEventListener('sync-status', handleStatus);
      window.removeEventListener('sync-change', handleSync);
    };
  }, []);

  const handleToggleSync = () => {
    if (syncEnabled) {
      disableSync();
      setSyncEnabled(false);
      setStatus('disconnected');
      setSynced(false);
    } else {
      enableSync(customUrl || undefined, customRoom || undefined);
      setSyncEnabled(true);
      setStatus('connecting');
      const config = getSyncConfig();
      setRoomId(config.roomId);
    }
  };

  const handleApplySettings = () => {
    if (syncEnabled) {
      disableSync();
    }
    enableSync(customUrl || undefined, customRoom || undefined);
    setSyncEnabled(true);
    setStatus('connecting');
    const config = getSyncConfig();
    setRoomId(config.roomId);
    setCustomRoom(config.roomId);
    setShowSettings(false);
  };

  const getStatusColor = () => {
    if (!syncEnabled) return 'text-gray-400 dark:text-gray-600';
    if (status === 'connected' && synced) return 'text-green-500';
    if (status === 'connecting') return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusIcon = () => {
    if (!syncEnabled) return '⭕';
    if (status === 'connected' && synced) return '🟢';
    if (status === 'connecting') return '🟡';
    return '🔴';
  };

  const getStatusText = () => {
    if (!syncEnabled) return 'Sync Off';
    if (status === 'connected' && synced) return 'Synced';
    if (status === 'connecting') return 'Connecting...';
    return 'Disconnected';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title="Sync Settings"
      >
        <span className={getStatusColor()}>{getStatusIcon()}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getStatusText()}
        </span>
      </button>

      {showSettings && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSettings(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              Sync Settings
            </h3>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Sync
                </label>
                <button
                  onClick={handleToggleSync}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    syncEnabled
                      ? 'bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      syncEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Share data across devices using a sync server
              </p>
            </div>

            {syncEnabled && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Room ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customRoom}
                      onChange={(e) => setCustomRoom(e.target.value)}
                      placeholder={roomId}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(roomId);
                      }}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm"
                      title="Copy Room ID"
                    >
                      📋
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Share this ID with family members to sync
                  </p>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Server URL
                  </label>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="ws://localhost:1234"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    WebSocket server address
                  </p>
                </div>

                <button
                  onClick={handleApplySettings}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Apply Changes
                </button>

                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between mb-1">
                      <span>Status:</span>
                      <span className={getStatusColor()}>{status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Synced:</span>
                      <span>{synced ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
