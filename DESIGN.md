# Kids Media Time Tracker - Design Document

## Overview

A Progressive Web App (PWA) that helps families manage and track children's screen time. The app maintains a time bank for each child, logging all additions and usage, with real-time synchronization across multiple devices.

## Core Concepts

### Time Bank
- Each child has a **time bank** measured in seconds
- The time bank represents available media time
- Time can be added (rewards for chores) or consumed (media usage)
- All changes are logged and persistent

### Sessions
- A **session** is a continuous block of media usage
- Sessions are created by pressing "Start" and ended by pressing "Stop"
- Active sessions decrement the time bank in real-time
- Multiple children can have active sessions simultaneously

## Requirements

### Functional Requirements

#### FR1: Time Bank Management
- **FR1.1**: Store available seconds for each child persistently
- **FR1.2**: Display remaining time in human-readable format (HH:MM:SS)
- **FR1.3**: Allow time bank to go negative (track debt; parents can add grace time to recover)
- **FR1.4**: Support multiple children with independent time banks

#### FR2: Automatic Time Allocation
- **FR2.1**: Add 240 minutes (14,400 seconds) to each child's bank every Monday at 0:00
- **FR2.2**: Handle timezone correctly for weekly resets
- **FR2.3**: Ensure weekly allocation runs even when app is closed (background sync or next-open check)
- **FR2.4**: Log automatic allocations

#### FR3: Manual Time Addition
- **FR3.1**: Allow adding time blocks to a child's bank
- **FR3.2**: Provide quick-add buttons for common increments (15, 30, 45, 60 minutes)
- **FR3.3**: Allow custom time entry
- **FR3.4**: Require reason/note for manual additions (e.g., "cleaned room")
- **FR3.5**: Log all manual additions with timestamp and reason

#### FR4: Session Management
- **FR4.1**: Start a media usage session for a child (begin countdown)
- **FR4.2**: Stop an active session (end countdown)
- **FR4.3**: Display active sessions with elapsed time
- **FR4.4**: Decrement time bank in real-time during active sessions
- **FR4.5**: Allow sessions to continue even when time bank goes negative
- **FR4.6**: Support editing past sessions (fix mistakes in start/stop times)
- **FR4.7**: Running sessions continue uninterrupted across Monday allocation and other adjustments
- **FR4.8**: Log all sessions with start time, end time, and duration
- **FR4.9**: Only parents can start/stop sessions

#### FR5: Multi-User Sync
- **FR5.1**: Multiple devices can view the same data simultaneously
- **FR5.2**: Real-time updates across all connected devices
- **FR5.3**: Show which child has an active session
- **FR5.4**: Display current time remaining for each child
- **FR5.5**: Optimistic UI updates with conflict resolution

#### FR6: Activity Logging
- **FR6.1**: Log every state change with timestamp
- **FR6.2**: Log types:
  - Weekly automatic allocation
  - Manual time addition (with reason)
  - Session start
  - Session stop
  - Manual adjustments (if allowed)
- **FR6.3**: Provide activity history view per child
- **FR6.4**: Export logs (CSV or JSON)

#### FR7: PWA Requirements
- **FR7.1**: Installable on mobile and desktop devices
- **FR7.2**: Offline-first architecture
- **FR7.3**: Works offline with local state
- **FR7.4**: Syncs changes when connection is restored
- **FR7.5**: App manifest with appropriate icons
- **FR7.6**: Service worker for caching and background sync

### Non-Functional Requirements

#### NFR1: Performance
- UI updates should feel instant (< 100ms)
- Real-time sync latency < 1 second
- App loads in < 2 seconds on 3G connection

#### NFR2: Reliability
- No data loss even with network interruptions
- Conflict resolution for simultaneous edits
- Automatic retry for failed sync operations

#### NFR3: Usability
- Simple, child-friendly UI
- Large touch targets for mobile
- Clear visual indication of active sessions
- Accessible color schemes and labels

#### NFR4: Security
- Client-side encryption for data at rest (optional)
- Secure WebSocket connections (WSS)
- Authentication for family access

## Data Model

### Child Profile
```typescript
interface Child {
  id: string;                    // UUID
  name: string;                  // Display name
  availableSeconds: number;      // Current time bank balance
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Unix timestamp
}
```

