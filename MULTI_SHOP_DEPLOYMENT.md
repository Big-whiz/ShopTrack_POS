# Multi-Shop Deployment Guide (Ubuntu Headless + Tailscale)

Deploying multiple independent ShopTrack POS instances on a single Ubuntu headless server is surprisingly elegant. By using **Tailscale in a Docker sidecar container**, each shop's stack gets its own dedicated internal Tailscale IP without conflicting with the other shops.

Here is exactly how to achieve this architecture.

---

## The Architecture Concept

Instead of installing Tailscale directly on the host machine and tunneling all traffic to `localhost:8081`, `localhost:8082`, etc., you install Tailscale **inside the Docker Compose network** of each shop as a "sidecar."

When the containers spin up:
1. The `tailscale` container authenticates with your Tailnet using a pre-generated Auth Key.
2. It claims a unique hostname (e.g., `shop-a-pos`).
3. Tailscale assigns it a unique IP (e.g., `100.10.x.x`).
4. Using Tailscale's `Serve` proxy, it securely funnels all incoming web traffic directly to the internal Nginx container.

Because the system doesn't rely on exposing ports on the Ubuntu host, you can run identical `docker-compose.yml` configs simultaneously without port collision errors.

---

## Step-by-Step Implementation

### 1. Server Preparation

Log into your Ubuntu headless server via SSH and install Docker, Docker Compose, and Git:
```bash
# Install Docker Engine and Docker Compose
sudo apt update
sudo apt install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Repo
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2. Prepare Directory Structures

Create isolated clone directories for each individual shop. Docker Compose automatically scopes container names to their parent directory name, preventing name collisions.

```bash
mkdir -p /opt/shoptrack
cd /opt/shoptrack

# Clone the codebase for Shop A
git clone <your-repo-url> shop-a

# Clone the codebase for Shop B
git clone <your-repo-url> shop-b
```

### 3. Generate Tailscale Auth Keys

Log into your Tailscale Admin Console (https://login.tailscale.com/admin/settings/keys) and generate an **Auth Key** for each shop. 
- **Recommendation:** Make the key reusable if you plan on tearing down and bringing up the container often, and give it a tag (e.g., `tag:pos`).

### 4. Create Tailscale Serve Configurations

For each shop directory (`/opt/shoptrack/shop-a`), create a `serve.json` file. This tells the Tailscale container to route incoming TLS web traffic securely to the `nginx` container on port `80`.

**File:** `/opt/shoptrack/shop-a/serve.json`
```json
{
  "TCP": {
    "443": {
      "HTTPS": true
    }
  },
  "Web": {
    "${TS_CERT_DOMAIN}:443": {
      "Handlers": {
        "/": {
          "Proxy": "http://nginx:80"
        }
      }
    }
  }
}
```
*(Copy this exact file to `shop-b`, `shop-c`, etc.)*

### 5. Modify `docker-compose.yml`

In each shop's `docker-compose.yml`, you need to do two things:
1. **Remove** the exposed ports from the Nginx container (delete `ports: - "80:80"`).
2. **Add** the Tailscale sidecar container.

Modify your Compose file to look like this:

```yaml
services:
  # ... (db, backend, and frontend remain unchanged) ...

  nginx:
    image: nginx:1.25-alpine
    container_name: ${COMPOSE_PROJECT_NAME}_nginx
    restart: always
    # REMOVED ports: 80:80 (Traffic now flows through Tailscale instead)
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend
      - frontend
    networks:
      - shoptrack_net

  tailscale:
    image: tailscale/tailscale:latest
    container_name: ${COMPOSE_PROJECT_NAME}_tailscale
    hostname: shop-a-pos  # CHANGE THIS: e.g., shop-b-pos, shop-c-pos
    environment:
      - TS_AUTHKEY=tskey-auth-xxxx...  # Replace with your Tailscale Auth Key
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_SERVE_CONFIG=/config/serve.json
    volumes:
      - tailscale_data:/var/lib/tailscale
      - ./serve.json:/config/serve.json:ro
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - net_admin
      - sys_module
    depends_on:
      - nginx
    restart: always
    networks:
      - shoptrack_net

volumes:
  postgres_data:
  tailscale_data:  # ADD this volume to persist Tailscale node identity

networks:
  shoptrack_net:
    driver: bridge
```

### 6. Configure Environments and Build

Before spinning up each shop, make sure the database passwords, JWT secrets, and Tailscale frontend configs are set in the `.env` files.

**For Shop A:**
1. Update `backend/.env`.
2. Update `frontend/.env` -> `VITE_API_BASE_URL=https://shop-a-pos.your-tailnet.ts.net/api/v1` (Note we are using `https://` since Tailscale provisions TLS automatically).
3. Run `docker compose up -d --build`.

**For Shop B:**
1. Change directory: `cd /opt/shoptrack/shop-b`
2. Update `backend/.env`.
3. Update `frontend/.env` -> `VITE_API_BASE_URL=https://shop-b-pos.your-tailnet.ts.net/api/v1`
4. Update `docker-compose.yml` to set `hostname: shop-b-pos` and the new `TS_AUTHKEY`.
5. Run `docker compose up -d --build`.

### 7. Access the Apps

You are done! Now open your browser on any device connected to your Tailnet:
- Search **https://shop-a-pos** to access Shop A's terminal.
- Search **https://shop-b-pos** to access Shop B's terminal.

Each is completely isolated on the same Ubuntu host. They have independent containers, independent Nginx instances, and independent Tailscale IPs safely routing traffic end-to-end securely!

---

## How the Database is Handled

Because Docker Compose prefixes all containers and volumes with the name of the folder they reside in, **each shop gets an entirely isolated PostgreSQL database**. 

For example:
- In the `/opt/shoptrack/shop-a` directory, the database volume is automatically named `shop-a_postgres_data`.
- In the `/opt/shoptrack/shop-b` directory, the database volume is automatically named `shop-b_postgres_data`.

They do not share data, tables, or users. They are two physically separate database engines running in parallel on different internal Docker IPs. 

When you need to perform backups or run migrations, you execute the commands inside that specific shop's folder:

```bash
cd /opt/shoptrack/shop-a
# Only affects Shop A's database
docker compose exec backend alembic upgrade head
```
