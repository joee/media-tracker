# NixOS systemd service for Kids Media Tracker Sync Server
# Add this to your NixOS configuration.nix

{ config, pkgs, ... }:

{
  # Create a systemd service for the sync server
  systemd.services.media-tracker-sync = {
    description = "Kids Media Tracker Sync Server";
    after = [ "network.target" ];
    wantedBy = [ "multi-user.target" ];

    serviceConfig = {
      Type = "simple";
      User = "media-tracker";  # Change to your preferred user
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

  # Create the user for the service
  users.users.media-tracker = {
    isSystemUser = true;
    group = "media-tracker";
    description = "Media Tracker Sync Server user";
    home = "/var/lib/media-tracker";
    createHome = true;
  };

  users.groups.media-tracker = {};

  # Open firewall port for WebSocket connections
  networking.firewall.allowedTCPPorts = [ 1234 ];
}