### Session
```typescript
interface Session {
  id: string;                    // UUID
  childId: string;               // Reference to Child
  startTime: number;             // Unix timestamp
  endTime: number | null;        // Unix timestamp (null if active)
  secondsUsed: number;           // Total seconds consumed
  isActive: boolean;             // Currently running
}
```

### Log Entry
```typescript
interface LogEntry {
  id: string;                    // UUID
  childId: string;               // Reference to Child
  timestamp: number;             // Unix timestamp
  type: string;                  // Event type (free-form: 'weekly_allocation', 'manual_addition', 'session_start', 'session_end', etc.)
  deltaSeconds: number;          // Change in available time (+ or -)
  previousBalance: number;       // Balance before change
  newBalance: number;            // Balance after change
  metadata: Record<string, any>; // Additional context
}
```

### App State
```typescript
interface AppState {
  children: Record<string, Child>;
  sessions: Record<string, Session>;
  logs: LogEntry[];
  lastWeeklyAllocation: number; // Unix timestamp of last Monday reset
}
```

## Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: Zustand or Redux Toolkit
- **UI Components**: shadcn/ui or Material-UI
- **Styling**: Tailwind CSS
- **PWA**: Vite PWA plugin or Workbox
- **Build Tool**: Vite

#### Backend/Sync Layer
**✓ Selected: Local-First with Server-Facilitated Sync (Option 3)**

**Core Stack:**
- **IndexedDB**: Primary data storage (via y-indexeddb)
- **Yjs**: CRDT library for conflict-free synchronization
- **y-websocket**: WebSocket provider for multi-device sync
- **Lightweight sync server**: Simple WebSocket relay (no database, no app logic)

**Why Local-First:**
- True offline-first: App works perfectly without network
- Data ownership: All data lives on user devices
- Performance: Instant local reads/writes
- Privacy: Optional sync means optional data sharing
- Resilience: No single point of failure

**Sync Server (Phase 3):**
- Simple Node.js WebSocket server running y-websocket
- Acts as message relay only (no persistence)
- Deployable to Fly.io, Railway, or similar
- Or use managed Yjs sync providers (Liveblocks, PartyKit)

**Authentication (Phase 3):**
- Family room ID/code for sync coordination
- Optional: Simple PIN or passphrase for room access
- Server validates room IDs but doesn't manage user accounts

**Weekly Allocation (Phase 4):**
- Client-side logic: Check on app open/resume
- Calculate missed Mondays since last allocation
- Apply all missed allocations as CRDT operations
- No server-side scheduler needed

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│              PWA - Parent Device A                   │
│  ┌─────────────┐                                    │
│  │   React UI  │  Display state, handle user input  │
│  └──────┬──────┘                                    │
│         │                                            │
│  ┌──────▼──────┐                                    │
│  │   Zustand   │  React state derived from CRDT     │
│  │   Store     │                                    │
│  └──────┬──────┘                                    │
│         │                                            │
│  ┌──────▼──────────────────────────────────┐       │
│  │         Yjs CRDT Document                │       │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐ │       │
│  │  │ Children │ │ Sessions │ │  Logs   │ │       │
│  │  │  (Map)   │ │  (Map)   │ │ (Array) │ │       │
│  │  └──────────┘ └──────────┘ └─────────┘ │       │
│  └──────┬───────────────────────┬──────────┘       │
│         │                       │                   │
│  ┌──────▼──────┐         ┌──────▼──────┐           │
│  │  IndexedDB  │         │ y-websocket │           │
│  │ Persistence │         │  Provider   │           │
│  │  (y-idb)    │         │  (Optional) │           │
│  └─────────────┘         └──────┬──────┘           │
│                                  │                   │
└──────────────────────────────────┼───────────────────┘
                                   │
                         WebSocket │ (when online)
                                   │
                    ┌──────────────▼──────────────┐
                    │  Lightweight Sync Server    │
                    │  ┌────────────────────────┐ │
                    │  │   y-websocket-server   │ │
                    │  │  (Message relay only)  │ │
                    │  └────────────────────────┘ │
                    │  No database                │
                    │  No app logic               │
                    │  Just broadcasts updates    │
                    └──────────────┬───────────────┘
                                   │
                         WebSocket │ (when online)
                                   │
