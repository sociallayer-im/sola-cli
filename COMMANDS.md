# sola-cli Commands Reference

CLI wrapper for the Sola API (`soon`, the current Rails backend). All commands output JSON.

**Base URL:** `https://api.sola.day/api/v1` (override with `SOLA_API_URL=http://localhost:3000` for a local `soon`)
**Auth:** a JWT read from `~/.sola/config.json`, sent as `Authorization: Bearer <token>`, for any command marked "requires auth".

Commands are grouped by domain: `auth`, `user`, `group`, `invite`, `event`, `participant`, `venue`, `place`, `track`, `ticket`, `discover`, `service`.

---

## auth

### `auth signin`

Sign in with an emailed one-time code (alphanumeric, e.g. `AB12CD` — not numeric). New emails sign up automatically on first successful verify.

```
sola auth signin --email <email> [--send-only] [--code <code>]
```

| Option | Type | Required | Description |
|--------|------|----------|--------------|
| `--email` | string | Yes | Email address to receive the code |
| `--send-only` | boolean | No | Send code only and exit (step 1 of a two-step flow) |
| `--code` | string | No | Verification code — if given, completes signin immediately |

```bash
sola auth signin --email user@example.com                    # interactive: send + prompt
sola auth signin --email user@example.com --send-only        # step 1
sola auth signin --email user@example.com --code AB12CD      # step 2
```

### `auth whoami`

Show the currently authenticated user. Requires auth.

```
sola auth whoami
```

---

## user

soon's person model is `User` — sails called this "profile". Handles/usernames live in `name`; display names in `nickname`.

### `user me`
Requires auth. Includes private fields (`email`, `permissions`) no public lookup exposes.
```
sola user me
```

### `user get`
No auth required.
```
sola user get --id <tsid-or-username>
```

