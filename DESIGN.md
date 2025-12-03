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
- **FR1.3**: Prevent time bank from going negative (stop at zero)
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
- **FR4.5**: Auto-stop session when time bank reaches zero
- **FR4.6**: Support pause/resume functionality (optional)
- **FR4.7**: Log all sessions with start time, end time, and duration

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
**Option 1: Firebase (Recommended for MVP)**
- Firestore for real-time database
- Firebase Authentication
- Firebase Hosting
- Cloud Functions for scheduled tasks (weekly allocation)

**Option 2: Self-Hosted**
- WebSocket server (Socket.io or native WebSockets)
- PostgreSQL or SQLite for persistence
- Node.js/Express backend
- CRON job or scheduler for weekly allocation

**Option 3: Local-First with Optional Sync**
- IndexedDB for local storage
- CRDT (e.g., Yjs or Automerge) for conflict-free sync
- WebRTC or WebSocket for peer-to-peer or server sync

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   PWA Frontend                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   React UI  │  │ State Manager│  │  Service   │ │
│  │ Components  │──│   (Zustand)  │──│   Worker   │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│         │                 │                 │        │
│         └─────────────────┼─────────────────┘        │
│                           │                          │
└───────────────────────────┼──────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  Sync Layer     │
                   │ (WebSocket/WS)  │
                   └────────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
│   Firestore    │  │  Auth Service  │  │   Cloud     │
│   Database     │  │                │  │  Functions  │
│  (Real-time)   │  │                │  │ (Scheduler) │
└────────────────┘  └────────────────┘  └─────────────┘
```

### Data Flow

#### Adding Time
```
User clicks "+15 min" button
  → Frontend updates local state optimistically
  → Send mutation to sync layer
  → Sync layer persists to database
  → Broadcast change to all connected clients
  → Create log entry
  → Confirm to originating client
```

#### Starting Session
```
User clicks "Start" for a child
  → Create session record (active=true, startTime=now)
  → Start local interval timer (updates every second)
  → Decrement availableSeconds locally
  → Sync state changes to backend periodically (every 5-10s)
  → Broadcast active session to other clients
```

#### Stopping Session
```
User clicks "Stop"
  → Stop local interval timer
  → Calculate total secondsUsed
  → Mark session as inactive
  → Sync final state to backend
  → Create log entry
  → Broadcast update to all clients
```

#### Weekly Allocation
```
Backend scheduler (Cloud Function or CRON)
  → Runs every Monday at 0:00 (configurable timezone)
  → For each child: add 14,400 seconds
  → Create log entries
  → Broadcast updates to connected clients
  → Update lastWeeklyAllocation timestamp
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

- [ ] Choose and set up backend (Firebase recommended)
- [ ] Implement WebSocket/Firestore real-time listeners
- [ ] Add authentication (simple PIN or Google Sign-In)
- [ ] Conflict resolution logic
- [ ] Optimistic UI updates
- [ ] Queue and retry failed syncs
- [ ] Activity log display view
- [ ] Activity log export (CSV/JSON)

**Deliverables**: Multi-device real-time synchronization with activity history

### Phase 4: Automated Weekly Allocation
**Goal**: Automatic time addition every Monday

- [ ] Backend scheduler setup (Cloud Functions or CRON)
- [ ] Implement weekly allocation logic
- [ ] Timezone handling
- [ ] Notification system (optional)
- [ ] Handle edge cases (missed weeks, timezone changes)

**Deliverables**: Fully automated weekly time allocation

### Phase 5: Child Management & Admin Features
**Goal**: User-friendly child management and additional admin capabilities

- [ ] Add child profiles (dynamic creation)
- [ ] Edit child profiles
- [ ] Delete child profiles
- [ ] Support for more than 2-3 children
- [ ] Pause/resume sessions
- [ ] Push notifications (session ending soon)

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

1. **Authentication**: Simple family PIN or Google/Apple Sign-In
2. **Authorization**: All family members have equal access (MVP)
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
- **Parent/Child Roles**: Different permissions for parents vs children
- **Multiple Languages**: i18n support
- **Shared Family Calendar**: Coordinate media time with family events
- **Screen Time Goals**: Set weekly limits per child
- **Educational Content Bonus**: Different rates for educational vs entertainment
- **Approval Workflow**: Kids request time additions, parents approve
- **Device Integration**: Actual parental control enforcement
- **Insights**: Weekly reports, trends, comparisons
- **Gamification**: Badges for good screen time habits
- **Multi-Family**: Support for multiple households (co-parenting)

## Open Questions

1. **Should sessions auto-pause after certain duration?** (e.g., require check-in every 2 hours)
2. **What happens to running sessions at Monday 0:00?** (Continue or auto-stop?)
3. **Should negative balances be allowed temporarily?** (Grace period)
4. **Who can start/stop sessions?** (Parents only, or kids too?)
5. **Should there be different time categories?** (TV, games, social media tracked separately)
6. **Notifications?** (Push notifications when time is running low)

## Success Metrics

- **Adoption**: Number of families using the app
- **Engagement**: Daily active users
- **Reliability**: Uptime and sync success rate
- **User Satisfaction**: Feedback and ratings
- **Performance**: Load time, sync latency

---

**Document Version**: 1.1
**Last Updated**: 2025-12-03
**Status**: Initial Design