┌──────────────────────────────────▼───────────────────┐
│              PWA - Parent Device B                   │
│  ┌─────────────┐                                    │
│  │   React UI  │                                    │
│  └──────┬──────┘                                    │
│         │                                            │
│  ┌──────▼──────┐                                    │
│  │   Zustand   │                                    │
│  │   Store     │                                    │
│  └──────┬──────┘                                    │
│         │                                            │
│  ┌──────▼──────────────────────────────────┐       │
│  │         Yjs CRDT Document                │       │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐ │       │
│  │  │ Children │ │ Sessions │ │  Logs   │ │       │
│  │  │  (Map)   │ │  (Map)   │ │ (Array) │ │       │
│  │  └──────────┘ └──────────┘ └─────────┘ │       │
│  └──────┬───────────────────────┬──────────┘       │
│         │                       │                   │
│  ┌──────▼──────┐         ┌──────▼──────┐           │
│  │  IndexedDB  │         │ y-websocket │           │
│  │ Persistence │         │  Provider   │           │
│  │  (y-idb)    │         │  (Optional) │           │
│  └─────────────┘         └─────────────┘           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Key Characteristics:**
- Each device has complete, authoritative copy of data
- IndexedDB automatically persists all CRDT operations
- Sync happens in background when devices are online
- Offline changes queue locally and sync when reconnected
- All devices converge to identical state via CRDT conflict resolution

### Data Flow (Local-First Architecture)

#### Adding Time
```
User clicks "+15 min" button (on Device A)
  → Update Yjs CRDT: children.get('emma').availableSeconds += 900
  → Yjs automatically persists to IndexedDB (instant)
  → Zustand store updates from CRDT → React re-renders
  → Create log entry in Yjs logs array
  → If online: y-websocket broadcasts update to sync server
  → Sync server relays to Device B
  → Device B's Yjs CRDT applies update → UI updates
  → If offline: Changes queue locally, sync when reconnected
```

#### Starting Session
```
User clicks "Start" for Emma (on Device A)
  → Create session in CRDT: sessions.set(sessionId, { childId, startTime, isActive: true })
  → Start local interval timer (decrements every second)
  → Each second: Update child.availableSeconds in CRDT
  → IndexedDB automatically persists each change
  → Periodic sync (debounced): Broadcast accumulated changes via WebSocket
  → Device B receives updates → Shows active session with live countdown
```

#### Stopping Session
```
User clicks "Stop" (on Device A)
  → Stop local interval timer
  → Update CRDT: session.isActive = false, session.endTime = now
  → Calculate session.secondsUsed
  → Create log entry in CRDT logs array
  → Changes persist to IndexedDB + broadcast via WebSocket
  → All devices update to show session complete
```

#### Weekly Allocation (Client-Side)
```
App opens on any device
  → Check: getLastMonday() vs localStorage.get('lastAllocation')
  → If missed weeks detected:
      For each missed Monday:
        → Update CRDT: child.availableSeconds += 14400
        → Create log entry: { type: 'weekly_allocation', ... }
        → Persist to IndexedDB
  → Update localStorage.set('lastAllocation', lastMonday)
  → If online: Broadcast changes to other devices
  → All devices converge to same state
```

#### Conflict Resolution (Concurrent Session Start)
```
Device A starts session (offline)
  → sessions.set(sessionA, { childId: 'emma', ... })

Device B starts session (offline, same child)
  → sessions.set(sessionB, { childId: 'emma', ... })

When devices sync:
  → CRDT merges: Both sessions exist in sessions map
  → App logic detects: "Multiple active sessions for Emma"
  → Use last-write-wins register for activeSessionId per child
  → UI shows most recent session, logs conflict for review
```

### Offline Behavior

1. **Offline Capable**: App continues to function without network
2. **Local Queue**: State changes queued in IndexedDB
3. **Online Detection**: Listen for online/offline events
4. **Sync on Reconnect**: Process queued changes when connection restored
5. **Conflict Resolution**: Last-write-wins or operational transformation

### Conflict Resolution Strategy

**Scenario**: Two parents add time simultaneously on different devices

**Resolution**:
1. Each client generates unique log entry IDs (UUID)
2. Backend receives both additions
3. Both are valid and logged separately
4. Final balance = initial + addition1 + addition2
5. All clients converge to same state

