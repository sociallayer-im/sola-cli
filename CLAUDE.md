# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Installation & Setup:**
```bash
npm install
node bin/sola.js --help
npm link  # optional: makes 'sola' available globally
```

**Verify setup:**
```bash
node bin/sola.js auth signin --email your@email.com
```

## Project Overview

`sola-cli` is a minimal Node.js CLI wrapper for the [Sola API](https://api.sola.day). It's designed for scripting event/venue management workflows, building integrations, and automating community operations.

**Tech Stack:**
- Node.js 18+ (native `fetch`)
- `yargs` for CLI argument parsing
- ESM modules (`"type": "module"`)
- No other dependencies

**Key Constraint:** Auth tokens are passed as query parameters (not headers), matching the Sola API's requirement.

## Architecture

The codebase follows a **clean, modular design** with a single responsibility per module:

### Entry Point: `bin/sola.js`
- Imports all command modules and registers them with yargs
- Enables automatic `--help` support across all commands
- Passes arguments to the appropriate handler

### Core Modules: `lib/`

**`lib/api.js`** — Central HTTP request dispatcher
- `request(method, path, params, auth)`: Handles GET/POST, auth injection, error normalization
- Exports 15+ API functions (`getEvent`, `listEvents`, `createEvent`, etc.)
- Auth tokens injected as query parameters automatically
- All errors are normalized to `{ result: 'error', message }` format

**`lib/config.js`** — Token persistence & caching
- Stores/retrieves auth tokens from `~/.sola/config.json` (auto-created)
- In-memory cache with 60-second TTL to avoid repeated disk reads
- `getToken()`: Returns cached or reads from disk; returns `null` if no token
- `saveToken(auth_token)`: Creates config directory and persists token as JSON

**`lib/utils.js`** — Shared helpers
- `handleError(fn)`: Wrapper that catches errors, logs to stderr, exits with code 1
- `requireAuth()`: Checks for token, throws if missing
- `buildQueryString(params)`: Converts object to URL query string (filters out `null`/`undefined`)

### Commands: `lib/commands/`

Each command module exports a **yargs command builder** with consistent structure:
- `command`: Subcommand name(s) (e.g., `'auth <subcommand>'`)
- `describe`: One-line description
- `builder(yargs)`: Registers sub-commands with options and examples
- All use `handleError()` wrapper for consistent error handling
- All output to stdout as JSON (for piping/scripting)

**Modules:**
- `auth.js`: Sign in (4 modes: interactive, send-only, with-code, piped), set handle
- `profile.js`: Get profile by email or handle
- `event.js`: Get, list (with filtering), create, update events
- `venue.js`: Get, list (auth required), create, update venues
- `group.js`: Get group by numeric ID or handle
- `service.js`: Image upload (multiple providers)

## Key Implementation Patterns

### Error Handling
All commands wrap async handlers with `handleError()`:
```javascript
handleError(async (argv) => {
  const data = await someApiCall()
  console.log(JSON.stringify(data, null, 2))
})
```
This eliminates try/catch duplication and ensures consistent exit codes.

### Parameter Mapping
CLI arguments are normalized before API calls. Example from `event.js`:
```javascript
const params = {
  group_id: argv.group,        // '--group' → 'group_id'
  start_date: argv['start-date'], // '--start-date' → 'start_date'
}
```

### Nested Parameters
Some endpoints (venue) use nested parameter objects:
```javascript
createVenue(group_id, venueFields)
// Becomes: { group_id, venue: venueFields } in the POST body
```

### Authentication
- Public endpoints: `request(method, path, params, false)` — no token injected
- Auth-required endpoints: `request(method, path, params, true)` — token auto-injected
- Token checked via `requireAuth()` if endpoint passes `auth=true`

## Common Development Tasks

**Add a new command:**
1. Create `lib/commands/newcommand.js` with yargs builder
2. Import in `bin/sola.js` and register with `.command(newcommand)`
3. Use existing API functions from `lib/api.js` or add new ones
4. Wrap handler with `handleError()`

**Add a new API function:**
1. Add to `lib/api.js` as an export
2. Use the centralized `request()` helper
3. Set `auth=true` if the endpoint requires authentication

**Test a command:**
```bash
node bin/sola.js <command> --help  # View all options
node bin/sola.js event list --group 10 --limit 5
```

**Debug API calls:**
Set `NODE_DEBUG=fetch` to see HTTP details (requires Node.js internal inspection).

## API Endpoint Reference

Base URL: `https://api.sola.day` (no `/api/` prefix)

**Auth endpoints:**
- `POST /service/send_email` — Send verification code
- `POST /profile/signin_with_email` — Sign in with code
- `POST /profile/create` — Set handle after sign-in

**Read endpoints (no auth required):**
- `GET /profile/get_by_email?email=`
- `GET /profile/get_by_handle?handle=`
- `GET /event/get?id=`
- `GET /event/list?group_id=` (supports filtering)
- `GET /venue/get?id=`
- `GET /group/get?group_id=`

**Write endpoints (auth required):**
- `POST /event/create`, `/event/update`
- `POST /venue/create`, `/venue/list`, `/venue/update`
- `POST /service/upload_image*` (multiple versions)

See `README.md` and `COMMANDS.md` for full parameter documentation.

## Configuration & Paths

- **Config file:** `~/.sola/config.json` — Contains `{ "auth_token": "..." }`
- **Auto-created:** On first `sola auth signin`, directory and file are created automatically
- **Token caching:** 60-second in-memory cache in `config.js` to avoid repeated disk I/O

## Testing

**Manual testing of core flows:**
```bash
# Sign in (interactive)
node bin/sola.js auth signin --email test@example.com

# Sign in (non-interactive, two-step)
node bin/sola.js auth signin --email test@example.com --send-only
node bin/sola.js auth signin --email test@example.com --code 123456

# Set handle
node bin/sola.js auth set-handle --handle myhandle

# Public endpoints (no auth needed)
node bin/sola.js group get --id solaverse
node bin/sola.js event list --group 10 --limit 5

# JSON output for scripting
node bin/sola.js event list --group 10 | jq '.events[].id'
```

## Notes for Future Work

- **No external storage:** Tokens are only stored locally in `~/.sola/config.json`
- **One dependency:** Only `yargs`; all other features use Node.js built-ins
- **Query param auth:** Unlike typical REST APIs, Sola requires `auth_token` in query string (both GET and POST)
- **JSON-only output:** All responses are JSON; no table formatting or other output types
- **Streaming not supported:** File uploads use FormData but no streaming for large files yet
