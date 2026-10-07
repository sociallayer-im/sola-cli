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

# (Check email for the alphanumeric code, e.g. AB12CD)

# Step 2: Complete signin with code
sola auth signin --email your@email.com --code AB12CD
```

This saves your JWT to `~/.sola/config.json` for future commands. New emails
sign up automatically on first successful verify — no separate signup step.

Set your username (optional, one-time):
```bash
sola user update --name yourhandle --nickname "Your Name"
```

## Commands

### User

soon's person model is `User` (its predecessor called this "profile"). Handles
live in `name`, display names in `nickname`.

```bash
sola user me                                        # your own record, requires auth
sola user update --nickname "Alice" --bio "Builder"  # requires auth
sola user get --id alice                             # public lookup, by TSID or username
sola user groups --id alice --role owner,manager     # groups alice belongs to
```

### Groups

A group **is** a popup city (one table) — `start-date`/`end-date`/`location` double as popup-city fields.

**Get group info** (no auth):
```bash
sola group get --id solaverse
```

**Create / update** (requires auth):
```bash
sola group create --name mygroup --nickname "My Group" --timezone Asia/Singapore
sola group update --id 3mloe... --bio "Updated description" --location Singapore
```

**Members and roles** (requires auth for writes; `members` is public). Membership
writes are addressed by **membership id**, not user id — get it from `members` first:
```bash
sola group members --group solaverse                       # includes each membership's id
sola group add-member --group 3mloe... --user 3khj... --role member
sola group set-role --group 3mloe... --membership 55 --role manager
sola group remove-membership --group 3mloe... --membership 55
sola group leave --group 3mloe...                           # convenience: finds your own membership
```

### Invitations

Everything requires auth — invites carry PII (email addresses).

```bash
sola invite send --group 3mloe... --receivers "alice,bob@example.com" --role member
sola invite request --group 3mloe...             # self-service join request
sola invite pending                               # invites addressed to you
sola invite accept --group 3mloe... --id 55
```

### Events

**Get / browse** (public; personalizes when signed in):
```bash
sola event get --id 0GA2...
sola event list --group solaverse
sola event list --group solaverse --collection upcoming --limit 20
sola event list --group solaverse --tags "web3,workshop" --start-date 2026-06-01
```

**Create** — location resolves through a Place, not free text:
```bash
sola place create --name "Hotel Trio - Patio" --address "..."
# → note the returned place id

sola event create \
  --group solaverse \
  --title "Community Lunch" \
  --start "2026-10-10T12:00:00" \
  --end "2026-10-10T14:00:00" \
  --timezone America/Los_Angeles \
  --place-id <id from above>
```

**Update / cancel / approve** (requires auth + ownership or manager role):
```bash
sola event update --id 0GA2... --title "New Title"
sola event cancel --id 0GA2...      # soft-cancel; does not delete the record
sola event approve --id 0GA2...     # publish a pending event
```

**Participation** — a separate command group, requires auth:
```bash
sola participant join --event 0GA2...
sola participant cancel --event 0GA2...                       # cancels YOUR OWN RSVP
sola participant list --event 0GA2...                         # find participant ids
sola participant approve --event 0GA2... --id 9001            # manager
sola participant reject --event 0GA2... --id 9001             # manager
```

### Venues

**Every venue action requires auth** — unlike groups/events, there's no anonymous read.

```bash
sola venue get --id 115
sola venue list --group solaverse
sola venue create --group 3mloe... --name "Main Hall" --capacity 200 --tags "indoor,stage"
sola venue update --id 115 --capacity 250
sola venue conflict --id 115 --start "2026-06-15T09:00:00" --end "2026-06-15T11:00:00"
```

### Tracks (event programs)

Reads are public; writes require auth + manager role.
```bash
sola track list --group solaverse
sola track create --group 3mloe... --title "Workshops"
```

### Tickets

```bash
sola ticket list-types --group solaverse                       # public
sola ticket create --event 0GA2... --title "General" --quantity 50
sola ticket rsvp --event 0GA2... --ticket 7                     # confirms immediately if free
```

### Discover / search

Both public:
```bash
sola discover home                     # featured groups, popup cities, upcoming events
sola discover search --keyword solana
```

## Output

All commands return **JSON**. List endpoints return `{"data": [...], "meta": {...}}`.

```bash
sola event list --group solaverse | jq '.data[].id'
sola venue list --group solaverse | jq '.data[] | {id, name, capacity}'
```

## Help

```bash
sola --help
sola event --help
sola event create --help
```

## Full Documentation

See [COMMANDS.md](./COMMANDS.md) for:
- Complete parameter documentation for all commands
- Advanced event filtering, availability rules, coupon/payment-method shapes
- Full coverage of the `auth`, `user`, `group`, `invite`, `event`, `participant`, `venue`, `place`, `track`, `ticket`, `discover`, and `service` command groups
- What changed vs. the pre-rewrite (sails-era) CLI

## Notes

- **API:** `https://api.sola.day/api/v1` (`Authorization: Bearer <jwt>`, not a query param)
- **Config Location:** `~/.sola/config.json` (auto-created on signin)
- **Requirements:** Node.js 18+ (for native fetch)
- **Dependencies:** Only `yargs` for CLI parsing (no heavy packages)
- **IDs:** opaque TSID strings (e.g. `"3mloe3vkidht3"`), not integers

## Examples

### Create an event at a specific venue

```bash
# 1. List venues to find "Hotel Trio - Patio"
sola venue list --group solaverse | jq '.data[] | select(.name == "Hotel Trio - Patio") | {id, name}'

# 2. Create event at that venue
sola event create \
  --group solaverse \
  --title "Community Dinner" \
  --start "2026-10-10T12:00:00" \
  --end "2026-10-10T14:00:00" \
  --timezone America/Los_Angeles \
  --venue-id 115
```

### List upcoming events and extract details

```bash
sola event list --group solaverse --collection upcoming | jq '.data[] | {id, title, start_time}'
```

### Two-step non-interactive signin (for CI/CD)

```bash
sola auth signin --email bot@example.com --send-only
# (check email, copy code)
sola auth signin --email bot@example.com --code AB12CD
```

## Error Handling

Commands output JSON on success. On error:
- Messages go to stderr
- Process exits with code 1
- No JSON output

```bash
$ sola event get --id doesnotexist
Error: Not found

$ echo $?
1
```

Integrate with shell workflows using exit codes:
```bash
sola event create ... && echo "Success" || echo "Failed"
```

## Newer command groups (soon modules added after Aug 2026)

`form`, `team`, `marker`, `event-role`, `recurring`, `comment`, `activity`, `category`/`topic`/`reply` (discussion), `poll`, `hackathon`, `hackathon-project`, `badge-class`, `badge`, `voucher`, `remember`, `oauth`, `stripe`, `withdrawal`, `upload`. Also `auth signin-phone` (CN only), `group directory`, `event roles`/`calendar-url`, and many more `ticket` subcommands. Feature-gated modules (discussion, poll, hackathon, stripe, withdrawal) 404 when the server flag or the group's flag is off. Run `sola <command> --help` for exact options; COMMANDS.md has a one-line index of every subcommand.
