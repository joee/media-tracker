# Deployment Guide

This guide covers deploying the Kids Media Tracker. Choose your deployment option:

| Option | Frontend | Sync Server | Cost | Maintenance |
|--------|----------|-------------|------|-------------|
| **Cloudflare (Recommended)** | Cloudflare Pages | Durable Objects | Free | Zero |
| **Self-Hosted** | Cloudflare Pages | Your NixOS Host | Free | Low |

## Option 1: Cloudflare Pages + Durable Objects (Recommended)

Fully managed, zero maintenance, automatic CI/CD on commits to main.

### Architecture

```
GitHub Push → GitHub Actions → Cloudflare Pages (Frontend)
                            → Cloudflare Workers (Sync via Durable Objects)
```

### Prerequisites

1. Cloudflare account (free tier)
2. GitHub repository

### Step 1: Create Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Custom token" template with permissions:
   - **Account** → Cloudflare Pages → Edit
   - **Account** → Workers Scripts → Edit
   - **Zone** → Zone → Read (if using custom domain)
4. Copy the token

### Step 2: Get Your Cloudflare Account ID

1. Go to https://dash.cloudflare.com
2. Select any domain (or Workers & Pages)
3. Copy Account ID from the right sidebar

### Step 3: Configure GitHub Secrets

In your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add these secrets:
   - `CLOUDFLARE_API_TOKEN`: Your API token from Step 1
   - `CLOUDFLARE_ACCOUNT_ID`: Your account ID from Step 2

### Step 4: (Optional) Configure Sync URL

By default, the frontend will connect to your worker at:
```
wss://media-tracker-sync.<account-id>.workers.dev/sync
```

To customize this (e.g., for a custom domain):

1. Go to Settings → Secrets and variables → Actions → Variables
2. Add variable: `VITE_SYNC_URL` = `wss://your-custom-domain.com/sync`

### Step 5: Deploy

Push to the `main` branch:

```bash
git add .
git commit -m "Deploy to Cloudflare"
git push origin main
```

GitHub Actions will automatically:
1. Deploy the sync worker to Cloudflare Workers
2. Build and deploy the frontend to Cloudflare Pages

### Step 6: Access Your App

After deployment completes:

- **Frontend**: `https://media-tracker.pages.dev` (or your custom domain)
- **Sync Worker**: `https://media-tracker-sync.<account-id>.workers.dev`

### Custom Domain Setup

#### For Pages (Frontend)

1. Go to Cloudflare Dashboard → Pages → media-tracker
2. Custom domains → Add custom domain
3. Add your domain (e.g., `media.yourdomain.com`)

#### For Workers (Sync)

1. Go to Cloudflare Dashboard → Workers & Pages → media-tracker-sync
2. Triggers → Custom Domains → Add Custom Domain
3. Add your domain (e.g., `sync.yourdomain.com`)
4. Update `VITE_SYNC_URL` in GitHub Actions variables

### Manual Deployment (Without CI/CD)

If you prefer manual deployment:

```bash
# Install dependencies
npm install
cd worker && npm install && cd ..

# Deploy worker (requires CLOUDFLARE_API_TOKEN env var)
cd worker
npx wrangler deploy

# Build frontend
cd ..
VITE_SYNC_URL=wss://media-tracker-sync.<your-account-id>.workers.dev/sync npm run build

# Deploy frontend
npx wrangler pages deploy dist --project-name=media-tracker
```

---

## Option 2: Cloudflare Pages + Self-Hosted NixOS

Run your own sync server for full control.

### Architecture

```
Cloudflare Pages (HTTPS) ← Browser → Your NixOS Host (WSS)
     (Static PWA)                      (WebSocket Sync)
```

### Prerequisites

1. NixOS host with public IP or domain name
2. Domain name (for SSL certificate) - e.g., `sync.yourdomain.com`
3. Cloudflare account (free tier is fine)
4. GitHub repo connected to Cloudflare Pages

### Part A: Deploy Frontend to Cloudflare Pages

#### Build Configuration

Set the sync URL via environment variable. Create `.env.production`:

```bash
VITE_SYNC_URL=wss://sync.yourdomain.com
```

Or set `VITE_SYNC_URL` in Cloudflare Pages project settings.

#### Deploy to Cloudflare Pages

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Configure production sync URL"
   git push
   ```

2. **Connect to Cloudflare Pages**:
   - Go to https://dash.cloudflare.com
   - Pages → Create a project → Connect to Git
   - Select your `media-tracker` repo
   - Configure build:
     - Build command: `npm run build`
     - Build output directory: `dist`
     - Root directory: `/` (leave empty)
     - Environment variable: `NODE_VERSION = 20`

3. **Deploy**:
   - Click "Save and Deploy"
   - Your app will be at: `https://your-project.pages.dev`

### Part B: Deploy Sync Server to NixOS

#### Step 1: Install Server Files

```bash
# On your NixOS host
sudo mkdir -p /var/lib/media-tracker/server
cd /var/lib/media-tracker

# Copy server files (from your dev machine)
scp -r server/sync-server.mjs your-host:/var/lib/media-tracker/server/
scp package.json your-host:/var/lib/media-tracker/
scp package-lock.json your-host:/var/lib/media-tracker/

# Install dependencies
cd /var/lib/media-tracker
nix-shell -p nodejs_20 --run "npm ci --production"
```

