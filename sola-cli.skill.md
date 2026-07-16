# sola-cli Skill

A Node.js CLI tool for managing events, venues, and communities on the Sola platform via API.

## Installation

```bash
cd sola-cli
npm install
chmod +x bin/sola.js
```

## Authentication

Before using most commands, sign in:

```bash
# Step 1: Send verification code
sola auth signin --email your@email.com --send-only

# (Check email for 6-digit code)

# Step 2: Complete signin with code
sola auth signin --email your@email.com --code 123456
```

This saves your auth token to `~/.sola/config.json` for future commands.

Set your profile handle (required once after first sign-in):
```bash
sola auth set-handle --handle yourhandle
```

## Commands

### Profile Management

**Your own profile (requires auth):**
```bash
sola profile me
sola profile update --nickname "Alice" --about "Builder" --twitter "@alice"
```

**Look up profiles (public):**
```bash
sola profile get-by-email --email user@example.com
sola profile get-by-handle --handle alice
sola profile get-by-id --id 123
sola profile search --keyword ali --limit 10
sola profile groups --handle alice --role owner,manager   # groups a profile belongs to
```

### Groups

**Get group info by ID or handle** (`--detail` also nests venues/tracks):
```bash
sola group get --id 10
sola group get --id solaverse --detail
```

**List members (public):**
```bash
sola group members --group solaverse
```

**Create / update a group (requires auth):**
```bash
sola group create --handle mygroup --nickname "My Group" --timezone Asia/Singapore
sola group update --id 10 --about "Updated description" --website https://sola.day
```

**Manage membership (requires auth):**
```bash
sola group add-manager    --group 10 --profile 123
sola group remove-manager --group 10 --profile 123
sola group remove-member  --group 10 --profile 123
sola group leave          --group 10 --profile 123   # leave yourself
```

### Invitations

All require auth. Send needs manager role.

```bash
sola invite send    --group 10 --receivers "alice,bob@example.com" --role member
sola invite request --group 10 --role member --message "Would love to join"
sola invite mine                                  # pending invites addressed to you
sola invite accept  --id 55
```

### Events

**Get a single event:**
```bash
sola event get --id 123
```

**List group events:**
```bash
sola event list --group 10
sola event list --group 10 --collection upcoming --limit 20
sola event list --group 10 --tags "web3,workshop" --start-date 2026-06-01
```

**Create event:**
```bash
sola event create \
  --group 10 \
  --title "Community Lunch" \
  --start "2026-10-10T12:00:00" \
  --end "2026-10-10T14:00:00" \
  --timezone America/Los_Angeles \
  --location "Hotel Trio - Patio"
```

**Update event:**
```bash
sola event update --id 123 --title "New Title" --location "New Location"
```

**Discover / your events:**
```bash
sola event discover                              # featured events, popups, top groups (public)
sola event my-events --collection upcoming       # requires auth
```

**Participation (requires auth):**
```bash
sola event join   --id 42                         # RSVP
sola event cancel --id 42                          # cancel your RSVP
sola event unpublish --id 42                        # organizer: cancel the event

# Approve/reject take a participant RECORD id; remove-participant takes a profile id
sola event approve --participant 9001
sola event reject  --participant 9001
sola event remove-participant --id 42 --profile 123
```

### Venues

Venue location comes from a **Place** (`--place-id`), not free-text fields.

**Get / list venues (public):**
```bash
sola venue get  --id 115
sola venue list --group 10          # via group detail view; no /venue/list route exists
```

**Create / update venue (requires auth + manager):**
```bash
sola venue create --group 10 --title "Main Hall" --capacity 200 --tags "indoor,stage"
sola venue update --id 115 --capacity 250 --title "Updated Hall"
sola venue remove --id 115
```

**Check availability (public):**
```bash
sola venue check-availability --id 115 \
  --start "2026-06-15T09:00:00" --end "2026-06-15T11:00:00" --timezone Asia/Singapore
```

## Output

All commands return **JSON** output, making them easy to parse and integrate.

**Example with jq:**
```bash
# Extract event IDs
sola event list --group 10 | jq '.events[].id'

# Get venue titles and capacities
sola venue list --group 10 | jq '.venues[] | {title, capacity}'
```

## Help

View complete help for any command:
```bash
sola --help
sola event --help
sola event create --help
```

## Full Documentation

See the [COMMANDS.md](./COMMANDS.md) file for:
- Complete parameter documentation for all commands
- Advanced filtering options
- Full coverage of the `auth`, `profile`, `group`, `invite`, `event`, `venue`, `ticket`, and `service` command groups
- Real-world workflow examples

## Notes

- **API Base:** `https://api.sola.day`
- **Config Location:** `~/.sola/config.json` (auto-created on signin)
- **Requirements:** Node.js 18+ (for native fetch)
- **Dependencies:** Only `yargs` for CLI parsing (no heavy packages)

## Examples

### Create an event at a specific venue

```bash
# 1. List venues to find Hotel Trio - Patio (ID: 115)
sola venue list --group 3409 | jq '.venues[] | select(.title == "Hotel Trio - Patio") | {id, title}'

# 2. Create event at that venue
sola event create \
  --group 3409 \
  --title "Community Dinner" \
  --start "2026-10-10T12:00:00" \
  --end "2026-10-10T14:00:00" \
  --timezone America/Los_Angeles \
  --location "Hotel Trio - Patio"
```

### List upcoming events and extract details

```bash
sola event list --group 10 --collection upcoming | jq '.events[] | {id, title, start_time, location}'
```

### Two-step non-interactive signin (for CI/CD)

```bash
# Send code
sola auth signin --email bot@example.com --send-only
# Code sent to bot@example.com

# Later, complete signin with code from email
sola auth signin --email bot@example.com --code 123456
```

## Error Handling

Commands output JSON on success. On error:
- Messages go to stderr
- Process exits with code 1
- No JSON output

Example:
```bash
$ sola event get --id 999999
Error: Couldn't find Event with 'id'=999999

$ echo $?
1
```

Integrate with shell workflows using exit codes:
```bash
sola event create ... && echo "Success" || echo "Failed"
```
