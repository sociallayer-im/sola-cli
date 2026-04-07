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

**Get profile by email:**
```bash
sola profile get-by-email --email user@example.com
```

**Get profile by handle:**
```bash
sola profile get-by-handle --handle alice
```

### Groups

**Get group info by ID or handle:**
```bash
sola group get --id 10
sola group get --id solaverse
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

### Venues

**Get venue by ID:**
```bash
sola venue get --id 115
```

**List group venues:**
```bash
sola venue list --group 10
```

**Create venue:**
```bash
sola venue create \
  --group 10 \
  --title "Main Hall" \
  --location "123 Main St" \
  --capacity 200
```

**Update venue:**
```bash
sola venue update --id 115 --capacity 250 --title "Updated Hall"
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
- All 14+ commands (includes badges, voting, points, forms, etc.)
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
