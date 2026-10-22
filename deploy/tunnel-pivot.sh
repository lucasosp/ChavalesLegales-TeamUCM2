#!/bin/sh
# Cloudflare tunnel pivot for hosts whose network blocks the tunnel ports.
#
# cloudflared only talks to the Cloudflare edge on TCP/UDP 7844. miquella's
# network drops those (all edge IPs, 7844 tcp+udp; 443 is fine), so its own
# cloudflared-datathon.service can never register. This script runs the
# connector on a machine that *can* reach 7844 and forwards the tunnel's
# ingress target (localhost:18081) to miquella over SSH, so the app keeps
# running on miquella.
#
#   miquella 127.0.0.1:18081 (caddy)  <-- ssh -L --  malenia localhost:18081
#                                          ^ cloudflared connector
#
# Usage (on the machine with 7844 access, e.g. malenia):
#   TUNNEL_TOKEN=... ./deploy/tunnel-pivot.sh      # foreground
#   TUNNEL_TOKEN=... setsid nohup ./deploy/tunnel-pivot.sh &   # background
#
# The token is the one from sops on miquella:
#   ssh tete@miquella 'nix run nixpkgs#sops -- -d ~/dotfiles/secrets/secrets.yaml' \
#     | grep '^cloudflared-datathon-miquella:' | cut -d' ' -f2-
set -eu

: "${TUNNEL_TOKEN:?set TUNNEL_TOKEN (see the comment at the top)}"
REMOTE="${REMOTE:-tete@miquella}"
PORT="${PORT:-18081}"

# ssh -L gives cloudflared the ingress target it expects (localhost:PORT).
if ! pgrep -f "ssh -N -f -L ${PORT}:127.0.0.1:${PORT}" >/dev/null 2>&1; then
	ssh -N -f -L "${PORT}:127.0.0.1:${PORT}" \
		-o ExitOnForwardFailure=yes \
		-o ServerAliveInterval=30 \
		-o ServerAliveCountMax=3 \
		"$REMOTE"
	echo "ssh pivot: localhost:${PORT} -> ${REMOTE} 127.0.0.1:${PORT}"
fi

# --protocol http2: the networks that block 7844 also block QUIC, and the
# fallback costs ~2 minutes of retries on every start.
exec cloudflared tunnel --no-autoupdate --protocol http2 run
