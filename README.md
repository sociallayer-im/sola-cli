# sola-cli

A minimal Node.js CLI wrapper for the [Sola API](https://api.sola.day) designed for AI agents and developers.

Perfect for:
- Scripting event/venue management workflows
- Building integrations with the Sola event platform
- Exploring the API without writing HTTP clients
- Automating group and community operations

## Installation

```bash
cd sola-cli
npm install
chmod +x bin/sola.js
npm link  # optional: makes 'sola' available globally
```

**Verify installation:**
```bash
node bin/sola.js --help
```

## Requirements

- **Node.js >= 18.0.0** (for native `fetch`)
- **One dependency**: `yargs` for CLI argument parsing
- **Network access** to `https://api.sola.day`

## Configuration

Auth tokens are stored in `~/.sola/config.json`:

```json
{
  "auth_token": "your-jwt-token-here"
}
```

This file is created automatically after signing in with `sola auth signin`.

## Quick Start

### 1. Sign in
```bash
node bin/sola.js auth signin --email your@email.com
# Prompts for 6-digit code sent to email
# Saves auth_token to ~/.sola/config.json
```

### 2. Set your handle (one-time)
```bash
node bin/sola.js auth set-handle --handle yourhandle
```

### 3. Find a group and list events
```bash
node bin/sola.js group get --id solaverse
node bin/sola.js event list --group 10 --collection upcoming
```

### 4. Create an event
```bash
node bin/sola.js event create \
  --group 10 \
  --title "Community Lunch" \
  --start "2026-10-10T12:00:00" \
  --end "2026-10-10T14:00:00" \
  --timezone America/Los_Angeles \
  --location "Hotel Trio - Patio"
```

## Commands

### Authentication

**Sign in with email** (two-step: sends 6-digit code to email, then prompts for it)

```bash
node bin/sola.js auth signin --email user@example.com
```

Auth token is automatically saved to `~/.sola/config.json` and used for all subsequent authenticated operations.

**Set profile handle** (unique username, required after first sign-in)

```bash
node bin/sola.js auth set-handle --handle myhandle
```

### Profile

**Get profile by email**

```bash
node bin/sola.js profile get-by-email --email user@example.com
```

**Get profile by handle**

```bash
node bin/sola.js profile get-by-handle --handle myhandle
```

### Events

**Get a single event**

```bash
node bin/sola.js event get --id 123
```

**List events** (requires auth for private events)

```bash
node bin/sola.js event list --group 123
node bin/sola.js event list --group 123 --collection upcoming --limit 20
node bin/sola.js event list --group 123 --tags "tag1,tag2" --start-date 2025-01-15
```

**Create an event** (requires auth)

```bash
node bin/sola.js event create \
  --group 123 \
  --title "My Event" \
  --start "2025-01-15T10:00:00" \
  --end "2025-01-15T12:00:00" \
  --location "Singapore" \
  --timezone "Asia/Singapore"
```

**Update an event** (requires auth)

```bash
node bin/sola.js event update --id 123 --title "Updated Title"
```

### Venues

**Get a venue**

```bash
node bin/sola.js venue get --id 123
```

**List venues** (requires auth)

```bash
node bin/sola.js venue list --group 123
```

**Create a venue** (requires auth)

```bash
node bin/sola.js venue create \
  --group 123 \
  --title "My Venue" \
  --location "123 Main St" \
  --capacity 100
```

**Update a venue** (requires auth)

```bash
node bin/sola.js venue update --id 123 --title "Updated Venue" --capacity 150
```

### Groups

**Get a group by ID or handle**

```bash
node bin/sola.js group get --id 123
node bin/sola.js group get --id solaverse
```

## Help

View help for any command:

```bash
node bin/sola.js --help
node bin/sola.js event --help
node bin/sola.js event create --help
```

## Architecture

Clean, modular design with minimal dependencies:

- **`lib/api.js`** — Central `request()` helper:
  - Dispatches GET/POST with correct parameter handling
  - Injects `auth_token` as query parameter for authenticated requests
  - Normalizes error responses across all endpoints
  
- **`lib/config.js`** — Token persistence:
  - Reads/writes auth tokens to `~/.sola/config.json`
  - Silently returns `null` if no token (allows public endpoints)
  
- **`lib/utils.js`** — Shared utilities:
  - `handleError()` wrapper eliminates try/catch duplication
  
- **`lib/commands/*.js`** — Command modules (5 files):
  - Each module is a self-contained yargs command builder
  - Imports only the API functions it needs
  - Consistent error handling and output format
  
- **`bin/sola.js`** — Entry point:
  - Simple yargs setup registering all command modules
  - Enables `--help` for all commands automatically

## Design Decisions

| Decision | Reason |
|----------|--------|
| Native `fetch` (no `node-fetch`) | Node 18+ has built-in fetch; no extra dependencies |
| One `request()` helper | Single point for auth injection, error handling, and base URL |
| `~/.sola/config.json` | Standard location for CLI tools; auto-created on first sign-in |
| `readline` for code prompt | Zero extra deps for interactive two-step sign-in flow |
| `auth_token` as query param | API requires tokens in query string (both GET and POST) |
| Venue params nested under `venue` key | Matches Sola API's Rails strong parameters requirement |
| Error handling wrapper | Centralized `handleError()` reduces duplication across commands |
| ESM (`"type": "module"`) | Top-level `await` support; modern Node convention |

## API Endpoint Reference

All endpoints use `https://api.sola.day` as the base URL (no `/api/` prefix).

**Authentication:** Authenticated endpoints receive `auth_token` as a query parameter (automatically injected by sola-cli).

### Authentication
- `POST /service/send_email` — Send 6-digit verification code
- `POST /profile/signin_with_email` — Sign in with email + code
- `POST /profile/create` — Set handle after sign-in

### Profile
- `GET /profile/get_by_email?email=` — Get profile by email
- `GET /profile/get_by_handle?handle=` — Get profile by handle

### Events
- `GET /event/get?id=` — Get event by ID
- `GET /event/list?group_id=` — List group events (supports filtering)
- `POST /event/create` — Create event (requires auth)
- `POST /event/update` — Update event (requires auth)

### Venues
- `GET /venue/get?id=` — Get venue by ID
- `GET /venue/list?group_id=` — List group venues (requires auth)
- `POST /venue/create` — Create venue (requires auth)
- `POST /venue/update` — Update venue (requires auth)

### Groups
- `GET /group/get?group_id=` — Get group by numeric ID or handle

See **[COMMANDS.md](./COMMANDS.md)** for full parameter documentation and additional endpoints (badges, voting, points, etc.).

## Output & Scripting

All commands output **JSON** to stdout on success, making them pipe-friendly and easy to integrate into scripts.

**Extract event IDs:**
```bash
node bin/sola.js event list --group 10 --limit 5 | jq '.events[].id'
```

**Filter events by tag:**
```bash
node bin/sola.js event list --group 10 | jq '.events[] | select(.tags | contains(["web3"]))'
```

**Bulk venue lookup:**
```bash
node bin/sola.js venue list --group 10 | jq '.venues[] | {id, title, capacity}'
```

**Check operation status:**
```bash
node bin/sola.js event create ... && echo "✓ Event created"
```

**On error**, messages go to stderr and process exits with code `1`:
```bash
$ node bin/sola.js event get --id 999999
Error: Couldn't find Event with 'id'=999999

$ echo $?
1
```

## Troubleshooting

**"Not authenticated" error:**
- Run `sola auth signin --email your@email.com` first
- Check `~/.sola/config.json` exists and contains a valid token

**"Invalid group ID" error:**
- Use numeric group ID (e.g., `--group 10`) not handle name
- Use `sola group get --id solaverse` to find the numeric ID

**"404 Not Found" error:**
- Verify the resource exists (event ID, venue ID, etc.)
- Some operations require specific permissions (e.g., venue listing requires auth)

**Commands hanging or very slow:**
- Check network connectivity to `https://api.sola.day`
- The API may be experiencing high load

## Development

**Run tests/verify all commands:**

```bash
# Test help
node bin/sola.js --help

# Test sign-in flow (interactive)
node bin/sola.js auth signin --email test@example.com

# Test read commands
node bin/sola.js group get --id solaverse
node bin/sola.js event list --group 1 --limit 5

# Test scripting
node bin/sola.js event list --group 3409 | jq '.events | length'
```

## Full Documentation

See **[COMMANDS.md](./COMMANDS.md)** for complete parameter references and examples for all 14+ commands including:
- Advanced event filtering (dates, collections, tags)
- Venue management with coordinates
- Badge creation and distribution
- Voting and points systems
- Form submissions

## License

MIT
