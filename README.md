# Kids Media Time Tracker

A Progressive Web App (PWA) that helps families manage and track children's screen time with real-time multi-device synchronization.

## Features

- **Time Bank Management**: Track available media time for each child
- **Session Tracking**: Start/stop media usage sessions with real-time countdown
- **Multi-Device Sync**: Real-time synchronization across devices using Yjs CRDT
- **Activity Logging**: Complete history of time additions and sessions
- **Export Logs**: Export activity logs to CSV or JSON
- **Offline-First**: Works completely offline with local IndexedDB storage
- **PWA**: Installable on mobile and desktop devices
- **Dark Mode**: Automatic system theme detection

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd media-tracker

# Install dependencies
npm install

# Generate PWA icons
npm run icons

# Start development server
npm run dev
```

Visit http://localhost:3000

### Multi-Device Sync (Optional)

To enable real-time sync across devices:

```bash
# In a separate terminal, start the sync server
npm run server
```

Then in the app:
1. Click the sync status indicator (top right)
2. Toggle "Enable Sync" to ON
3. Copy the Room ID
4. Share the Room ID with other devices to sync

### Building for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
media-tracker/
├── src/
│   ├── components/       # React components
│   │   ├── ActivityLog.tsx
│   │   ├── AddTimeModal.tsx
│   │   ├── ChildCard.tsx
│   │   ├── InstallPrompt.tsx
│   │   └── SyncStatus.tsx
│   ├── lib/
│   │   └── yjs.ts        # Yjs CRDT setup and utilities
│   ├── store/
│   │   └── useStore.ts   # Zustand state management
│   ├── types/
│   │   └── index.ts      # TypeScript interfaces
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # App entry point
│   └── index.css         # Global styles
├── server/
│   └── sync-server.mjs   # WebSocket sync server
├── nixos/
│   └── sync-server-service.nix  # NixOS systemd service
├── scripts/
│   ├── generate-icons.mjs
│   ├── integration-test.mjs
│   └── validate.mjs
├── public/               # Static assets
├── DESIGN.md            # Comprehensive design document
├── DEPLOYMENT.md        # Deployment guide (Cloudflare + NixOS)
└── package.json
```

## NPM Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run server` - Start WebSocket sync server
- `npm run icons` - Generate PWA icons from SVG
- `npm run validate` - Validate project configuration
- `npm run test:integration` - Run integration tests
- `npm run test` - Run all tests

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling
- **Zustand** - State management
- **Yjs** - CRDT for data synchronization
- **y-indexeddb** - Local persistence
- **y-websocket** - Multi-device sync
- **vite-plugin-pwa** - PWA capabilities

### Backend/Sync
- **Node.js** - WebSocket server runtime
- **ws** - WebSocket implementation
- **y-protocols** - Yjs sync protocols

## Development

### NixOS Users

A Nix shell environment is provided:

```bash
nix-shell
# or
nix-shell default.nix
```

### Running Tests

```bash
# Validate configuration
npm run validate

# Run integration tests
npm run test:integration

# Run all tests
npm run test
```

## Architecture

The app uses a **local-first architecture**:

1. **IndexedDB** stores all data locally on each device
2. **Yjs CRDT** provides conflict-free data structures
3. **y-websocket** (optional) enables real-time multi-device sync
4. **Lightweight sync server** acts as a message relay only

This means:
- App works fully offline
- Data lives on user devices
- Sync is optional and real-time
- No single point of failure

See [DESIGN.md](./DESIGN.md) for comprehensive architecture documentation.

## Deployment

### Frontend (PWA)

Deploy the `dist/` folder to any static hosting:

- **Vercel**: `npm run build && vercel --prod`
- **Netlify**: Connect repo, build command `npm run build`, publish `dist/`
- **GitHub Pages**: Build and push `dist/` to `gh-pages` branch
- **Cloudflare Pages**: Connect repo, build command `npm run build`, output `dist/`

### Sync Server (Optional)

Deploy `server/sync-server.mjs` to:

- **Self-hosted NixOS**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete guide
- **Fly.io**: See [DESIGN.md](./DESIGN.md#production-deployment) for instructions
- **Railway**: Connect repo, start command `node server/sync-server.mjs`
- **Managed Providers**: Use [Liveblocks](https://liveblocks.io/) or [PartyKit](https://www.partykit.io/)

## Usage

### Adding Time

1. Click "+ Add Time" on a child's card
2. Choose quick increment (15/30/45/60 min) or enter custom time
3. Optionally add a reason (e.g., "Did chores")
4. Click "Add Time"

### Starting/Stopping Sessions

1. Click "Start" to begin a media session
2. Time bank decrements in real-time
3. Click "Stop" to end the session
4. View session details in Activity Log

### Exporting Logs

1. Scroll to Activity Log section
2. Click "📊 CSV" or "📦 JSON" to download logs

## Configuration

Sync settings are stored in localStorage:

- `sync-enabled`: Enable/disable sync (`"true"` or `"false"`)
- `sync-url`: WebSocket server URL (default: `ws://localhost:1234`)
- `sync-room`: Family room ID for sync group

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions:
- Cloudflare Pages (frontend)
- Self-hosted NixOS (sync server)
- SSL configuration with Caddy or nginx

## Contributing

See [DESIGN.md](./DESIGN.md) for implementation phases and architecture details.

## License

ISC

## Support

For issues or questions, please check [DESIGN.md](./DESIGN.md) or open an issue on GitHub.

# Trivial Change
