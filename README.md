# sola-cli

A minimal Node.js CLI wrapper for the [Sola API](https://api.sola.day) designed for AI agents and developers.

## Installation

```bash
cd /Users/jiang/apps/sola-cli
npm install
chmod +x bin/sola.js
npm link  # optional: makes 'sola' available globally
```

## Requirements

- **Node.js >= 18.0.0** (for native `fetch`)
- **One dependency**: `yargs` for CLI argument parsing

## Configuration

Auth tokens are stored in `~/.sola/config.json`:

```json
{
  "auth_token": "your-jwt-token-here"
}
```

This file is created automatically after signing in with `sola auth signin`.

## Commands

### Authentication

**Sign in with email** (two-step: sends code, then prompts for verification)

```bash
node bin/sola.js auth signin --email user@example.com
```

**Set profile handle** (requires auth)

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

- **`lib/api.js`** — Single `request()` helper function handling GET/POST dispatch, auth injection, and error handling
- **`lib/config.js`** — Reads/writes auth tokens to `~/.sola/config.json`
- **`lib/commands/*.js`** — Yargs command builders (auth, profile, event, venue, group)
- **`bin/sola.js`** — Entry point; registers all commands with yargs

## Design Decisions

| Decision | Reason |
|----------|--------|
| Native `fetch` (no `node-fetch`) | Node 18+ has built-in fetch; no extra dependencies |
| One `request()` helper | Single point for auth, error handling, and base URL |
| `~/.sola/config.json` | Standard location for CLI tools to store config |
| `readline` for code prompt | Zero extra deps for two-step sign-in flow |
| Venue params nested under `venue` key | Matches Rails API strong params requirement |
| Bearer token in header (not query param) | More secure; standard REST practice |
| ESM (`"type": "module"`) | Top-level `await` support; modern Node convention |

## API Endpoint Reference

All endpoints use `https://api.sola.day` as the base URL.

### Authentication
- `POST /api/service/send_email` — Send verification code
- `POST /api/profile/signin_with_email` — Sign in with email + code
- `POST /api/profile/create` — Set handle after sign-in

### Profile
- `GET /api/profile/get_by_email?email=` — Get profile by email
- `GET /api/profile/get_by_handle?handle=` — Get profile by handle

### Events
- `GET /api/event/get?id=` — Get event
- `GET /api/event/list?group_id=` — List group events
- `POST /api/event/create` — Create event
- `POST /api/event/update` — Update event

### Venues
- `GET /api/venue/get?id=` — Get venue
- `GET /api/venue/list?group_id=` — List group venues
- `POST /api/venue/create` — Create venue
- `POST /api/venue/update` — Update venue

### Groups
- `GET /api/group/get?group_id=` — Get group

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
```

## License

MIT
