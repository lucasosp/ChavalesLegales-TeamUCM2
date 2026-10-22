# Deploy

The production stack lives in `compose.prod.yml`: `caddy` (reverse proxy),
`frontend` (Next.js, including the LegalinStory novel built into
`public/novela`) and `backend` (FastAPI/uvicorn). Everything is built from
`Dockerfile` in this repository (three targets).

Public URL: **https://datathon.tetegrid.dev** (Cloudflare tunnel).

## Updating on miquella: `git pull` is enough

The host deploys this folder automatically:

- `datathon-deploy.timer` runs every 2 minutes and compares the `HEAD` of
  `/home/tete/ChavalesLegales-TeamUCM2` with the revision recorded in
  `/var/lib/datathon/.deployed-rev`.
- When they differ it rsyncs the working tree into `/var/lib/datathon`,
  fixes ownership (`datathon` group read access, `.env.prod` 0640), and
  restarts `datathon.service`, which runs
  `docker-compose ... up -d --build` (the `--build` is what makes code
  changes actually ship).

So the update loop is:

```sh
cd ~/ChavalesLegales-TeamUCM2
git pull            # site is live within ~2 minutes
```

Uncommitted edits are copied along with the commit, but they only trigger a
deploy once `HEAD` moves. To deploy the current working tree right away:

```sh
sudo systemctl start datathon-redeploy
```

## Local / first deploy

```sh
cp .env.prod.example .env.prod
docker compose --env-file .env.prod -f compose.prod.yml up -d --build
# -> http://localhost
```

Notes:

- The app keeps its state in JSON files next to the backend sources
  (`telemetry_data.json`, `telemetry_drawings.json`, `casos_data.json`).
  `deploy/backend-entrypoint.sh` symlinks those into `/data`, which compose
  backs with the `datathon-data` volume, so data survives rebuilds while
  code updates still ship with the image.
- No database, no secrets: the only configuration is `SITE_ADDRESS` (what
  Caddy serves) and `ALLOWED_ORIGINS` (API CORS list).
- The frontend build runs `LegalinStory`'s vite build first
  (`frontend/scripts/prepare-novel.mjs` -> `frontend/public/novela`), so the
  Docker build context must be the repository root, not `frontend/`.

## Deployed on miquella (NixOS, cloudflared)

`miquella` runs this stack from `/var/lib/datathon` through the NixOS
module in `deploy/nixos/datathon.nix` (installed at
`~/dotfiles/modules/features/datathon.nix`, enabled in
`modules/hosts/miquella/configuration.nix`).

- Dedicated service user `datathon` (uid 989) runs the stack on its own
  rootless podman daemon; no root containers. The folder and the images
  live in that user's home/store.
- Caddy binds to `127.0.0.1:18081` only (`compose.tunnel.yml`); TLS
  terminates at the Cloudflare edge, so `SITE_ADDRESS=:80` in `.env.prod`.
- The Cloudflare tunnel is dashboard-managed: its token lives in sops
  (key `cloudflared-datathon-miquella` in `~/dotfiles/secrets/secrets.yaml`)
  and its public hostname is configured in the dashboard, not in Nix.

Bring-up checklist (as tete on miquella):

1. Cloudflare dashboard (Zero Trust > Networks > Tunnels > Create a tunnel,
   type Cloudflared): copy the token from the install command — the base64
   string after `cloudflared service install `.
2. Put it in sops (single line, no quotes):
   `nix run nixpkgs#sops ~/dotfiles/secrets/secrets.yaml`, set
   `cloudflared-datathon-miquella: <the-token>`.
3. Add public hostname `datathon.tetegrid.dev` routed to service
   `HTTP://localhost:18081`.
4. `sudo nixos-rebuild switch --flake ~/dotfiles#miquella`

   This creates the `datathon` user/group, `/var/lib/datathon`, the units
   and the sops secret. The first deploy then runs about a minute later
   (timer) and builds the images inside the service user's podman store,
   so the first start takes a few minutes.

Nothing else to copy by hand: the timer rsyncs the checkout into
`/var/lib/datathon` (including the git-ignored `.env.prod`).

## Day-to-day operations on miquella

```sh
systemctl status datathon datathon-deploy.timer cloudflared-datathon
sudo journalctl -u datathon-deploy -f                      # deploy log (per commit)
sudo journalctl -u datathon -u cloudflared-datathon -f      # stack + tunnel
sudo podman --url unix:///run/user/989/podman/podman.sock logs -f datathon-backend-1
sudo systemctl restart datathon                            # redeploy without a new commit
sudo systemctl start datathon-redeploy                     # force deploy working tree
```

Data (`telemetry_data.json`, `telemetry_drawings.json`,
`casos_data.json`) lives in the `datathon-data` podman volume of the
`datathon` user, so it survives redeploys.

## Known issue: the tunnel port (7844) depends on the network miquella is on

cloudflared reaches the Cloudflare edge on TCP/UDP **7844 only**. Some
networks drop it while leaving 443 open, and then `cloudflared-datathon`
retries `quic`, falls back to `http2`, times out and never registers: the
site answers 530 even though everything else is healthy.

What we have measured on miquella:

| network | lease | edge:7844 | tunnel |
|---|---|---|---|
| `eduroam` (UCM) | 10.8.x.x | dropped (all edge IPs, TCP+UDP) | never registers |
| `gigacube-B00A95` | 192.168.0.x | reachable | registers |

So the first thing to check when the site is down is the wifi:
`nmcli device status` and `nmcli -g IP4.ADDRESS device show wlp58s0`. On
eduroam, `timeout 5 bash -c 'exec 3<>/dev/tcp/198.41.200.33/7844'` fails;
on gigacube it succeeds.

After a long run of failures, the cloudflared process can stay wedged
after the network is fixed (journal goes silent, no retries): restart it.

```sh
sudo systemctl restart cloudflared-datathon
journalctl -u cloudflared-datathon -f      # expect "Registered tunnel connection"
```

Two ways out when the network really blocks 7844:

1. **Change the network** (hotspot/venue firewall/ISP) so miquella itself
   can dial the edge, then `sudo systemctl restart cloudflared-datathon`.
   This is the only option where miquella hosts the tunnel itself.
2. **Pivot the connector** to a machine that can reach 7844 and forward the
   ingress target back to miquella over SSH — see
   `deploy/tunnel-pivot.sh`. The app still runs on miquella; only the
   outbound tunnel leg moves:

   ```sh
   # on the machine with 7844 access (e.g. malenia)
   TUNNEL_TOKEN=$(ssh tete@miquella 'nix run nixpkgs#sops -- -d ~/dotfiles/secrets/secrets.yaml' \
     | grep '^cloudflared-datathon-miquella:' | cut -d' ' -f2-) \
     setsid nohup ./deploy/tunnel-pivot.sh >/tmp/cf-datathon.log 2>&1 &
   ```

   The dashboard route stays `datathon.tetegrid.dev -> HTTP://localhost:18081`
   because the pivot makes `localhost:18081` on that machine resolve to
   miquella's Caddy.

Note: the public hostname must exist as a route on the tunnel; until it is
added, `datathon.tetegrid.dev` is NXDOMAIN (`tetegrid.dev` itself is on
Cloudflare's nameservers).
