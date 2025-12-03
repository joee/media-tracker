# Kids Media Tracker - NixOS Development

## Quick Start (NixOS)

```bash
# Enter the Nix development shell
nix-shell

# Install dependencies (inside nix-shell)
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

## What's in the Nix Environment?

- Node.js 20 LTS
- npm (package manager)
- Automatic PATH setup for node_modules/.bin

## Alternative: direnv (Optional)

For automatic environment activation:

1. Install direnv: `nix-env -iA nixpkgs.direnv`
2. Create `.envrc` with: `use nix`
3. Run: `direnv allow`

Now the environment auto-activates when you cd into the directory!

## Building for Production

```bash
nix-shell
npm run build
```

The built files will be in the `dist/` directory.