#### Step 2: Configure NixOS Service

Add to your `/etc/nixos/configuration.nix`:

```nix
{ config, pkgs, ... }:

{
  # Sync server service
  systemd.services.media-tracker-sync = {
    description = "Kids Media Tracker Sync Server";
    after = [ "network.target" ];
    wantedBy = [ "multi-user.target" ];

    serviceConfig = {
      Type = "simple";
      User = "media-tracker";
      Group = "media-tracker";
      WorkingDirectory = "/var/lib/media-tracker";
      ExecStart = "${pkgs.nodejs_20}/bin/node /var/lib/media-tracker/server/sync-server.mjs";
      Restart = "on-failure";
      RestartSec = "10s";

      # Security hardening
      NoNewPrivileges = true;
      PrivateTmp = true;
      ProtectSystem = "strict";
      ProtectHome = true;
      ReadWritePaths = [ "/var/lib/media-tracker" ];
    };

    environment = {
      NODE_ENV = "production";
      PORT = "1234";
    };
  };

  # Create user
  users.users.media-tracker = {
    isSystemUser = true;
    group = "media-tracker";
    description = "Media Tracker Sync Server";
    home = "/var/lib/media-tracker";
  };

  users.groups.media-tracker = {};

  # Firewall
  networking.firewall.allowedTCPPorts = [ 1234 443 ];
}
```

#### Step 3: SSL Certificate (Required for WSS)

Since Cloudflare Pages uses HTTPS, your sync server MUST use WSS (WebSocket Secure).

**Option A: Use Caddy (Easiest)**

```nix
{
  services.caddy = {
    enable = true;
    virtualHosts."sync.yourdomain.com" = {
      extraConfig = ''
        reverse_proxy localhost:1234
      '';
    };
  };

  networking.firewall.allowedTCPPorts = [ 443 ];
}
```

**Option B: Use nginx**

```nix
{
  services.nginx = {
    enable = true;
    recommendedProxySettings = true;

    virtualHosts."sync.yourdomain.com" = {
      enableACME = true;
      forceSSL = true;

      locations."/" = {
        proxyPass = "http://localhost:1234";
        proxyWebsockets = true;
        extraConfig = ''
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
          proxy_set_header Host $host;
        '';
      };
    };
  };

  security.acme = {
    acceptTerms = true;
    defaults.email = "your-email@example.com";
  };

  networking.firewall.allowedTCPPorts = [ 80 443 ];
}
```

#### Step 4: DNS Configuration

Point your domain to your NixOS host:

```
A Record: sync.yourdomain.com → Your.NixOS.Host.IP
```

#### Step 5: Activate Configuration

```bash
# Rebuild NixOS configuration
sudo nixos-rebuild switch

# Check service status
sudo systemctl status media-tracker-sync
sudo journalctl -u media-tracker-sync -f
```

---

## Testing the Setup

### Test WebSocket Connection

From browser console:

```javascript
// For Cloudflare Workers
const ws = new WebSocket('wss://media-tracker-sync.<account-id>.workers.dev/sync?room=test');

// For self-hosted
const ws = new WebSocket('wss://sync.yourdomain.com/?room=test');

ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Failed:', e);
```

### Test Sync Between Devices

1. **Device A**:
   - Open app
   - Click sync indicator → Enable Sync
   - Copy Room ID

2. **Device B**:
   - Open same URL
   - Enable Sync → Paste Room ID
   - Both should show Synced status

3. **Test sync**:
   - Add time on Device A
   - Should instantly appear on Device B

---

## Troubleshooting

### "Disconnected" Status

**Check 1: Worker/service running?**
```bash
# For self-hosted
sudo systemctl status media-tracker-sync

# For Cloudflare, check the dashboard logs
```

**Check 2: Correct URL?**
- Check browser console for WebSocket connection errors
- Verify `VITE_SYNC_URL` is set correctly

**Check 3: SSL certificate?**
```bash
curl https://sync.yourdomain.com
```

### Mixed Content Errors

- Problem: Using `ws://` (insecure) from HTTPS page
- Solution: Must use `wss://` (secure WebSocket)

### GitHub Actions Deployment Fails

1. Check that `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets are set
2. Verify API token has correct permissions
3. Check workflow logs in GitHub Actions tab

---

## Cost Analysis

| Component | Cost |
|-----------|------|
| Cloudflare Pages | Free (unlimited bandwidth) |
| Cloudflare Workers | Free (100k requests/day) |
| Durable Objects | Free (included in free tier for small usage) |
| Self-hosted NixOS | $0 (your own hardware) |

**Total monthly cost**: $0

---

## Local Development

```bash
# Start frontend dev server
npm run dev

# Start local sync server (separate terminal)
npm run server

# Or start Cloudflare Worker locally
npm run worker:dev
```

---

## Skip Sync Entirely

If you don't need multi-device sync, just deploy to Cloudflare Pages and don't enable sync in the app. It works perfectly as a local-only app!

---

## Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [NixOS Manual](https://nixos.org/manual/nixos/stable/)
- [Caddy Server](https://caddyserver.com/docs/)