### `user update`
Requires auth. Only passed fields change. `email` is not updatable here (it's the login identity).
```
sola user update [--name <name>] [--nickname <name>] [--bio <text>] [--image-url <url>]
```
`--name` can't be blanked out once set.

### `user groups`
No auth required.
```
sola user groups --id <tsid-or-username> [--role owner,manager]
```

---

## group

A **Group is also a popup city** — one table, no separate popup-city entity. `name` is the unique slug (set once at create, immutable after); `nickname` is the display name; `start_date`/`end_date`/`location` double as popup-city fields.

### `group get`
No auth required. Always returns full detail (parent/children, tracks, venues, memberships).
```
sola group get --id <tsid-or-slug>
```

### `group list`
Requires auth. Lists the groups you belong to.
```
sola group list
```

### `group create`
Requires auth. You become the owner.
```
sola group create --name <slug> [group fields...]
```

### `group update`
Requires auth + manager role.
```
sola group update --id <tsid> [group fields...]
```

**Group fields** (create/update):

| Option | Description |
|--------|--------------|
| `--nickname` | Display name |
| `--bio` | Description, markdown |
| `--timezone` | IANA timezone |
| `--location` | Human-readable location |
| `--image-url` | Avatar/logo |
| `--logo-url` | Secondary logo |
| `--featured-image-url` | Wide banner-style card image |
| `--banner-image-url` / `--banner-link-url` / `--banner-text` | Group-page banner |
| `--parent-id` | Nest under a parent group you manage |
| `--start-date` / `--end-date` | Popup-city window |
| `--can-publish-event` / `--can-join-event` / `--can-view-event` | Permission flags |
| `--twitter` / `--github` / `--discord` / `--telegram` | social_links |

`group_tags` (`featured`/`top` homepage curation) is platform-admin-only and not exposed by this CLI.

### `group freeze`
Requires auth + owner role. Deactivates without deleting.
```
sola group freeze --id <tsid>
```

### `group send-email`
Requires auth + manager role. Broadcasts to every active member, or previews to one address.
```
sola group send-email --id <tsid> --subject <text> --content <text> [--test-recipient <email>]
```

### `group members`
No auth required. Each row includes a **membership id** — needed by `set-role`/`remove-membership`.
```
sola group members --group <tsid-or-slug>
```

### `group add-member`
Requires auth + manager role (owner role needs an existing owner).
```
sola group add-member --group <tsid> --user <tsid> [--role member|admin|manager|owner]
```

### `group set-role`
Requires auth. A direct manager/owner can set any role; a **parent**-group manager can only toggle the `manager` role specifically.
```
sola group set-role --group <tsid> --membership <id> --role <role>
```

### `group remove-membership`
Requires auth. Managers remove members/admins; only an owner removes another owner; the last owner can never be removed. Anyone may remove their own membership.
```
sola group remove-membership --group <tsid> --membership <id>
```

### `group leave`
Requires auth. Convenience: resolves your own membership id and removes it.
```
sola group leave --group <tsid>
```

---

## invite

Every action here requires auth — invites carry PII (`receiver_address`), so there's no anonymous read.

```bash
sola invite list --group <tsid>                                                 # manager
sola invite send --group <tsid> --receivers "alice,bob@example.com" --role member [--message <text>]
sola invite pending                                                              # invites for your email
sola invite show --id <id>
sola invite accept --group <tsid> --id <id>
sola invite cancel --group <tsid> --id <id>                                      # manager
sola invite revoke --group <tsid> --id <id>                                      # manager
sola invite request --group <tsid>                                               # self-service, always role=member
sola invite accept-request --group <tsid> --id <id>                              # manager approves a request
sola invite send-with-code --group <tsid> [--role member] [--message <text>]     # reusable code
sola invite accept-with-code --group <tsid> --code <code>
```

`send` matches receivers against existing users by username/email/wallet — matches are added directly (no invite record); only unmatched email addresses get a real email invite.

---

## event

Reads (`get`/`list`) are public and personalize (`is_attending`/`is_owner`/`is_starred`) when signed in. Writes require auth. Joining/leaving/approving participants lives under **`participant`**, not here.

### `event get`
```
sola event get --id <tsid>
```

### `event list`

| Option | Description |
|--------|--------------|
| `--group` | Group TSID/slug to scope to. Omitted + signed in → your groups' events. Omitted + anonymous → all public events. |
| `--collection` | `upcoming` \| `past` \| `ongoing` |
| `--search-title` | Substring match on title |
| `--tags` | Comma-separated, matches ANY |
| `--venue` / `--track` / `--kind` / `--category` | Filters |
| `--pinned` | Homepage-pinned only |
| `--skip-recurring` | Exclude recurring-series events |
| `--owner` / `--attendee` / `--co-host` / `--starred` | User TSID/username — profile-tab filters |
| `--start-date` / `--end-date` / `--timezone` | Date window (default UTC) |
| `--limit` (default 20, cap 500) / `--page` | Pagination |

### `event pending-approval`
Requires auth. Your manager approval inbox.
```
sola event pending-approval [--limit] [--page]
```

### `event create`
Requires auth. Times are interpreted in `--timezone` (falling back to the group's), naive strings like `2026-06-15T09:00:00` mean local time there, not UTC.
```
sola event create --group <tsid> --title <text> --start <iso> --end <iso> [fields...]
```

| Option | Description |
|--------|--------------|
| `--timezone` | IANA tz, defaults to group's |
| `--place-id` | Location, via `place create` |
| `--venue-id` | Booking — validated for group membership + availability |
| `--track-id` | Program/series |
| `--content` / `--image-url` / `--tags` / `--requirement-tags` / `--category` / `--kind` | |
| `--max-participant` / `--require-approval` / `--meeting-url` / `--external-url` / `--visibility` / `--status` | |
| `--roles-json` | JSON array, created atomically with the event |
| `--tickets-json` | JSON array, created atomically with the event |

### `event update`
Requires auth + ownership or manager role. `group_id` is not updatable.
```
sola event update --id <tsid> [fields...]
```
Accepts the same field flags as `create` minus `--group`/`--roles-json`/`--tickets-json`/`--requirement-tags`/`--visibility`/`--external-url`/`--category`/`--kind`.

### `event cancel`
Requires auth + ownership or manager role. Soft-cancel (status → cancelled, attendees emailed a calendar cancellation) — does not delete the record.
```
sola event cancel --id <tsid>
```

### `event approve`
Requires auth + manager role. Publishes a pending event.
```
sola event approve --id <tsid>
```

---

## participant

Everything here requires auth (no anonymous participant read).

```bash
sola participant list --event <tsid>
sola participant join --event <tsid> [--form-answers-json '[{"field_id":1,"value":"..."}]']
sola participant update --event <tsid> --id <id> --status <status>              # self only
sola participant cancel --event <tsid>                                          # self, auto-resolves your own record
sola participant approve --event <tsid> --id <id>                               # manager/owner
sola participant reject --event <tsid> --id <id>                                # manager/owner
sola participant check-in --event <tsid> --user <tsid>                          # manager/owner, idempotent
```

`join` ends up `pending` instead of `attending` if the event requires approval or has a required form and you aren't a manager.

---

## venue

**Every action requires auth** — unlike groups/events, soon has no anonymous read path for venues.

```bash
sola venue get --id <id>
sola venue list [--group <tsid-or-slug>]
sola venue create --group <tsid> --name <text> [venue fields...]
sola venue update --id <id> [venue fields...]
sola venue remove --id <id>                                                     # archives, doesn't delete
sola venue conflict --id <id> --start <iso> --end <iso> [--exclude-event <tsid>]
sola venue set-availability --id <id> --availabilities-json '[...]'
```

**Venue fields:** `--name`, `--about`, `--website`, `--capacity`, `--require-approval`, `--featured-image-url`, `--start-date`, `--end-date`, `--place-id` (location — via `place create`, not free text), `--tags`, `--amenities`, `--image-urls`, `--track-ids`.

**Availability:** each entry is `{day_of_week, day, intervals: [["HH:MM","HH:MM"]], role_required}`. `day_of_week` = weekly slot (0=Sunday); `day` = date override and takes priority. Empty `intervals` = closed that slot. No availability rows at all = open 24/7.

```bash
sola venue set-availability --id 7 --availabilities-json \
  '[{"day_of_week":1,"intervals":[["09:00","18:00"]]}]'
```

`conflict` replaces the old `check-availability` — it returns the actual clashing event (or `null`), not a boolean.

---

## place

Every location-bearing write (events, venues, markers) resolves to a `place_id` through here first. Requires auth for every action.

```bash
sola place list
sola place get --id <id>
sola place search --query "Marina Bay"
sola place create --name <text> [--address <text>] [--latitude <n>] [--longitude <n>] [--description <text>]
```

`create` is find-or-create by name — calling it again with the same name returns the existing place instead of erroring.

---

## track

Event programs/series within a group. Reads are public; writes require auth + manager role.

```bash
sola track list [--group <tsid-or-slug>]
sola track get --id <id>
sola track create --group <tsid> --title <text> [--description] [--image-url] [--is-private] [--start-date] [--end-date] [--manager-ids <csv>]
sola track update --id <id> [same fields]
sola track remove --id <id>
```

`name` (the unique slug) auto-generates from `--title` if omitted. `--manager-ids` replaces the track's admin set — omit it on update to leave admins untouched.

---

## ticket

`list-types`, `check-coupon`, and `coupon-price` are public; everything else requires auth. Stripe checkout itself (client secret / webhook) isn't exposed — a CLI can't drive a browser payment element.

```bash
sola ticket list-types --group <tsid-or-slug>
sola ticket list --event <tsid>
sola ticket create --event <tsid> --title <text> [--content] [--quantity] [--status] [--ticket-type] [--need-approval] [--check-badge-class] [--end-time <iso>] [--start-date] [--end-date] [--payment-methods-json '[...]']
sola ticket update --event <tsid> --id <id> [same fields]
sola ticket remove --event <tsid> --id <id>                       # destroyed if unsold, retired (inactive) if sold
sola ticket rsvp --event <tsid> --ticket <id> [--payment-method <id>] [--chain <name>] [--coupon <code>] [--message <text>] [--answers-json '[...]']
sola ticket verify-payment --ticket-item <id> [--txhash <hash>] [--sender-address <addr>]
sola ticket cancel-unpaid --chain <name> --event <tsid> --order <ticket-item-id>
sola ticket check-coupon --event <tsid> --code <code>
sola ticket coupon-price --code <code> --payment-method <id> [--amount <n>]
```

`rsvp`: free tickets confirm immediately; paid ones create a pending order. For crypto payments, follow up with `verify-payment --txhash` once the transaction confirms. `rsvp` is rejected once `--end-time` passes ("ticket sale has ended") — this is a separate field from `--start-date`/`--end-date`, which instead scope a multi-day ticket's *valid days* (paired with the ticket's `days_allowed`, not currently exposed by this CLI).

`--payment-methods-json` entries: `{chain, kind, token_name, token_address, receiver_address, price, protocol, chains: [...]}`. On `update`, include `id` to edit/keep an entry, `"_destroy": true` to remove it, or omit `id` to add a new one.

---

## discover

Both public — expose only public, published content.

```bash
sola discover home                    # featured groups, curated popup cities, upcoming public events
sola discover search --keyword <text> # events + groups + users + badge_classes, min 2 chars
```

---

## service

### `service upload-image`
Requires auth. One storage backend (Cloudflare Images) — no `--provider` option anymore. Max 10MB; png/jpeg/gif/webp/svg.
```
sola service upload-image --file <path>
```

---

## Removed since the sails-era CLI

- `profile search` / `get-by-email` / `get-by-handle` — soon has one lookup path, `user get --id <tsid-or-username>`, no separate search-by-field endpoints.
- `auth set-handle` — folded into `user update --name`.
- `venue check-availability` — replaced by `venue conflict`, which returns the actual clashing event instead of a boolean.
- Old numeric-ID assumptions — soon's ids are opaque TSID strings (e.g. `"3mloe3vkidht3"`), not integers.

## Output

All commands return **JSON**. List endpoints return `{"data": [...], "meta": {...}}` (Pagy pagination); most others return the record directly.

```bash
sola event list --group solaverse | jq '.data[].id'
sola venue list --group solaverse | jq '.data[] | {id, name, capacity}'
```

## Error Handling

Errors go to stderr, JSON is not printed, and the process exits `1`.

```bash
$ sola event get --id doesnotexist
Error: Not found
$ echo $?
1
```

```bash
sola event create ... && echo "Success" || echo "Failed"
```
