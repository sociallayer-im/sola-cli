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

`sola-cli` is a minimal Node.js CLI wrapper for the Sola API — `soon`, the Rails
backend at [api.sola.day](https://api.sola.day). It's designed for scripting
event/venue management workflows, building integrations, and automating
community operations.

`soon` replaced an earlier backend, `sails`, in mid-2026. This CLI was
rewritten from scratch against `soon`'s actual contract — see "Migrated from
sails" below if you're diffing against old behavior.

**Tech Stack:**
- Node.js 18+ (native `fetch`)
- `yargs` for CLI argument parsing
- ESM modules (`"type": "module"`)
- No other dependencies

**Key facts about the API this wraps:**
- Base path `/api/v1`, auth via `Authorization: Bearer <jwt>` header (not a query param).
- Errors are real HTTP status codes with a `{"error": "..."}` body.
- IDs are opaque TSID strings (e.g. `"3mloe3vkidht3"`), not integers.
- Group/user handles live in the `name` field; display names in `nickname`.

## Architecture

### Entry Point: `bin/sola.js`
Imports all 12 command modules and registers them with yargs. Enables
automatic `--help` support across all commands.

### Core Modules: `lib/`

**`lib/api.js`** — Central HTTP transport + every endpoint function, grouped
by domain with a comment block per section.
- `request(method, path, { params, body, auth })`: the one transport. `path`
  is relative to `/api/v1`.
- `auth` mirrors soon's own three-tier model — copy this pattern for any new
  endpoint rather than guessing:
  - `true` — required; `requireAuth()` throws locally with a friendly message
    if no token is saved, before any network call.
  - `'optional'` — attaches a token if present but never requires one; a
    stale/invalid token degrades to anonymous (matches
    `Api::BaseController#authenticate_optional!`'s own behavior server-side).
  - omitted — never sends a token.
- Errors normalize to `SolaApiError` (message from `{error}`, `status` from
  the HTTP status).

**`lib/config.js`** — Token persistence & caching.
- `~/.sola/config.json`, 60s in-memory cache.
- `getToken()` returns `null` if unset (never throws) — callers decide whether
  that's fatal via `request`'s `auth` mode.

**`lib/utils.js`** — Shared helpers.
- `handleError(fn)`: catches, logs to stderr, exits 1.
- `requireAuth()`: throws a friendly error if no token.
- `buildQueryString(params)`: object → query string; arrays expand as
  `key[]=a&key[]=b` — this is the convention soon (Rails) expects for array
  params, mirrored exactly from `seastar-app`'s `sola-sdk/src/request.ts`.
- `splitList(v)`: comma-separated string → trimmed array, or `undefined`.
- `parseJsonOption(v, flagName)`: parses a `--foo-json` flag, throws a clear
  `--foo-json must be valid JSON` error on malformed input instead of a raw
  `SyntaxError`.

### Commands: `lib/commands/`

One file per domain, each exporting a yargs command builder (`command`,
`describe`, `builder(yargs)`). All handlers wrap with `handleError()` and
`console.log(JSON.stringify(result, null, 2))`.

| Module | Covers |
|---|---|
| `auth.js` | signin (interactive/send-only/with-code), whoami |
| `user.js` | get/me/update/groups |
| `group.js` | get/list/create/update/freeze/send-email, memberships (members/add-member/set-role/remove-membership/leave) |
| `invite.js` | send/list/pending/show/accept/cancel/revoke/request/accept-request/send-with-code/accept-with-code |
| `event.js` | get/list/pending-approval/create/update/cancel/approve |
| `participant.js` | list/join/update/cancel/approve/reject/check-in (was folded into `event.js` pre-rewrite) |
| `venue.js` | get/list/create/update/remove/conflict/set-availability |
| `place.js` | get/search/create |
| `track.js` | list/get/create/update/remove |
| `ticket.js` | list-types/list/create/update/remove/rsvp/verify-payment/cancel-unpaid/check-coupon/coupon-price |
| `discover.js` | home/search |
| `service.js` | upload-image |

## Key Implementation Patterns

### Self-service convenience over raw IDs
soon addresses memberships and participants by their *own* record id, not a
user id — e.g. removing yourself from a group needs a **membership id**, found
via `group members`, not your user id. Two commands hide this lookup as a
convenience (`group leave`, `participant cancel`): they call `getMe()`, list
the collection, find the caller's own row, and act on that id. This is the
only place the CLI does a multi-request "compound" action — every other
command is a single API call. Follow this pattern (don't invent a third
convenience shape) if adding more self-service actions.

### Nested params
Most write endpoints wrap the body under a domain key, matching soon's Rails
strong parameters:
```js
createGroup(fields)  →  { group: fields }
updateUser(fields)   →  { user: fields }
createVenue(fields)  →  { venue: fields }
```
`event.js`'s `create`/`update` are the exception worth knowing: `event_roles`
and `tickets` are sent as **top-level** params alongside `event: {...}`, not
nested inside it — they're created atomically with the event in one
transaction server-side (`EventsController#create`).

### Auth-required varies by resource — check, don't assume
Groups/events/tracks have public read paths; venues, places, and
group-invites require auth for *every* action, including reads (no
`skip_before_action :authenticate!` in those controllers). This is
non-obvious and was gotten wrong in the pre-rewrite CLI (`venue`/`place` were
assumed public). When adding a new endpoint, check the actual soon controller
for `skip_before_action :authenticate!` rather than assuming symmetry with
similar-looking resources.

## Common Development Tasks

**Add a new command:**
1. Add the endpoint function to `lib/api.js` in the right domain section, with
   the correct `auth` mode (check the soon controller, don't guess).
2. Add a subcommand to the matching `lib/commands/*.js` (or a new file,
   registered in `bin/sola.js`, if it's a new domain).
3. Use `handleError()`, `splitList()`, `parseJsonOption()` from `utils.js` as
   needed.

**Test a command:**
```bash
node bin/sola.js <command> --help
node bin/sola.js event list --group solaverse --limit 5
```

**Point at local `soon`** (from the monorepo's `Procfile.dev`, `soon` runs on
`:3000`):
```bash
SOLA_API_URL=http://localhost:3000 node bin/sola.js group get --id solaverse
```

**Debug API calls:**
```bash
NODE_DEBUG=fetch node bin/sola.js ...
```

## API Endpoint Reference

Base path: `https://api.sola.day/api/v1`. Full parameter documentation is in
[COMMANDS.md](./COMMANDS.md) — this is a quick map of endpoint → controller
for when you need to go read the source in `../soon/app/controllers/api/v1/`.

| CLI domain | Controller |
|---|---|
| `auth` | `auth_controller.rb` |
| `user` | `users_controller.rb` |
| `group` (+ freeze/send-email) | `groups_controller.rb` |
| `group` memberships | `memberships_controller.rb` |
| `invite` | `group_invites_controller.rb` |
| `event` | `events_controller.rb` |
| `participant` | `participants_controller.rb` |
| `venue` | `venues_controller.rb` |
| `place` | `places_controller.rb` |
| `track` | `tracks_controller.rb` |
| `ticket` | `tickets_controller.rb` |
| `discover` | `discover_controller.rb` |
| `service upload-image` | `uploads_controller.rb` |

**Gotchas learned from the API:**
- Group/venue/track "handle"-like fields are `name`, not `handle`; group's
  description field is `bio`, not `about`.
- Event `location` is not a free-text field — resolve a `place_id` via
  `place create` first (find-or-create by name), same for venues.
- `event update` cannot change `group_id` — moving an event between groups
  would escape the authorization already checked against its current group.
- `venue update`/`track update` cannot change `group_id` either.
- A group's `name` (slug) is set once at create and has no update path in this
  CLI (the backend permits it, but changing a live URL slug is rarely what you
  want from a script — add `--name` to `group update`'s field list if a real
  need comes up).
- `Participant`/`Ticket`/`GroupInvite` IDs are all distinct id spaces from
  `User`/`Group` IDs — don't assume a "profile_id"-style param exists anymore;
  every write is scoped to the specific child record's own id.

## Configuration & Paths

- **Config file:** `~/.sola/config.json` — `{ "auth_token": "..." }`
- **Auto-created** on first `sola auth signin`.
- **Token caching:** 60-second in-memory cache in `config.js`.
- **`SOLA_API_URL`** env var overrides the base URL (default
  `https://api.sola.day`) — point it at a local `soon` dev server.

## Migrated from sails (context for anyone diffing old behavior)

This CLI was rewritten wholesale when the backend moved from `sails` to
`soon`. Every command, param name, and endpoint path changed — this wasn't a
find-and-replace, it's a from-scratch mapping against `soon`'s actual routes,
controllers, and Blueprinter output. Notable shape changes, if you're
wondering why something that used to work no longer does:

- No more `/profile/*` — it's `/users/*` now (`profile` command → `user`).
- No more `auth_token` query param — `Authorization: Bearer` header.
- No more `{result: "error", message}` — real HTTP status + `{error}`.
- No more numeric ids — TSID strings.
- `check-availability` (boolean) → `conflict` (returns the clashing event).
- `event join`/`cancel`/`approve_participant`/etc. moved out of `event` into
  a new `participant` command group, matching soon's own controller split.
- `venue`/`place` went from "public, no auth" (sails) to "auth required for
  every action" (soon) — a real behavior change, not a doc fix.

## Testing

**Manual testing of core flows:**
```bash
# Sign in (interactive)
node bin/sola.js auth signin --email test@example.com

# Sign in (non-interactive, two-step)
node bin/sola.js auth signin --email test@example.com --send-only
node bin/sola.js auth signin --email test@example.com --code AB12CD

# Public reads
node bin/sola.js group get --id solaverse
node bin/sola.js event list --group solaverse --limit 5
node bin/sola.js discover search --keyword solaverse

# JSON output for scripting
node bin/sola.js event list --group solaverse | jq '.data[].id'
```

There is no automated test suite — verification here is manual, against the
live API (read-only calls are safe to run anytime; be mindful before running
create/update/delete commands against production data).

## Notes for Future Work

- **No external storage:** tokens live only in `~/.sola/config.json`.
- **One dependency:** `yargs`; everything else is Node.js built-ins.
- **Bearer auth:** unlike the retired sails API, the token is a header, never
  a query/body param.
- **JSON-only output:** no table formatting or other output modes.
- **Streaming not supported:** uploads use `FormData` but read the whole file
  into memory first (fine for the 10MB cap `soon` enforces).
