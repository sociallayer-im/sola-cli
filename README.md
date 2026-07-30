# sola-cli

A minimal Node.js CLI wrapper for the Sola API — `soon`, the Rails backend at
[api.sola.day](https://api.sola.day) — designed for AI agents and developers.

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
- **Network access** to `https://api.sola.day` (or a local `soon` dev server, see below)

## Configuration

Auth tokens are stored in `~/.sola/config.json`:

```json
{
  "auth_token": "your-jwt-token-here"
}
```

This file is created automatically after signing in with `sola auth signin`.

**Pointing at a local `soon` instance** (e.g. `bin/dev` on `:3000`, from the
`Procfile.dev` setup in the monorepo root):

```bash
SOLA_API_URL=http://localhost:3000 sola group get --id solaverse
```

## Quick Start

### 1. Sign in

**Interactive mode** (default):
```bash
node bin/sola.js auth signin --email your@email.com
# Sends a one-time code to your email, then prompts for it
# Saves the JWT to ~/.sola/config.json — new emails sign up automatically
```

**Non-interactive mode** (send-only + code — handy for CI/agents):
```bash
node bin/sola.js auth signin --email your@email.com --send-only
# Check email for the code
node bin/sola.js auth signin --email your@email.com --code AB12CD
```

The code is alphanumeric (e.g. `AB12CD`), not numeric.

### 2. Set your username (optional, one-time)
```bash
node bin/sola.js user update --name yourhandle --nickname "Your Name"
```

### 3. Find a group and list events
```bash
node bin/sola.js group get --id solaverse
node bin/sola.js event list --group solaverse --collection upcoming
```

### 4. Create an event
```bash
node bin/sola.js place create --name "Hotel Trio - Patio" --address "..."
# → returns a place id, use it below

node bin/sola.js event create \
  --group solaverse \
  --title "Community Lunch" \
  --start "2026-10-10T12:00:00" \
  --end "2026-10-10T14:00:00" \
  --timezone America/Los_Angeles \
  --place-id <id from above>
```

## Command groups

| Group | Covers |
|---|---|
| `auth` | signin, whoami |
| `user` | get/me/update/groups — soon's `User` model (sails called this "profile") |
| `group` | get/list/create/update/freeze/send-email/members/add-member/set-role/remove-membership/leave |
| `invite` | send/list/pending/show/accept/cancel/revoke/request/accept-request/send-with-code/accept-with-code |
| `event` | get/list/pending-approval/create/update/cancel/approve |
| `participant` | list/join/update/cancel/approve/reject/check-in — event participation (was folded into `event` before) |
| `venue` | get/list/create/update/remove/conflict/set-availability |
| `place` | get/search/create — venue/event locations resolve through a Place |
| `track` | list/get/create/update/remove — event programs/series within a group |
| `ticket` | list-types/list/create/update/remove/rsvp/verify-payment/cancel-unpaid/check-coupon/coupon-price |
| `discover` | home/search — public homepage payload + global search |
| `service` | upload-image |

Every command supports `--help` for its full parameter list.

## Help

```bash
node bin/sola.js --help
node bin/sola.js event --help
node bin/sola.js event create --help
```

## Architecture

- **`lib/api.js`** — the one `request()` transport, plus every endpoint
  function grouped by domain. `auth` mode per call mirrors soon's own
  three-tier model: `true` (required, fails fast locally if not signed in),
  `'optional'` (personalizes if a token is present, else anonymous), or
  omitted (never sends a token).
- **`lib/config.js`** — reads/writes the JWT to `~/.sola/config.json`.
- **`lib/utils.js`** — `handleError()`, `requireAuth()`, query-string building,
  comma-list and JSON-flag parsing helpers shared by the command modules.
- **`lib/commands/*.js`** — one yargs command builder per domain.
- **`bin/sola.js`** — registers every command module with yargs.

## API contract

- Base path: `https://api.sola.day/api/v1/...` (soon namespaces everything
  under `/api/v1`, unlike the retired sails backend).
- Auth: `Authorization: Bearer <jwt>` header — **not** a query/body param.
- Errors: real HTTP status codes with a `{"error": "..."}` body.
- IDs are TSIDs (opaque strings like `"3mloe3vkidht3"`) for most resources —
  don't assume they're numeric.
- Group/user "handles" live in the `name` field (not `handle`); display names
  are `nickname`.
- Membership writes (role changes, removal) are addressed by **membership id**,
  not user id — get it from `group members` first.
- A Group *is* a popup city (same table) — `start_date`/`end_date`/`location`
  double as popup-city fields.
- Auth requirements vary by resource and aren't always what you'd guess:
  groups/events/tracks have public read paths, but venues, places, and
  memberships-invites require auth for every action, including reads. Each
  command's `--help` states its own requirement.

See [COMMANDS.md](./COMMANDS.md) for full parameter documentation.

## Output & Scripting

All commands print **JSON** to stdout on success — pipe-friendly.

```bash
# Extract event ids
node bin/sola.js event list --group solaverse --limit 5 | jq '.data[].id'

# Filter by tag
node bin/sola.js event list --group solaverse | jq '.data[] | select(.tags | contains(["web3"]))'

# Bulk venue lookup
node bin/sola.js venue list --group solaverse | jq '.data[] | {id, name, capacity}'
```

On error, the message goes to stderr and the process exits `1`:
```bash
$ node bin/sola.js event get --id doesnotexist
Error: Not found
$ echo $?
1
```

## Troubleshooting

**"Not authenticated" error:**
- Run `sola auth signin --email your@email.com` first.
- Check `~/.sola/config.json` exists and contains a token.

**"Not found" on a group/event/venue you know exists:**
- Some resources (venues, places, invites) require auth for *every* action,
  including reads — a missing/expired token can look like a 404 depending on
  the endpoint's own error handling. Sign in and retry.

**Verification code rejected:**
- The code is a 6-character alphanumeric string, case-insensitive, not a
  6-digit number — double-check you copied it exactly.

## License

MIT
