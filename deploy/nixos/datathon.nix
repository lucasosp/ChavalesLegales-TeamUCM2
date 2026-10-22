# NixOS module for Chavales Legales ("datathon"): docker-compose stack +
# cloudflared tunnel + automatic deploys from the git checkout.
#
# Deployed layout (defaults):
#   /var/lib/datathon/          compose files, sources, .env.prod (0640)
#   /var/lib/datathon-home/     service user's home (rootless podman store)
#   sops secret                 cloudflared-datathon-miquella (tunnel token)
#
# Deploys: `datathon-deploy.timer` runs every 2 minutes and does a dry-run
# rsync of datathon.source into datathon.path; if anything differs it syncs
# for real, fixes ownership and restarts datathon.service. Edits, new commits
# and untracked files all trigger it, so `git pull` (or just saving a file) is
# all you do: the site updates within a couple of minutes. The last deployed
# revision is recorded in /var/lib/datathon/.deployed-rev.
# `sudo systemctl start datathon-redeploy` forces a sync.
#
# The stack runs on a dedicated service user (datathon) with its own
# rootless podman daemon, so no root containers. The user's podman store
# lives in its home; without linger there is no user manager (and no
# socket) until first login, so linger is enabled.
#
# Rootless podman cannot bind ports below 1024, which is fine here: TLS
# terminates at the Cloudflare edge, and Caddy serves plain HTTP on a
# loopback-only port (compose.tunnel.yml publishes 127.0.0.1:18081 -> 80).
#
# The tunnel is remotely managed from the Cloudflare dashboard, so its
# ingress lives there too: point the public hostname
# (datathon.tetegrid.dev) at service http://localhost:18081.
#
# First bring-up:
#   1. Zero Trust dashboard > Networks > Tunnels > Create a tunnel
#      (Cloudflared) and copy the token from the install command
#      (the base64 string after `cloudflared service install `);
#   2. put the token in sops:
#      nix run nixpkgs#sops ~/dotfiles/secrets/secrets.yaml
#      set  cloudflared-datathon-miquella: <token>  (single line, no quotes);
#   3. in the dashboard, add public hostname datathon.tetegrid.dev ->
#      http://localhost:18081;
#   4. sudo nixos-rebuild switch --flake ~/dotfiles#miquella
#      (creates the user, the units, the sops secret, and triggers the
#      first deploy about a minute later).
#
# The user running the service (cfg.user) has a fixed uid so the podman
# socket path and the user@<uid> ordering are deterministic (985, 990, 992,
# 993 and 994 were taken by the-game, slskd, navidrome, redis-immich and
# immich). tete joins the same group and keeps read/write access to the
# folder for manual deploys.
{ self, inputs, ... }: {
  flake.nixosModules.datathon = { config, lib, pkgs, ... }:
    let
      cfg = config.datathon;
      uid = toString config.users.users.${cfg.user}.uid;
      # Home of the service user. Rootless podman keeps its whole container
      # store in $HOME/.local/share/containers, so this must NOT be cfg.path:
      # the deploy rsync runs with --delete and would wipe the store.
      home = "/var/lib/${cfg.user}-home";

      # Make sure the user's podman API socket answers before compose runs.
      # Kept in a script file (not inline in ExecStart) because systemd would
      # expand `$i` inside the unit before the shell ever sees it.
      waitPodman = pkgs.writeShellScript "datathon-wait-podman" ''
        set -u
        export XDG_RUNTIME_DIR=/run/user/${uid}
        sc=${pkgs.systemd}/bin/systemctl

        # Two failure modes seen in practice:
        #  - a failed activation leaves podman.socket at its trigger limit, so
        #    it refuses further starts until the state is reset;
        #  - an interrupted build leaves podman.service up but unresponsive.
        "$sc" --user reset-failed podman.socket podman.service >/dev/null 2>&1 || true
        "$sc" --user try-restart podman.service >/dev/null 2>&1 || true
        "$sc" --user start podman.socket >/dev/null 2>&1 || true

        i=0
        while [ "$i" -lt 120 ]; do
          # timeout: a wedged daemon must not block this loop forever.
          ${pkgs.coreutils}/bin/timeout 10 ${pkgs.podman}/bin/podman --remote info >/dev/null 2>&1 && exit 0
          ${pkgs.coreutils}/bin/sleep 1
          i=$((i + 1))
        done
        echo "podman for uid ${uid} did not answer within 120s" >&2
        exit 1
      '';

      # Sync + redeploy helper shared by the timed deploy and the manual
      # `datathon-redeploy` unit (FORCE=1 skips the change detection).
      #
      # Change detection is an `rsync --dry-run --itemize-changes` of exactly
      # the same transfer that a deploy would perform, so uncommitted edits and
      # untracked files are picked up too (a HEAD comparison missed those).
      deploy = pkgs.writeShellScript "datathon-deploy" ''
        set -eu
        src=${cfg.source}
        dest=${cfg.path}

        # Kept out of the transfer:
        #  .git/.deployed-rev  deploy bookkeeping
        #  .env.prod           server-side config; copied once if missing
        #  node_modules/.next  build output of the local checkout
        #  .local/.config/.cache  a rootless podman store must never land here
        # --no-group: the deploy chgrp's everything to the service group at the
        # end, so without this every run would report a group difference and
        # redeploy/rebuild in a loop.
        set -- --archive --no-group --delete \
          --exclude .git --exclude .deployed-rev --exclude .env.prod \
          --exclude node_modules --exclude .next \
          --exclude .local --exclude .config --exclude .cache

        if [ "''${FORCE:-0}" != 1 ]; then
          if [ -z "$(${pkgs.rsync}/bin/rsync --dry-run --itemize-changes "$@" "$src"/ "$dest"/ 2>/dev/null | head -c 1)" ]; then
            echo "datathon: $dest is up to date, nothing to do"
            exit 0
          fi
        fi

        rev=$(git -c safe.directory="$src" -C "$src" rev-parse --short HEAD 2>/dev/null || echo unknown)
        echo "datathon: deploying ($rev) from $src to $dest"
        install -d -m 2775 -o ${cfg.user} -g ${cfg.user} "$dest"

        # Leftovers from before the service user got its own home: a podman
        # store inside the build context makes `compose build` fail.
        rm -rf "$dest/.local" "$dest/.config" "$dest/.cache"

        ${pkgs.rsync}/bin/rsync "$@" "$src"/ "$dest"/

        if [ ! -f "$dest/.env.prod" ]; then
          cp "$src/.env.prod" "$dest/.env.prod"
        fi
        # The service user only needs read access; .env.prod stays private.
        chgrp -R ${cfg.user} "$dest"
        chmod -R g+rX "$dest"
        chmod 640 "$dest/.env.prod"
        printf '%s\n' "$rev" > "$dest/.deployed-rev"
        chown ${cfg.user}:${cfg.user} "$dest/.deployed-rev"

        systemctl restart datathon.service
      '';
    in {
      options.datathon = {
        enable = lib.mkEnableOption ''
          Chavales Legales (datathon web app).

          Runs the docker-compose stack (caddy + Next.js frontend + FastAPI
          backend) from datathon.path on a dedicated user's rootless podman
          daemon, publishes it through a Cloudflare tunnel whose token lives
          in sops, and redeploys automatically when the sources change
          (polled every 2 minutes).
        '';

        user = lib.mkOption {
          type = lib.types.str;
          default = "datathon";
          description = ''
            Dedicated service user that owns and runs the stack (rootless
            podman). Its uid is pinned below; keep uid and user@<uid> in
            sync if you change it.
          '';
        };

        path = lib.mkOption {
          type = lib.types.str;
          default = "/var/lib/datathon";
          description = ''
            Folder the sources are deployed to: compose files, sources and
            .env.prod live here and are owned by the service user.
          '';
        };

        source = lib.mkOption {
          type = lib.types.str;
          default = "/home/tete/ChavalesLegales-TeamUCM2";
          description = ''
            Git checkout that gets deployed. Its working tree is rsynced into
            datathon.path whenever HEAD changes (checked every 2 minutes).
          '';
        };

        domain = lib.mkOption {
          type = lib.types.str;
          default = "datathon.tetegrid.dev";
          description = ''
            Public hostname served through the tunnel. Documentation only:
            the tunnel is dashboard-managed, so the hostname -> service
            mapping is configured there, not here.
          '';
        };
      };

      config = lib.mkIf cfg.enable {
        users.groups.${cfg.user} = { };

        users.users.${cfg.user} = {
          isSystemUser = true;
          # Fixed so that /run/user/<uid> (podman socket) and the
          # user@<uid>.service ordering are deterministic.
          uid = 989;
          group = cfg.user;
          home = home;
          linger = true;
          # Rootless podman needs subordinate uid/gid ranges; system users
          # don't get one automatically (only normal users do).
          autoSubUidGidRange = true;
          description = "Chavales Legales service user (rootless podman)";
        };

        # Manual deploys as tete keep working; the service user only needs
        # group read access.
        users.users.tete.extraGroups = [ cfg.user ];
        systemd.tmpfiles.rules = [
          "d ${cfg.path} 2775 ${cfg.user} ${cfg.user} - -"
          "d ${home} 0700 ${cfg.user} ${cfg.user} - -"
          # Every level gets its own rule, in order: when tmpfiles creates a
          # parent as a side effect of a deeper path it does so as root, which
          # leaves $HOME/.local owned by root and makes rootless podman fail
          # with "mkdir $HOME/.local/share: permission denied" (it also
          # aborts later runs with "unsafe path transition").
          "d ${home}/.config 0700 ${cfg.user} ${cfg.user} - -"
          "d ${home}/.local 0700 ${cfg.user} ${cfg.user} - -"
          "d ${home}/.local/share 0700 ${cfg.user} ${cfg.user} - -"
        ];

        # Tunnel token (placeholder until filled in via sops).
        sops.secrets."cloudflared-datathon-miquella" = {
          sopsFile = ../../secrets/secrets.yaml;
        };

        # Sync the checkout into cfg.path and restart the stack once the
        # revision changes. Runs as root (it reads tete's checkout and fixes
        # ownership), so git needs safe.directory.
        systemd.services.datathon-deploy = {
          description = "Deploy Chavales Legales from ${cfg.source} to ${cfg.path}";
          wants = [ "network-online.target" ];
          after = [ "network-online.target" ];
          path = [ pkgs.git pkgs.rsync pkgs.coreutils pkgs.systemd ];
          serviceConfig = {
            Type = "oneshot";
            ExecStart = deploy;
          };
        };

        systemd.timers.datathon-deploy = {
          description = "Poll ${cfg.source} for new commits";
          wantedBy = [ "timers.target" ];
          timerConfig = {
            OnBootSec = "1min";
            OnUnitInactiveSec = "2min";
          };
        };

        # `sudo systemctl start datathon-redeploy` -> deploy the current
        # working tree even if HEAD did not move.
        systemd.services.datathon-redeploy = {
          description = "Force-deploy the current Chavales Legales working tree";
          path = [ pkgs.git pkgs.rsync pkgs.coreutils pkgs.systemd ];
          serviceConfig = {
            Type = "oneshot";
            Environment = [ "FORCE=1" ];
            ExecStart = deploy;
          };
        };

        # The stack itself: compose up is idempotent, so this simply
        # converges on every boot (and on `systemctl restart datathon`).
        # --build is what makes code updates actually ship; unchanged layers
        # come from the build cache.
        systemd.services.datathon = {
          description = "Chavales Legales stack (docker compose: caddy + frontend + backend)";
          wantedBy = [ "multi-user.target" ];
          after = [ "network-online.target" "user@${uid}.service" ];
          # Pull in the user manager (linger starts it at boot; this makes
          # the service self-sufficient on a manual start too).
          wants = [ "network-online.target" "user@${uid}.service" ];
          environment = {
            DOCKER_HOST = "unix:///run/user/${uid}/podman/podman.sock";
            CONTAINER_HOST = "unix:///run/user/${uid}/podman/podman.sock";
            XDG_RUNTIME_DIR = "/run/user/${uid}";
            # Explicit: the user manager may have been started before this
            # home existed, and podman.service inherits HOME from it.
            HOME = home;
          };
          serviceConfig = {
            User = cfg.user;
            Type = "oneshot";
            RemainAfterExit = true;
            # Self-heal transient failures (podman hiccups, network flake
            # during a build) instead of waiting for the next deploy.
            Restart = "on-failure";
            RestartSec = "30s";
            # A cold start without cached images builds them first (npm +
            # vite + next build, a few minutes).
            TimeoutStartSec = "60min";
            WorkingDirectory = cfg.path;
            # Bring the user's podman socket back up before compose connects:
            # a failed activation leaves the socket unit at its trigger limit,
            # from where it refuses to start again until it is reset.
            ExecStartPre = waitPodman;
            ExecStart = "${pkgs.docker-compose}/bin/docker-compose --env-file .env.prod -f compose.prod.yml -f compose.tunnel.yml up -d --build";
            ExecStop = "${pkgs.docker-compose}/bin/docker-compose --env-file .env.prod -f compose.prod.yml -f compose.tunnel.yml down";
          };
          # .deployed-rev is written last by datathon-deploy, so requiring it
          # also guarantees the tree is complete and .env.prod is readable
          # (without it, the unit raced the rsync and hit a 0600 .env.prod).
          unitConfig.ConditionPathExists = "${cfg.path}/.deployed-rev";
        };

        # Tunnel to Caddy. Outbound-only connection to the Cloudflare edge;
        # the public hostname and its ingress rule are configured in the
        # Cloudflare dashboard (remotely managed tunnel). Until the sops
        # placeholder is replaced the unit fails to authenticate and
        # restarts, harmless.
        systemd.services.cloudflared-datathon = {
          description = "Chavales Legales Cloudflare tunnel (${cfg.domain})";
          after = [ "network-online.target" ];
          wants = [ "network-online.target" ];
          wantedBy = [ "multi-user.target" ];
          serviceConfig = {
            LoadCredential = "token:${config.sops.secrets."cloudflared-datathon-miquella".path}";
            ExecStart = "/bin/sh -c 'exec ${pkgs.cloudflared}/bin/cloudflared tunnel --no-autoupdate run --token \"$(cat %d/token)\"'";
            Restart = "on-failure";
            RestartSec = "10s";
            DynamicUser = true;
            CapabilityBoundingSet = "";
            NoNewPrivileges = true;
            ProtectSystem = "strict";
            ProtectHome = true;
          };
        };
      };
    };
}
