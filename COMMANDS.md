# sola-cli Commands Reference

CLI wrapper for the [Sola API](https://api.sola.day). All commands output JSON.

**Base URL:** `https://api.sola.day`  
**Auth token** is read from `~/.sola/config.json` automatically for commands that require it.

---

## auth

Authenticate with the Sola API and manage your identity.

### `auth signin`

Two-step sign-in: sends a 6-digit verification code to the email. Saves `auth_token` to `~/.sola/config.json`.

Supports both **interactive** (prompts for code) and **non-interactive** (accepts `--code` flag) modes.

```
sola auth signin --email <email> [--code <code>]
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--email` | string | Yes | Email address to receive the verification code (e.g. `user@example.com`) |
| `--code` | number | No | Verification code (6 digits). If provided, skips interactive prompt and completes signin immediately. |

**Examples:**

**Interactive mode** (prompts for code):
```bash
sola auth signin --email user@example.com
# Sending verification code to user@example.com...
# Enter the verification code: 482910
# Signed in successfully. Token saved to ~/.sola/config.json
```

**Non-interactive mode** (direct code entry):
```bash
sola auth signin --email user@example.com --code 482910
# Sending verification code to user@example.com...
# Signed in successfully. Token saved to ~/.sola/config.json
```

**Piped/automated mode** (just sends code):
```bash
echo "" | sola auth signin --email user@example.com
# Sending verification code to user@example.com...
# Code sent. Check your email and run:
#   sola auth signin --email user@example.com --code <code>
```

**Workflow example** (for CI/CD or scripts):
```bash
# Step 1: Send code
sola auth signin --email user@example.com
# Check email for code

# Step 2: Complete signin with code
sola auth signin --email user@example.com --code 482910
```

---

### `auth set-handle`

Set a unique handle on your profile after signing in. The handle is your public username and URL slug (e.g. `sola.day/u/yourhandle`). Requires auth.

```
sola auth set-handle --handle <handle>
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--handle` | string | Yes | Unique alphanumeric handle, lowercase, no spaces (e.g. `alice`, `bob42`) |

**Example:**
```bash
sola auth set-handle --handle alice
```

---

## profile

Look up Sola user profiles. No auth required.

### `profile get-by-email`

Fetch a profile by registered email address.

```
sola profile get-by-email --email <email>
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--email` | string | Yes | Registered email address (e.g. `user@example.com`) |

**Response fields:** `id`, `handle`, `nickname`, `image_url`, `social_links`, `created_at`

**Example:**
```bash
sola profile get-by-email --email user@example.com
```

---

### `profile get-by-handle`

Fetch a profile by handle.

```
sola profile get-by-handle --handle <handle>
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--handle` | string | Yes | Public handle (e.g. `alice`) |

**Example:**
```bash
sola profile get-by-handle --handle alice
```

---

## event

Get, list, create, and update events. `create` and `update` require auth.

### `event get`

Fetch a single event by numeric ID.

```
sola event get --id <id>
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--id` | number | Yes | Numeric event ID (e.g. `42`) |

**Response fields:** `id`, `title`, `start_time`, `end_time`, `timezone`, `location`, `status`, `display`, `participants_count`, `owner`, `group`, `venue`, `tickets`, `event_roles`

**Example:**
```bash
sola event get --id 42
```

---

### `event list`

List events for a group with optional filters.

```
sola event list --group <group_id> [options]
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--group` | number | Yes | Numeric group ID (e.g. `10`) |
| `--collection` | string | No | Preset filter: `upcoming`, `past`, `today`, `pinned`, `currentweek` |
| `--tags` | string | No | Comma-separated tags — returns events matching **any** tag (e.g. `"web3,defi"`) |
| `--start-date` | string | No | ISO date lower bound inclusive (e.g. `2025-06-01`). Interpreted in the group's timezone. |
| `--end-date` | string | No | ISO date upper bound inclusive (e.g. `2025-06-30`). Interpreted in the group's timezone. |
| `--limit` | number | No | Max results per page (default `40`, max `1000`) |
| `--page` | number | No | Page number for pagination (default `1`) |

**Examples:**
```bash
# Next 20 upcoming events
sola event list --group 10 --collection upcoming --limit 20

# Events in June tagged with web3 or defi
sola event list --group 10 --tags "web3,defi" --start-date 2025-06-01 --end-date 2025-06-30

# Page 2 of all past events
sola event list --group 10 --collection past --limit 40 --page 2
```

---

### `event create`

Create a new event in a group. Requires auth.

```
sola event create --group <group_id> --title <title> --start <datetime> --end <datetime> [options]
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--group` | number | Yes | Numeric group ID that will host the event (e.g. `10`) |
| `--title` | string | Yes | Event title (e.g. `"DeFi Workshop #3"`) |
| `--start` | string | Yes | ISO 8601 start datetime (e.g. `"2025-06-15T09:00:00"`) |
| `--end` | string | Yes | ISO 8601 end datetime (e.g. `"2025-06-15T11:00:00"`). Must be after `--start`. |
| `--timezone` | string | No | IANA timezone (e.g. `Asia/Singapore`, `America/New_York`). Defaults to group timezone. |
| `--location` | string | No | Human-readable location (e.g. `"Raffles Place, Singapore"`) |
| `--content` | string | No | Event description. Markdown supported. |
| `--cover-url` | string | No | Cover image URL (e.g. `https://cdn.example.com/cover.jpg`) |
| `--tags` | string | No | Comma-separated tags (e.g. `"web3,workshop,beginner"`) |
| `--max-participant` | number | No | Max attendees allowed. Omit for unlimited. |
| `--require-approval` | boolean | No | If `true`, RSVPs require organizer approval (default `false`) |
| `--meeting-url` | string | No | Virtual meeting link shown to confirmed attendees (e.g. `https://meet.google.com/abc`) |
| `--display` | string | No | Visibility: `public`, `private`, `hidden`, `normal` (default `normal`) |

**Examples:**
```bash
# Minimal event
sola event create \
  --group 10 \
  --title "Workshop" \
  --start "2025-06-15T09:00:00" \
  --end "2025-06-15T11:00:00" \
  --timezone Asia/Singapore

# Full event with all options
sola event create \
  --group 10 \
  --title "DeFi Deep Dive" \
  --start "2025-06-20T14:00:00" \
  --end "2025-06-20T17:00:00" \
  --timezone Asia/Singapore \
  --location "Marina Bay Sands" \
  --content "A deep dive into DeFi protocols. Bring your laptop." \
  --tags "defi,web3,workshop" \
  --max-participant 50 \
  --require-approval true \
  --display public
```

---

### `event update`

Update fields on an existing event. Only the fields you pass are changed. Requires auth and event ownership or group manager role.

```
sola event update --id <id> [options]
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--id` | number | Yes | Numeric event ID to update (e.g. `42`) |
| `--title` | string | No | New event title |
| `--start` | string | No | New ISO 8601 start datetime |
| `--end` | string | No | New ISO 8601 end datetime |
| `--timezone` | string | No | New IANA timezone |
| `--location` | string | No | New location string |
| `--content` | string | No | New description. Markdown supported. |
| `--cover-url` | string | No | New cover image URL |
| `--tags` | string | No | Comma-separated tags, **replaces** existing tags |

**Examples:**
```bash
# Rename and move an event
sola event update --id 42 --title "Renamed Event" --location "Online"

# Change times
sola event update --id 42 --start "2025-06-16T10:00:00" --end "2025-06-16T12:00:00"
```

---

## venue

Get, list, create, and update venues for a group. `create` and `update` require auth.

### `venue get`

Fetch a venue by numeric ID.

```
sola venue get --id <id>
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--id` | number | Yes | Numeric venue ID (e.g. `7`) |

**Response fields:** `id`, `title`, `about`, `location`, `capacity`, `geo_lat`, `geo_lng`, `tags`, `venue_timeslots`, `venue_overrides`, `availabilities`

**Example:**
```bash
sola venue get --id 7
```

---

### `venue list`

List all venues belonging to a group. Requires auth.

```
sola venue list --group <group_id>
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--group` | number | Yes | Numeric group ID (e.g. `10`) |

**Example:**
```bash
sola venue list --group 10
```

---

### `venue create`

Create a new venue for a group. Requires auth and group manager role.

```
sola venue create --group <group_id> --title <title> [options]
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--group` | number | Yes | Numeric group ID that owns this venue (e.g. `10`) |
| `--title` | string | Yes | Venue name (e.g. `"Main Conference Hall"`) |
| `--location` | string | No | Human-readable address (e.g. `"10 Bayfront Ave, Singapore 018956"`) |
| `--about` | string | No | Venue description. Markdown supported. |
| `--capacity` | number | No | Maximum number of people (e.g. `200`) |
| `--geo-lat` | number | No | Latitude in decimal degrees (e.g. `1.2836`) |
| `--geo-lng` | number | No | Longitude in decimal degrees (e.g. `103.8607`) |
| `--tags` | string | No | Comma-separated venue tags (e.g. `"outdoor,parking,wheelchair"`) |

**Example:**
```bash
sola venue create \
  --group 10 \
  --title "Rooftop Space" \
  --location "21 Tanjong Pagar Rd, Singapore" \
  --capacity 80 \
  --geo-lat 1.2765 \
  --geo-lng 103.8448 \
  --tags "outdoor,rooftop"
```

---

### `venue update`

Update fields on an existing venue. Only the fields you pass are changed. Requires auth and group manager role.

```
sola venue update --id <id> [options]
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--id` | number | Yes | Numeric venue ID to update (e.g. `7`) |
| `--title` | string | No | New venue name |
| `--location` | string | No | New address string |
| `--about` | string | No | New description |
| `--capacity` | number | No | New max capacity |
| `--geo-lat` | number | No | New latitude |
| `--geo-lng` | number | No | New longitude |
| `--tags` | string | No | Comma-separated tags, **replaces** existing tags |

**Example:**
```bash
sola venue update --id 7 --capacity 150 --tags "indoor,av-equipment,stage"
```

---

## group

Look up Sola groups. No auth required.

### `group get`

Fetch a group by numeric ID or handle.

```
sola group get --id <id_or_handle>
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--id` | string | Yes | Numeric group ID or handle string (e.g. `10` or `"solaverse"`) |

**Response fields:** `id`, `handle`, `nickname`, `about`, `timezone`, `status`, `image_url`, `social_links`, tracks, membership counts

**Examples:**
```bash
# By numeric ID
sola group get --id 10

# By handle
sola group get --id solaverse
```

---

## Workflow: First-Time Setup

```bash
# 1. Sign in (sends code to email, prompts for it)
sola auth signin --email user@example.com

# 2. Set your profile handle (one-time)
sola auth set-handle --handle myhandle

# 3. Find a group
sola group get --id solaverse

# 4. List upcoming events
sola event list --group 10 --collection upcoming

# 5. Create an event
sola event create \
  --group 10 \
  --title "My First Event" \
  --start "2025-07-01T10:00:00" \
  --end "2025-07-01T12:00:00" \
  --timezone Asia/Singapore
```

---

## Output & Error Handling

All commands print JSON to stdout on success:
```json
{ "result": "ok", "event": { "id": 42, "title": "..." } }
```

On error, a message is printed to stderr and the process exits with code `1`:
```
Error: Not authenticated. Run: sola auth signin
```

This makes the CLI pipe-friendly and scriptable:
```bash
# Extract event IDs from a list
sola event list --group 10 --limit 5 | jq '.events[].id'

# Check if sign-in succeeded
sola auth signin --email user@example.com && echo "Ready"
```
