# sola-cli Commands Reference

CLI wrapper for the [Sola API](https://api.sola.day). All commands output JSON.

**Base URL:** `https://api.sola.day`
**Auth token** is read from `~/.sola/config.json` automatically for commands that require it.

Commands are grouped by domain: `auth`, `profile`, `group`, `invite`, `event`, `venue`, `ticket`, `service`.

---

## auth

Authenticate with the Sola API and manage your identity.

### `auth signin`

Sign in with email. Supports **four modes** for different workflows.

```
sola auth signin --email <email> [--send-only] [--code <code>]
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--email` | string | Yes | Email address to receive the verification code |
| `--send-only` | boolean | No | Send code only and exit. For two-step / CI flows. |
| `--code` | number | No | Verification code. If provided, completes signin immediately. |

**Modes:**

```bash
# 1. Interactive (prompts for code)
sola auth signin --email user@example.com

# 2. Send-only (step 1 of two-step flow)
sola auth signin --email user@example.com --send-only

# 3. Complete with code (step 2)
sola auth signin --email user@example.com --code 482910

# 4. Piped / non-TTY: sends code, prints follow-up command
echo "" | sola auth signin --email user@example.com
```

---

### `auth set-handle`

Set a unique handle on your profile after signing in (`POST /profile/create`). Requires auth.

```
sola auth set-handle --handle <handle>
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--handle` | string | Yes | Unique alphanumeric handle, lowercase, no spaces |

---

## profile

Look up and manage Sola user profiles. `me` and `update` require auth; the rest are public.

### `profile me`

Fetch the currently authenticated profile (`GET /profile/me`). Requires auth.

```bash
sola profile me
```

### `profile update`

Update your own profile (`POST /profile/update`). Requires auth. Only the fields you pass are changed.

| Option | Type | Description |
|--------|------|-------------|
| `--nickname` | string | Display name |
| `--about` | string | Bio / about text (Markdown) |
| `--location` | string | Human-readable location |
| `--image-url` | string | Avatar image URL |
| `--twitter` / `--github` / `--discord` / `--telegram` | string | Social links (bundled into `social_links`) |

```bash
sola profile update --nickname "Alice" --about "Builder" --twitter "@alice"
```

### `profile search`

Search profiles by handle, username, or nickname (`GET /profile/search`). No auth.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--keyword` | string | Yes | Search term (matched against handle/username/nickname) |
| `--limit` | number | No | Max results, 1–20 (default 5) |

```bash
sola profile search --keyword ali --limit 10
```

### `profile get-by-id`

Fetch a profile by numeric ID (`GET /profile/get_by_id`). No auth.

```bash
sola profile get-by-id --id 123
```

### `profile get-by-email`

Fetch a profile by registered email (`GET /profile/get_by_email`). No auth.

```bash
sola profile get-by-email --email user@example.com
```

### `profile get-by-handle`

Fetch a profile by handle (`GET /profile/get_by_handle`). No auth.

```bash
sola profile get-by-handle --handle alice
```

### `profile groups`

List the groups a profile belongs to, by handle (`GET /profile/groups`). No auth.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--handle` | string | Yes | Handle of the profile |
| `--role` | string | No | Comma-separated role filter (e.g. `owner,manager`) |

```bash
sola profile groups --handle alice --role owner,manager
```

---

## group

Look up and manage Sola groups. `get`, `members` are public; `create`, `update`, and membership changes require auth.

### `group get`

Fetch a group by numeric ID or handle (`GET /group/get`).

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--id` | string | Yes | Numeric group ID or handle (e.g. `10` or `"solaverse"`) |
| `--detail` | boolean | No | Include full detail — **venues**, tracks, etc. |

```bash
sola group get --id solaverse --detail
```

### `group create`

Create a new group (`POST /group/create`). Requires auth. You become the owner.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--handle` | string | Yes | Unique handle for the group |
| `--nickname` | string | No | Display name |
| `--about` | string | No | Description (Markdown) |
| `--timezone` | string | No | IANA timezone (e.g. `Asia/Singapore`) |
| `--location` | string | No | Human-readable location |
| `--website` | string | No | Website URL |
| `--image-url` | string | No | Logo/avatar URL |
| `--status` | string | No | Group status |
| `--start-date` / `--end-date` | string | No | Popup-city date range (ISO date) |
| `--twitter` / `--github` / `--discord` / `--telegram` | string | No | Social links |

```bash
sola group create --handle solaverse --nickname "SolaVerse" --timezone Asia/Singapore
```

### `group update`

Update an existing group (`POST /group/update`). Requires auth + manager role. Same field options as `create`, plus `--id` (required) instead of `--handle`.

```bash
sola group update --id 10 --about "Updated description" --website https://sola.day
```

### `group members`

List a group's members with roles (`GET /group/members`). No auth.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--group` | string | Yes | Numeric group ID or handle |

```bash
sola group members --group solaverse
```

### `group add-manager` / `remove-manager` / `remove-member`

Manage membership roles. Require auth. `add-manager`/`remove-member` need manager role; `remove-manager` needs owner role.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--group` | number | Yes | Numeric group ID |
| `--profile` | number | Yes | Numeric profile ID |

```bash
sola group add-manager --group 10 --profile 123
sola group remove-manager --group 10 --profile 123
sola group remove-member --group 10 --profile 123
```

### `group leave`

Leave a group yourself (`POST /group/leave`). Requires auth. Pass your own profile ID (owners cannot leave).

```bash
sola group leave --group 10 --profile 123
```

---

## invite

Send, accept, and request group invitations (`POST /group/*`). All require auth.

### `invite send`

Invite people to a group by handle, email, or wallet address (`POST /group/send_invite`). Requires manager role. Known profiles are added directly; unknown emails receive an email invite.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--group` | number | Yes | Numeric group ID |
| `--receivers` | string | Yes | Comma-separated handles, emails, or addresses |
| `--role` | string | Yes | `member` or `manager` |
| `--message` | string | No | Message included in the invitation |

```bash
sola invite send --group 10 --receivers "alice,bob@example.com" --role member
```

### `invite accept`

Accept an invitation addressed to you (`POST /group/accept_invite`). Requires auth.

```bash
sola invite accept --id 55
```

### `invite request`

Request to join a group yourself (`POST /group/request_invite`). Requires auth; a manager must approve.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--group` | number | Yes | Numeric group ID |
| `--role` | string | Yes | `member` or `manager` |
| `--message` | string | No | Message to managers |

```bash
sola invite request --group 10 --role member --message "Would love to join"
```

### `invite mine`

List pending invitations addressed to your email (`GET /group/my_pending_invites`). Requires auth.

```bash
sola invite mine
```

---

## event

Get, list, create, update events and manage participation. Write actions and `my-events` require auth.

### `event get`

Fetch a single event by ID (`GET /event/get`).

```bash
sola event get --id 42
```

### `event list`

List events for a group with filters (`GET /event/list`).

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--group` | number | Yes | Numeric group ID |
| `--collection` | string | No | `upcoming`, `past`, `today`, `pinned`, `currentweek` |
| `--tags` | string | No | Comma-separated tags (matches **any**) |
| `--start-date` / `--end-date` | string | No | ISO date bounds (group timezone) |
| `--limit` | number | No | Per page (default 40, max 1000) |
| `--page` | number | No | Page number (default 1) |

```bash
sola event list --group 10 --collection upcoming --limit 20
```

### `event discover`

Get featured events, popups, and top groups (`GET /event/discover`). No auth. Returns `events`, `featured_popups`, `popups`, `groups`.

```bash
sola event discover
```

### `event my-events`

List events related to you (`GET /event/my_event_list`). Requires auth.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--collection` | string | No | `upcoming`, `past`, or `my_stars` |
| `--limit` | number | No | Per page (default 40, max 1000) |
| `--page` | number | No | Page number |

```bash
sola event my-events --collection my_stars
```

### `event create`

Create a new event (`POST /event/create`). Requires auth.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--group` | number | Yes | Host group ID |
| `--title` | string | Yes | Event title |
| `--start` / `--end` | string | Yes | ISO 8601 datetimes (`--end` after `--start`) |
| `--timezone` | string | No | IANA timezone (defaults to group timezone) |
| `--location` | string | No | Human-readable location |
| `--content` | string | No | Description (Markdown) |
| `--cover-url` | string | No | Cover image URL |
| `--tags` | string | No | Comma-separated tags |
| `--max-participant` | number | No | Attendee cap (omit for unlimited) |
| `--require-approval` | boolean | No | RSVPs require organizer approval |
| `--meeting-url` | string | No | Virtual meeting link |
| `--display` | string | No | `public`, `private`, `hidden`, `normal` |
| `--ticket-title` / `--ticket-quantity` / `--ticket-status` / `--ticket-type` | — | No | Create a single ticket inline |
| `--tickets-json` | string | No | Full `tickets_attributes` JSON (overrides `--ticket-*`) |

```bash
sola event create --group 10 --title "Workshop" \
  --start "2025-06-15T09:00:00" --end "2025-06-15T11:00:00" --timezone Asia/Singapore
```

### `event update`

Update an existing event (`POST /event/update`). Requires auth + ownership/manager. Only passed fields change. Supports `--id` plus `--title`, `--start`, `--end`, `--timezone`, `--location`, `--content`, `--cover-url`, `--tags`, `--tickets-json`.

```bash
sola event update --id 42 --title "Renamed Event" --location "Online"
```

### `event join`

RSVP / join an event (`POST /event/join`). Requires auth.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--id` | number | Yes | Numeric event ID |
| `--form-answers` | string | No | JSON array of `{field_id, value}` — required only if the event has a required form |

```bash
sola event join --id 42
sola event join --id 42 --form-answers '[{"field_id":1,"value":"Vegan"}]'
```

### `event cancel`

Cancel your own participation (`POST /event/cancel`). Requires auth.

```bash
sola event cancel --id 42
```

### `event unpublish`

Unpublish / cancel an event (`POST /event/unpublish`). Requires auth + ownership/manager.

```bash
sola event unpublish --id 42
```

### `event approve` / `event reject`

Approve or reject a pending participant on an approval-required event (`POST /event/approve_participant` / `reject_participant`). Requires auth + organizer role.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--participant` | number | Yes | Participant **record** ID (not a profile ID) |

```bash
sola event approve --participant 9001
sola event reject  --participant 9001
```

### `event remove-participant`

Remove a participant by profile ID (`POST /event/remove_participant`). Requires auth + organizer role.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--id` | number | Yes | Numeric event ID |
| `--profile` | number | Yes | Numeric profile ID of the participant |

```bash
sola event remove-participant --id 42 --profile 123
```

---

## venue

Get, list, create, update, and remove venues. Write actions require auth + group manager role.

> **Location note:** a venue's location/coordinates come from a **Place** record referenced by `--place-id` (create one with `place/create`), not from free-text fields on the venue itself.

### `venue get`

Fetch a venue by ID (`GET /venue/get`).

```bash
sola venue get --id 7
```

### `venue list`

List all venues belonging to a group (`GET /group/get?include_detail=true`, reads the nested `venues` array). No auth.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--group` | string | Yes | Numeric group ID or handle |

```bash
sola venue list --group 10
```

### `venue create` / `venue update`

Create (`POST /venue/create`) or update (`POST /venue/update`) a venue. Requires auth + manager role.

| Option | Type | Description |
|--------|------|-------------|
| `--group` | number | (create only, required) Owning group ID |
| `--id` | number | (update only, required) Venue ID |
| `--title` | string | Venue name (required on create) |
| `--about` | string | Description (Markdown) |
| `--link` | string | External link (e.g. booking page) |
| `--capacity` | number | Max people |
| `--require-approval` | boolean | Bookings require approval |
| `--visibility` | string | e.g. `all`, `none` |
| `--start-date` / `--end-date` | string | Availability date range (ISO date) |
| `--place-id` | number | Place providing location/coordinates |
| `--tags` | string | Comma-separated tags |
| `--amenities` | string | Comma-separated amenities |

```bash
sola venue create --group 10 --title "Rooftop Space" --capacity 80 --tags "outdoor,rooftop"
sola venue update --id 7 --capacity 150 --tags "indoor,av-equipment"
```

### `venue remove`

Remove (soft-delete) a venue (`POST /venue/remove`). Requires auth + manager role.

```bash
sola venue remove --id 7
```

### `venue check-availability`

Check whether a venue is free for a time window (`POST /venue/check_availability`). No auth.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--id` | number | Yes | Numeric venue ID |
| `--start` / `--end` | string | Yes | ISO 8601 datetimes |
| `--timezone` | string | No | IANA timezone for interpreting the times |

```bash
sola venue check-availability --id 7 \
  --start "2025-06-15T09:00:00" --end "2025-06-15T11:00:00" --timezone Asia/Singapore
```

---

## ticket

RSVP, manage, and look up tickets for events. `rsvp` and `cancel` require auth.

### `ticket rsvp`

RSVP to an event using a specific ticket (`POST /ticket/rsvp`). Requires auth.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--event` | number | Yes | Numeric event ID |
| `--ticket` | number | Yes | Numeric ticket ID |
| `--payment-method` | number | No | Payment method ID (paid tickets) |
| `--coupon` | string | No | Coupon code |
| `--message` | string | No | Message for approval-required tickets |

```bash
sola ticket rsvp --event 42 --ticket 7
```

### `ticket list-group-types`

List ticket types for a group (`GET /ticket/list_group_ticket_types`). No auth.

```bash
sola ticket list-group-types --group solaverse
```

### `ticket check-coupon`

Validate a coupon for an event (`GET /ticket/check_coupon`). No auth.

```bash
sola ticket check-coupon --event 42 --code SAVE20
```

### `ticket cancel`

Cancel a pending (unpaid) ticket item (`POST /ticket/cancel_unpaid_item`). Requires auth.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | string | Yes | Payment chain (`stripe`, `base`, ...) |
| `--event` | number | Yes | Numeric event ID (product_id) |
| `--order` | string | Yes | Order number from the ticket_item |

```bash
sola ticket cancel --chain stripe --event 42 --order 1000042
```

---

## service

Utility services: image uploads and data exports. See `sola service --help`.

---

## Workflow: First-Time Setup

```bash
# 1. Sign in (sends code to email, prompts for it)
sola auth signin --email user@example.com

# 2. Set your profile handle (one-time)
sola auth set-handle --handle myhandle

# 3. Confirm who you are
sola profile me

# 4. Create a group and an event
sola group create --handle mygroup --nickname "My Group" --timezone Asia/Singapore
sola event create --group <id> --title "Kickoff" \
  --start "2025-07-01T10:00:00" --end "2025-07-01T12:00:00" --timezone Asia/Singapore

# 5. Invite people
sola invite send --group <id> --receivers "alice,bob@example.com" --role member
```

---

## Output & Error Handling

All commands print JSON to stdout on success; on error a message goes to stderr and the process exits with code `1`. This makes the CLI pipe-friendly:

```bash
# Extract event IDs from a list
sola event list --group 10 --limit 5 | jq '.events[].id'

# Only groups you manage
sola profile groups --handle myhandle --role owner,manager | jq '.groups[].handle'
```