**Scenario**: Parent A starts session, Parent B starts session for same child

**Resolution**:
1. Detect concurrent session start attempts
2. First write wins (based on server timestamp)
3. Second attempt is rejected
4. Rejected client shows the last log entry for that child (indicating session already started)

## User Interface

### Main Dashboard

```
┌─────────────────────────────────────────────┐
│  Kids Media Tracker            ☰            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  Emma                                 │ │
│  │  ⏱️  2:35:17 remaining                │ │
│  │  ⏯️  [Not Active]                     │ │
│  │                                       │ │
│  │  [▶ Start]  [+ Add Time ▼]           │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  Noah                    🔴 ACTIVE    │ │
│  │  ⏱️  1:12:43 remaining                │ │
│  │  ▶️  Started 18:32 (15 min ago)       │ │
│  │                                       │ │
│  │  [⏹ Stop]                             │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  Liam                                 │ │
│  │  ⏱️  0:00:00 remaining    ⚠️          │ │
│  │  ⏯️  [Not Active]                     │ │
│  │                                       │ │
│  │  [+ Add Time ▼]                       │ │
│  └───────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

### Add Time Modal

```
┌─────────────────────────────────────────────┐
│  Add Time for Emma                    ✕     │
├─────────────────────────────────────────────┤
│                                             │
│  Quick Add:                                 │
│  [15 min]  [30 min]  [45 min]  [60 min]    │
│                                             │
│  Custom:                                    │
│  [____] hours  [____] minutes              │
│                                             │
│  Reason (optional):                         │
│  ┌─────────────────────────────────────┐   │
│  │ Cleaned bedroom                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Common reasons:                            │
│  [Homework] [Chores] [Good behavior]        │
│                                             │
│             [Cancel]  [Add Time]            │
└─────────────────────────────────────────────┘
```

### Activity Log View

```
┌─────────────────────────────────────────────┐
│  ← Back to Dashboard                        │
├─────────────────────────────────────────────┤
│  Emma's Activity Log                        │
│                                             │
│  Today, Dec 3                               │
│  ├─ 3:15 PM  Session ended     -45 min     │
│  ├─ 2:30 PM  Session started               │
│  ├─ 10:00 AM Added time        +15 min     │
│  │           "Did the dishes"              │
│                                             │
│  Yesterday, Dec 2                           │
│  ├─ 7:45 PM  Session ended     -1h 20m     │
│  ├─ 6:25 PM  Session started               │
│  ├─ 4:00 PM  Added time        +30 min     │
│  │           "Homework complete"           │
│                                             │
│  Monday, Dec 1                              │
│  ├─ 8:30 PM  Session ended     -52 min     │
│  ├─ 7:38 PM  Session started               │
│  ├─ 12:00 AM Weekly allowance  +4h 00m     │
│                                             │
│             [Export CSV]                    │
└─────────────────────────────────────────────┘
```

### Settings/Admin View

```
┌─────────────────────────────────────────────┐
│  Settings                              ✕    │
├─────────────────────────────────────────────┤
│                                             │
│  Children                                   │
│  ├─ Emma                      [Edit] [Del]  │
│  ├─ Noah                      [Edit] [Del]  │
│  └─ Liam                      [Edit] [Del]  │
│  [+ Add Child]                              │
│                                             │
│  Weekly Allowance                           │
│  [____] hours  [____] minutes               │
│  Currently: 4 hours (240 min)               │
│                                             │
│  Reset Day & Time                           │
│  [Monday ▼]  at  [00:00 ▼]                 │
│                                             │
│  Timezone                                   │
│  [America/New_York ▼]                      │
│                                             │
│  Data Management                            │
│  [Export All Data]                          │
│  [Clear All Logs]                           │
│  [Reset All Timers]                         │
│                                             │
│             [Save Settings]                 │
└─────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: MVP (Core Functionality)
**Goal**: Basic working app with essential features

- [ ] Set up React + TypeScript + Vite project
- [ ] Implement local state management (Zustand)
- [ ] Hardcoded child profiles (2-3 children for testing)
- [ ] Time bank display and manual time addition
- [ ] Start/Stop session functionality
- [ ] Basic activity logging
- [ ] IndexedDB for local persistence
- [ ] Responsive UI for mobile and desktop

