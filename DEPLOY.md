# Deployment

The site deploys automatically to the home NAS. There is nothing to click.

```
git push origin main
      ↓
GitHub Actions builds the Docker image (Node build → nginx)
      ↓
Image pushed to ghcr.io/jamisonhill/aquarium:latest (public package)
      ↓
Watchtower on the NAS polls every 5 minutes, pulls, restarts
      ↓
Live at http://192.168.0.9:3023/ within ~5–10 minutes
```

## Where things live

| Thing | Location |
|---|---|
| Live site (LAN) | http://192.168.0.9:3023/ |
| Health check | http://192.168.0.9:3023/health |
| Kiosk / TV mode | http://192.168.0.9:3023/?kiosk=1 |
| GitHub repo | https://github.com/jamisonhill/aquarium |
| Actions builds | https://github.com/jamisonhill/aquarium/actions |
| Image registry | ghcr.io/jamisonhill/aquarium (public) |
| Compose file on NAS | /volume1/docker/aquarium/docker-compose.yml |
| Containers | `aquarium` (nginx, port 3023) + `watchtower-aquarium` |
| Portainer | http://192.168.0.9:9000 (containers visible there) |

## If an update doesn't appear

1. Check the Actions run went green.
2. Check Watchtower logs:
   `ssh nas-home "sudo /usr/local/bin/docker logs watchtower-aquarium --tail 20"`
3. Verify fresh content is actually in the container (don't trust timestamps):
   `ssh nas-home "sudo /usr/local/bin/docker exec aquarium ls /usr/share/nginx/html/assets"`
   — the JS bundle filename hash changes on every build.
4. Hard-refresh the browser (Cmd+Shift+R).

## Manual redeploy (rarely needed)

```bash
ssh nas-home "sudo env PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/docker-compose \
  -f /volume1/docker/aquarium/docker-compose.yml up -d --force-recreate"
```
