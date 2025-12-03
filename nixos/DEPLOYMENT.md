# NixOS Deployment Guide

This guide covers deploying the Kids Media Tracker with:
- **Frontend (PWA)**: Cloudflare Pages (free, global CDN)
- **Sync Server**: Your NixOS host (self-hosted)

## Architecture Overview

```
Cloudflare Pages (HTTPS) ← Browser → Your NixOS Host (WSS)
     (Static PWA)                      (WebSocket Sync)
```

## Prerequisites

1. NixOS host with public IP or domain name
2. Domain name (for SSL certificate) - e.g., `sync.yourdomain.com`
3. Cloudflare account (free tier is fine)
4. GitHub repo connected to Cloudflare Pages

## Part 1: Deploy Frontend to Cloudflare Pages

### Step 1: Build Configuration

Cloudflare Pages needs to know where your sync server is. You have two options:

**Option A: Hardcode sync URL (simpler)**

Edit `src/lib/yjs.ts` before deploying:

```typescript
export const getSyncConfig = () => {
  const syncEnabled = localStorage.getItem('sync-enabled') === 'true';
  const syncUrl = localStorage.getItem('sync-url') || 'wss://sync.yourdomain.com'; // Your server
  const roomId = localStorage.getItem('sync-room') || generateRoomId();
  return { syncEnabled, syncUrl, roomId };
};
```

**Option B: Use environment variable**

Create `.env.production`:
```bash
VITE_SYNC_URL=wss://sync.yourdomain.com
```

Then update `src/lib/yjs.ts`:
```typescript
const syncUrl = localStorage.getItem('sync-url') ||
                import.meta.env.VITE_SYNC_URL ||
                'ws://localhost:1234';
```

### Step 2: Deploy to Cloudflare Pages

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
   - Custom domain: Add your own domain in Cloudflare Pages settings

## Part 2: Deploy Sync Server to NixOS

### Step 1: Install Server Files

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

### Step 2: Configure NixOS Service

Add to your `/etc/nixos/configuration.nix`:

```nix
{ config, pkgs, ... }:

{
  # Import the sync server service
  imports = [
    # ... your existing imports
  ];

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

### Step 3: SSL Certificate (Required for WSS)

Since Cloudflare Pages uses HTTPS, your sync server MUST use WSS (WebSocket Secure).

**Option A: Use Caddy (Easiest)**

Add to `configuration.nix`:

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

  # Open HTTPS port
  networking.firewall.allowedTCPPorts = [ 443 ];
}
```

Caddy automatically gets Let's Encrypt certificates!

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

### Step 4: DNS Configuration

Point your domain to your NixOS host:

```
A Record: sync.yourdomain.com → Your.NixOS.Host.IP
```

Wait for DNS propagation (usually 5-15 minutes).

### Step 5: Activate Configuration

```bash
# Rebuild NixOS configuration
sudo nixos-rebuild switch

# Check service status
sudo systemctl status media-tracker-sync
sudo journalctl -u media-tracker-sync -f

# Check if WebSocket is accessible
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     https://sync.yourdomain.com/
```

## Part 3: Testing the Setup

### Test from Browser Console

Visit your Cloudflare Pages deployment and open browser console:

```javascript
// Test WebSocket connection
const ws = new WebSocket('wss://sync.yourdomain.com/?room=test');
ws.onopen = () => console.log('✅ Connected!');
ws.onerror = (e) => console.error('❌ Failed:', e);
```

### Test Sync Between Devices

1. **Device A**:
   - Open app at `https://your-app.pages.dev`
   - Click sync indicator → Enable Sync
   - Copy Room ID

2. **Device B**:
   - Open same URL
   - Enable Sync → Paste Room ID
   - Both should show 🟢 Synced

3. **Test sync**:
   - Add time on Device A
   - Should instantly appear on Device B

## Troubleshooting

### "Disconnected" Status

**Check 1: Service running?**
```bash
sudo systemctl status media-tracker-sync
```

**Check 2: Port open?**
```bash
sudo ss -tlnp | grep 1234
```

**Check 3: Firewall?**
```bash
sudo iptables -L -n | grep 1234
```

**Check 4: SSL certificate?**
```bash
curl https://sync.yourdomain.com
```

### Mixed Content Errors

If you see "Mixed Content" errors in browser console:
- ❌ Problem: Using `ws://` (insecure) from HTTPS page
- ✅ Solution: Must use `wss://` (secure WebSocket)

### CORS Issues

The sync server doesn't need CORS (WebSocket protocol doesn't use CORS), but if you see errors:
- Check that you're connecting to the correct domain
- Ensure SSL certificate is valid

### Performance

The sync server is very lightweight:
- **RAM**: ~30-50 MB
- **CPU**: Minimal (only when syncing)
- **Bandwidth**: ~1-5 KB per sync event

For a family with 2-3 devices, this will barely use any resources.

## Security Considerations

1. **Room IDs**: Currently not encrypted. Anyone with your Room ID can join.
   - Keep Room IDs private
   - Future: Add PIN protection (Phase 5)

2. **SSL**: Required for production. Caddy/nginx handles this automatically.

3. **Firewall**: Only port 443 (HTTPS) needs to be open publicly.

4. **Updates**: The sync server has no database, so updates are just:
   ```bash
   # Copy new sync-server.mjs
   sudo systemctl restart media-tracker-sync
   ```

## Cost Analysis

**Cloudflare Pages**: Free
- Unlimited bandwidth
- Global CDN
- Free SSL
- Automatic deploys from Git

**Your NixOS Host**: $0 (self-hosted)
- Minimal resource usage
- No recurring costs
- Full control

**Total monthly cost**: $0 🎉

## Alternative: Skip Sync Server Entirely

If you don't need multi-device sync, just deploy to Cloudflare Pages and don't enable sync in the app. It works perfectly as a local-only app!

## Need Help?

- NixOS docs: https://nixos.org/manual/nixos/stable/
- Caddy docs: https://caddyserver.com/docs/
- Cloudflare Pages: https://developers.cloudflare.com/pages/