**Deliverables**: Working app that functions entirely locally (no sync)

### Phase 2: PWA Capabilities
**Goal**: Make it installable and offline-capable

- [ ] Add PWA manifest
- [ ] Implement service worker
- [ ] Configure caching strategy
- [ ] Add install prompt
- [ ] Test offline functionality
- [ ] Add app icons and splash screens
- [ ] Dark mode

**Deliverables**: Installable PWA that works offline

### Phase 3: Multi-Device Sync & Activity Log
**Goal**: Real-time sync across devices and activity history

- [ ] Set up y-websocket sync server (Node.js)
  - Deploy to Fly.io or Railway
  - Or use managed provider (Liveblocks, PartyKit)
- [ ] Add y-websocket provider to PWA
  - Connect to sync server with family room ID
- [ ] Implement family room creation/joining flow
  - Generate unique room IDs
  - Optional: PIN protection for rooms
- [ ] CRDT conflict resolution for active sessions
  - Detect concurrent session starts
  - Last-write-wins for activeSessionId per child
- [ ] Connection status indicator
  - Show online/offline/syncing states
- [ ] Activity log display view
  - Render from Yjs logs array
  - Filter by child, date range
- [ ] Activity log export (CSV/JSON)
  - Export CRDT state to standard formats

**Deliverables**: Multi-device real-time synchronization with activity history

### Phase 4: Client-Side Weekly Allocation
**Goal**: Automatic time addition every Monday (client-side)

- [ ] Implement "check on app open" logic
  - Compare current date vs last allocation timestamp
  - Detect missed Mondays (device offline for weeks)
- [ ] Apply missed allocations retroactively
  - Create CRDT operations for each missed week
  - Generate proper log entries with historical dates
- [ ] Timezone handling
  - Use device's local timezone for Monday 0:00
  - Or allow user to configure timezone in settings
- [ ] Background sync consideration
  - Service worker can trigger check on periodic sync
  - Fallback: Check on every app open
- [ ] Handle edge cases
  - Multiple devices checking simultaneously (CRDT handles this)
  - Clock changes/timezone changes
  - Initial setup (no previous allocation date)

**Deliverables**: Client-side weekly time allocation with missed-week catchup

### Phase 5: Child Management & Admin Features
**Goal**: User-friendly child management and additional admin capabilities

- [ ] Add child profiles (dynamic creation)
- [ ] Edit child profiles
- [ ] Delete child profiles
- [ ] Support for more than 2-3 children
- [ ] Session editing UI (correct mistakes in start/stop times)
- [ ] Push notifications (low time warnings)

**Deliverables**: Full child management and session control

## Testing Strategy

### Unit Tests
- State management logic (time calculations, session handling)
- Utility functions (time formatting, date calculations)
- Log entry creation

### Integration Tests
- Complete user flows (add time → start session → stop session)
- Sync and conflict resolution
- Weekly allocation trigger

### E2E Tests
- Multi-device scenarios (Playwright or Cypress)
- Offline → Online transitions
- PWA installation flow

### Manual Testing
- Install on various devices (iOS, Android, desktop)
- Test with different family sizes
- Long-running sessions
- Network interruption scenarios

## Security Considerations

1. **Authentication**: Simple family PIN or Google/Apple Sign-In (parent access only)
2. **Authorization**: Only parents can access the app; children do not have login access
3. **Data Privacy**: Data stored per family, isolated from others
4. **Input Validation**: Sanitize all user inputs
5. **Rate Limiting**: Prevent abuse of time addition
6. **Audit Trail**: Complete log of all changes for accountability

## Performance Optimization

