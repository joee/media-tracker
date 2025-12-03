# Kids Media Time Tracker - PWA

A Progressive Web App (PWA) for managing children's screen time with a local-first architecture using Yjs CRDTs.

## ✨ Features

### Phase 1: Core Functionality
- ✅ **Time Bank Management**: Track available screen time for each child (seconds)
- ✅ **Real-time Sessions**: Start/stop media usage sessions with live countdown
- ✅ **Manual Time Addition**: Add time rewards with quick buttons (15/30/45/60 min)
- ✅ **Activity Logging**: Complete audit trail of all time changes
- ✅ **Negative Balances**: Track time debt when children go over their limit
- ✅ **Offline-First**: Fully functional without internet connection
- ✅ **Local Persistence**: All data stored in IndexedDB via Yjs
- ✅ **Responsive UI**: Works on mobile and desktop

### Phase 2: PWA Capabilities
- ✅ **Installable**: Add to home screen on mobile/desktop
- ✅ **Service Worker**: Offline caching with Workbox
- ✅ **App Icons**: Multiple sizes for all devices
- ✅ **Install Prompt**: Smart install banner
- ✅ **Automatic Dark Mode**: System preference detection

## 🏗️ Architecture

### Local-First Stack
- **Frontend**: React 19 + TypeScript + Vite
- **PWA**: vite-plugin-pwa with Workbox
- **State**: Zustand store synced with Yjs CRDT
- **Persistence**: IndexedDB (via y-indexeddb)
- **Styling**: Tailwind CSS v4
- **CRDT**: Yjs for conflict-free data structures

### Data Flow
```
User Action → Yjs CRDT → IndexedDB (auto-persist)
                 ↓
            Zustand Store
                 ↓
           React Re-render
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build (with PWA features)
npm run preview

# Regenerate PWA icons
npm run icons

# Run validation tests
npm run validate

# Run integration tests
npm test
```

The app will be available at `http://localhost:3000`

## 📱 PWA Installation

### Installing on Mobile (iOS/Android)
1. Open the app in your mobile browser
2. Look for the install prompt at the bottom of the screen
3. Tap **Install** to add to home screen
4. Alternatively:
   - **iOS Safari**: Tap Share → Add to Home Screen
   - **Android Chrome**: Tap Menu (⋮) → Install app

### Installing on Desktop
1. Open the app in Chrome, Edge, or another PWA-compatible browser
2. Look for the install icon in the address bar
3. Click to install as a standalone app
4. Or: Menu → Install [App Name]

### PWA Features
- **Offline Access**: Works without internet after first load
- **Fast Loading**: Service worker caches all assets
- **Native Feel**: Runs in its own window
- **Auto Updates**: Service worker updates in background

## 📊 Hardcoded Test Data

Phase 1 includes 3 hardcoded children:
- **Emma**: 2 hours (7200 seconds)
- **Noah**: 1.5 hours (5400 seconds)
- **Liam**: 1 hour (3600 seconds)

## 🎯 Usage

### Starting a Session
1. Click the **▶ Start** button on a child's card
2. The timer begins counting down every second
3. Time bank balance decreases in real-time
4. Session appears in activity log

### Stopping a Session
1. Click the **⏹ Stop** button on the active session
2. Final time used is calculated
3. Session end logged to activity log

### Adding Time
1. Click the **+ Add Time** button
2. Choose a quick add amount (15/30/45/60 min)
3. Optionally add a reason (e.g., "Cleaned bedroom")
4. Time is immediately added to the child's bank

## 📁 Project Structure

```
media-tracker/
├── src/
│   ├── components/
│   │   ├── ActivityLog.tsx      # Activity log display
│   │   ├── AddTimeModal.tsx     # Time addition modal
│   │   └── ChildCard.tsx        # Child time bank card
│   ├── lib/
│   │   └── yjs.ts               # Yjs CRDT setup & utilities
│   ├── store/
│   │   └── useStore.ts          # Zustand store with CRDT integration
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                 # React entry point
│   └── index.css                # Tailwind CSS imports
├── index.html                   # HTML entry point
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── package.json                 # Dependencies & scripts
└── DESIGN.md                    # Full design document
```

## 🔧 Key Technologies

- **React 19**: Latest React with concurrent features
- **TypeScript**: Type-safe development
- **Vite**: Lightning-fast build tool
- **Yjs**: CRDT library for conflict-free sync
- **y-indexeddb**: Automatic IndexedDB persistence
- **Zustand**: Lightweight state management
- **Tailwind CSS**: Utility-first styling
- **Dark Mode**: Automatic system preference detection

## 📝 Data Models

### Child
```typescript
interface Child {
  id: string;
  name: string;
  availableSeconds: number;  // Can be negative
  createdAt: number;
  updatedAt: number;
}
```

### Session
```typescript
interface Session {
  id: string;
  childId: string;
  startTime: number;
  endTime: number | null;
  secondsUsed: number;
  isActive: boolean;
}
```

### LogEntry
```typescript
interface LogEntry {
  id: string;
  childId: string;
  timestamp: number;
  type: string;  // 'manual_addition', 'session_start', 'session_end', etc.
  deltaSeconds: number;
  previousBalance: number;
  newBalance: number;
  metadata: Record<string, any>;
}
```

## 🎨 UI Features

- **Responsive Grid**: 1 column mobile, 2 columns tablet, 3 columns desktop
- **Dark Mode**: Automatic based on system preference
- **Live Updates**: Real-time countdown during active sessions
- **Visual Indicators**:
  - Green time = positive balance
  - Red time = negative balance (debt)
  - Pulsing "ACTIVE" badge for running sessions
  - Warning icon for overdrawn accounts

## ⚡ Performance

- **Instant Persistence**: All changes auto-saved to IndexedDB
- **No Network Dependency**: Fully functional offline
- **Efficient Updates**: Only re-renders affected components
- **Debounced Sync**: Ready for Phase 3 multi-device sync

## 🚧 Coming in Future Phases

- **Phase 2**: PWA manifest, service worker, dark mode toggle, app icons
- **Phase 3**: Multi-device sync via y-websocket, activity log export
- **Phase 4**: Client-side weekly allocation (Monday 0:00)
- **Phase 5**: Dynamic child management, session editing, push notifications

## 📄 License

ISC

## 👨‍💻 Development

This project follows the design document in `DESIGN.md`. See the document for complete architecture details, data flow diagrams, and implementation phases.

---

**Phase 1 Status**: ✅ Complete
**Last Updated**: 2025-12-03
