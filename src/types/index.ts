// TypeScript interfaces for the Kids Media Time Tracker

export interface Child {
  id: string;                    // UUID
  name: string;                  // Display name
  availableSeconds: number;      // Current time bank balance
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Unix timestamp
}

export interface Session {
  id: string;                    // UUID
  childId: string;               // Reference to Child
  startTime: number;             // Unix timestamp
  endTime: number | null;        // Unix timestamp (null if active)
  secondsUsed: number;           // Total seconds consumed
  isActive: boolean;             // Currently running
}

export interface LogEntry {
  id: string;                    // UUID
  childId: string;               // Reference to Child
  timestamp: number;             // Unix timestamp
  type: string;                  // Event type (free-form)
  deltaSeconds: number;          // Change in available time (+ or -)
  previousBalance: number;       // Balance before change
  newBalance: number;            // Balance after change
  metadata: Record<string, any>; // Additional context
}

export interface AppState {
  children: Record<string, Child>;
  sessions: Record<string, Session>;
  logs: LogEntry[];
}