1. **Lazy Loading**: Load activity logs on demand
2. **Virtualization**: For long activity lists
3. **Debouncing**: Sync updates (don't sync every second during session)
4. **Batching**: Group multiple state changes
5. **Service Worker Caching**: Cache static assets aggressively
6. **Code Splitting**: Separate admin/settings from main dashboard

## Accessibility

1. **Keyboard Navigation**: Full app navigable via keyboard
2. **Screen Reader Support**: Proper ARIA labels
3. **Color Contrast**: WCAG AA compliance
4. **Focus Indicators**: Clear visual focus states
5. **Touch Targets**: Minimum 44x44px for mobile

## Future Enhancements

- **Charts and Statistics**: Visual trends and usage patterns
- **Custom Reward Templates**: Pre-defined chore-to-time mappings
- **Parent/Child Roles**: Different permissions for parents vs children (e.g., child login for viewing only)
- **Multiple Languages**: i18n support
- **Time Categories**: Separate tracking for different media types (TV, games, social media)
- **Shared Family Calendar**: Coordinate media time with family events
- **Screen Time Goals**: Set weekly limits per child
- **Educational Content Bonus**: Different rates for educational vs entertainment
- **Approval Workflow**: Kids request time additions, parents approve
- **Device Integration**: Actual parental control enforcement
- **Insights**: Weekly reports, trends, comparisons
- **Gamification**: Badges for good screen time habits
- **Multi-Family**: Support for multiple households (co-parenting)

## Design Decisions

1. **Session auto-pause**: No auto-pause functionality. Mistakes can be corrected by editing sessions after the fact.
2. **Running sessions at Monday 0:00**: Sessions continue uninterrupted across weekly allocations and other time adjustments.
3. **Negative balances**: Allowed and tracked. Parents can add grace time to bring children back to positive balance.
4. **Session control**: Only parents can start/stop sessions and access the app. Children do not have login access.
5. **Time categories**: Single unified time bank (no separate categories). Multi-category tracking deferred to Future Enhancements.
6. **Notifications**: Push notifications for low time warnings included in Phase 5.

## Success Metrics

- **Adoption**: Number of families using the app
- **Engagement**: Daily active users
- **Reliability**: Uptime and sync success rate
- **User Satisfaction**: Feedback and ratings
- **Performance**: Load time, sync latency

---

## Multi-Device Sync Setup & Usage

### Overview

The app uses Yjs CRDT with y-websocket for real-time multi-device synchronization. Each device maintains a complete local copy of data in IndexedDB and optionally connects to a WebSocket relay server to sync with other devices.

### Running the Sync Server

The sync server is a lightweight WebSocket relay that broadcasts Yjs updates between devices. It requires no database and stores no application data.

#### Local Development

```bash
# Start the sync server (default port 1234)
npm run server

# Or with custom port
PORT=8080 npm run server
```

The server will start on `ws://0.0.0.0:1234` by default.

#### Production Deployment

**Option 1: Fly.io**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Create fly.toml
cat > fly.toml << EOF
app = "kids-media-tracker-sync"

[build]
  dockerfile = "Dockerfile"

[[services]]
  internal_port = 1234
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
EOF

# Create Dockerfile
cat > Dockerfile << EOF
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY server ./server
CMD ["node", "server/sync-server.mjs"]
EOF

# Deploy
fly launch
fly deploy
```

**Option 2: Railway**
1. Push code to GitHub
2. Connect Railway to your repo
3. Set build command: `npm ci`
4. Set start command: `node server/sync-server.mjs`
5. Railway auto-detects Node.js and deploys

**Option 3: Managed Yjs Providers**
- [Liveblocks](https://liveblocks.io/): Managed Yjs sync with built-in auth
- [PartyKit](https://www.partykit.io/): Serverless Yjs sync platform

### Using Multi-Device Sync

#### Enabling Sync

1. **Click the sync status indicator** in the app header (top right)
2. **Toggle "Enable Sync"** to ON
3. **Configure settings**:
   - **Room ID**: Unique identifier for your family (auto-generated)
   - **Server URL**: WebSocket server address (e.g., `ws://localhost:1234` for local or `wss://your-app.fly.dev` for production)
4. **Click "Apply Changes"**

#### Sharing with Family Members

To sync across devices:

1. **On Device A (first device)**:
   - Enable sync
   - Copy the Room ID (click the 📋 copy button)

2. **On Device B (second device)**:
   - Enable sync
   - Paste the Room ID from Device A
   - Use the same Server URL
   - Click "Apply Changes"

Both devices will now sync in real-time!

#### Connection Status

The sync indicator shows:
- 🟢 **Synced**: Connected and up-to-date
- 🟡 **Connecting...**: Attempting to connect
- 🔴 **Disconnected**: Not connected (check server/network)
- ⭕ **Sync Off**: Sync disabled (local-only mode)

#### Troubleshooting Sync

**Problem**: Connection shows "Disconnected"
- **Solution**: Verify sync server is running and accessible
- Check server URL format: `ws://host:port` (local) or `wss://host` (production with SSL)
- Check firewall/network settings

**Problem**: Devices not syncing
- **Solution**: Ensure both devices use the same Room ID
- Verify both are connected (green status)
- Check browser console for errors

**Problem**: Slow sync or lag
- **Solution**: Check network connection quality
- Verify sync server has sufficient resources
- Consider deploying server closer to your location

### Exporting Activity Logs

Activity logs can be exported for analysis or record-keeping:

1. **Scroll to Activity Log** section on the main dashboard
2. **Click export button**:
   - **📊 CSV**: Spreadsheet format (Excel, Google Sheets)
   - **📦 JSON**: Structured data format (programming, backup)
3. **File downloads** with name: `media-tracker-activity-YYYY-MM-DD.[csv|json]`

**CSV Format:**
```csv
Timestamp,Date,Child,Type,Delta (seconds),Previous Balance,New Balance,Reason
1701619200000,"12/3/2025, 3:00:00 PM",Emma,manual_addition,900,7200,8100,"Cleaned bedroom"
```

**JSON Format:**
```json
[
  {
    "id": "abc123",
    "timestamp": 1701619200000,
    "date": "12/3/2025, 3:00:00 PM",
    "childId": "emma",
    "childName": "Emma",
    "type": "manual_addition",
    "deltaSeconds": 900,
    "previousBalance": 7200,
    "newBalance": 8100,
    "metadata": {
      "reason": "Cleaned bedroom"
    }
  }
]
```

### Local Storage Keys

The app uses localStorage for sync configuration:

- `sync-enabled`: `"true"` or `"false"`
- `sync-url`: WebSocket server URL (default: `ws://localhost:1234`)
- `sync-room`: Room ID for family sync group

These can be manually edited in browser DevTools if needed.

### Security Notes

- **Room IDs are not encrypted**: Anyone with your Room ID can join your sync session
- **For production**: Consider adding PIN/password protection (future enhancement)
- **Data transmission**: Use WSS (WebSocket Secure) for production deployments
- **Local data**: All data stored in browser IndexedDB (not sent to server permanently)
- **Server role**: Server only relays messages, stores nothing

### Architecture Details

```
┌─────────────────────────────────────────────────────┐
│ Browser A                                            │
│  ┌────────────┐                                     │
│  │ IndexedDB  │◄──── Primary Storage (Persistent)   │
│  │ (y-idb)    │                                     │
│  └──────┬─────┘                                     │
│         │                                            │
│    ┌────▼────┐                                      │
│    │  Yjs    │◄──── CRDT Document (In Memory)      │
│    │  CRDT   │                                      │
│    └────┬────┘                                      │
│         │                                            │
│  ┌──────▼──────┐                                    │
│  │ y-websocket │◄──── Sync Provider (Optional)     │
│  └──────┬──────┘                                    │
│         │                                            │
└─────────┼────────────────────────────────────────────┘
          │
          │ WebSocket (when online)
          │
    ┌─────▼─────┐
    │   Sync    │◄──── Relay Server (Stateless)
    │  Server   │      - No database
    └─────┬─────┘      - Broadcasts only
          │
          │ WebSocket (when online)
          │
┌─────────▼────────────────────────────────────────────┐
│ Browser B                                            │
│  ┌────────────┐                                     │
│  │ IndexedDB  │◄──── Primary Storage (Persistent)   │
│  │ (y-idb)    │                                     │
│  └──────┬─────┘                                     │
│         │                                            │
│    ┌────▼────┐                                      │
│    │  Yjs    │◄──── CRDT Document (In Memory)      │
│    │  CRDT   │                                      │
│    └────┬────┘                                      │
│         │                                            │
│  ┌──────▼──────┐                                    │
│  │ y-websocket │◄──── Sync Provider (Optional)     │
│  └─────────────┘                                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Key Points:**
- Each browser has complete, independent data in IndexedDB
- App works fully offline (sync disabled or disconnected)
- Sync server facilitates real-time updates but is not required
- All devices converge to identical state via CRDT merging
- No data loss even with network interruptions

---

**Document Version**: 1.4
**Last Updated**: 2025-12-03
**Status**: Phase 3 Complete - Multi-Device Sync Operational
