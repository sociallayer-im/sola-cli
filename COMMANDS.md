# sola-cli Commands Reference

CLI wrapper for the Sola API (`soon`, the current Rails backend). All commands output JSON.

**Base URL:** `https://api.sola.day/api/v1` (override with `SOLA_API_URL=http://localhost:3000` for a local `soon`)
**Auth:** a JWT read from `~/.sola/config.json`, sent as `Authorization: Bearer <token>`, for any command marked "requires auth".

Commands are grouped by domain — see the full index at the bottom (33 command groups).

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

### `group tags`
Read-modify-write on `group_tags` — adds/removes only what you name, keeps the rest. The homepage curation tags are platform-admin-only (`pin` → community grid, `top` → popup-city list, `top`+`featured` → carousel); the backend silently strips them from any other caller.
```
sola group tags --id <tsid-or-slug> [--add pin,top] [--remove featured]
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
sola invite send --group <tsid> --receivers "alice,bob@example.com,13800138000" --role member [--message <text>]
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

`send` matches receivers against existing users by phone (when the input reads as a +86 number), username, email, or wallet — matches are added directly (no invite record). Unmatched emails get an email invite; unmatched CN phone numbers become **whitelist invites**: no SMS is sent, they never expire, and the group membership lands automatically the moment that number signs in via SMS or is bound to an account. Re-importing a pending phone is idempotent.

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
sola ticket create --event <tsid> --title <text> [--content] [--quantity] [--status] [--ticket-type] [--need-approval] [--check-badge-class] [--check-group-ids <tsid,tsid>] [--end-time <iso>] [--start-date] [--end-date] [--payment-methods-json '[...]']
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

`--check-group-ids` makes a members-only ticket: only members of ANY listed group can claim it (403 otherwise). Combine with no payment methods for a free whitelist ticket — import the whitelist with `invite send` first. On `update`, pass `--check-group-ids ""` to clear the gate.

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

---

## Full command index (generated from `--help`)

One line per subcommand; run `sola <command> <sub> --help` for options. Sections above predate the soon modules added after 2026-08 (forms, teams, discussion, polls, hackathons, badges, vouchers, OAuth, payments) — for those this index plus `--help` is authoritative.


### auth

- `sola auth signin` — Sign in with an emailed one-time code
- `sola auth whoami` — Show the currently authenticated user
- `sola auth signin-phone` — Sign in with an SMS one-time code
- `sola auth bind-email` — Attach an email to the signed-in account (for accounts created by wallet, WeChat or phone)
- `sola auth bind-phone` — Attach a mobile number to the signed-in account

### user

- `sola user me` — Fetch the currently authenticated user
- `sola user get` — Fetch a user by TSID or username
- `sola user update` — Update your own user record
- `sola user groups` — List the groups a user belongs to
- `sola user merge` — PLATFORM ADMIN ONLY, IRREVERSIBLE

### group

- `sola group get` — Fetch a group by TSID or its unique slug (`name`)
- `sola group list` — List the groups you belong to (paginated: { data, meta })
- `sola group directory` — List ALL active groups (public, paginated: { data, meta }) with member/event counts and tags
- `sola group calendar` — Print the public iCalendar (.ics) subscription URL for a group's published events
- `sola group create` — Create a new group
- `sola group update` — Update fields on an existing group
- `sola group tags` — Add/remove entries in group_tags without touching the rest
- `sola group freeze` — Deactivate a group without deleting it
- `sola group send-email` — Broadcast an email to every active member
- `sola group members` — List a group's memberships (paginated: { data, meta }), each with a membership id (needed by set-role/remove-membership) and role
- `sola group add-member` — Directly add a user to the group with a given role, bypassing invites
- `sola group set-role` — Change an existing member's role and/or their admin-mail preference
- `sola group remove-membership` — Remove a member from the group by membership id
- `sola group leave` — Leave a group yourself — a convenience that looks up your own membership id and removes it

### invite

- `sola invite list` — List all invites for a group (paginated: { data, meta }; pending, accepted, cancelled, whitelist, ...)
- `sola invite send` — Invite people to a group by username, email, wallet address, or CN phone number
- `sola invite pending` — List invites pending for your own email address
- `sola invite show` — Fetch a single invite by id (the invite-preview page)
- `sola invite accept` — Accept an email invite addressed to you
- `sola invite cancel` — Cancel an invite (sets status to cancelled)
- `sola invite revoke` — Revoke an invite (sets status to revoked)
- `sola invite request` — Request to join a group yourself as a member
- `sola invite accept-request` — Approve a pending self-service join request
- `sola invite send-with-code` — Generate a reusable 8-character invite code (30-day expiry) — anyone with the code can join via `invite accept-with-code`
- `sola invite accept-with-code` — Join a group using a reusable invite code

### event

- `sola event get` — Fetch a single event by TSID (or a legacy sails id, during the migration window)
- `sola event list` — Browse/search events
- `sola event pending-approval` — List events awaiting review across groups you manage (the manager's approval inbox)
- `sola event create` — Create a new event in a group
- `sola event update` — Update fields on an existing event
- `sola event cancel` — Cancel an event (flips status to cancelled and emails attendees a calendar cancellation)
- `sola event approve` — Publish a pending event (one submitted where publishing requires approval)
- `sola event roles` — List an event's roles (co-hosts, speakers, judges, ...)
- `sola event add-role` — Add a role to an event
- `sola event update-role` — Update an event role
- `sola event remove-role` — Remove a role from an event
- `sola event calendar-url` — Print the public .ics feed URL for an event (no auth; only publicly visible, non-draft events resolve)

### participant

- `sola participant list` — List an event's active (non-cancelled) participants, each with a participant record id (needed by update/cancel/approve/reject)
- `sola participant join` — RSVP / join an event directly (no ticket)
- `sola participant update` — Change your own participation status (e.g
- `sola participant cancel` — Cancel your own RSVP — a convenience that looks up your own participant record and withdraws it (soft delete; also cancels unpaid orders)
- `sola participant approve` — Approve a pending (approval-required) participant
- `sola participant reject` — Decline a pending participant
- `sola participant check-in` — Stamp an attendee as checked in at the door

### venue

- `sola venue get` — Fetch a venue by id, including its availability rules
- `sola venue list` — List non-archived venues, optionally scoped to a group
- `sola venue create` — Create a new venue for a group
- `sola venue update` — Update fields on an existing venue
- `sola venue remove` — Archive (soft-delete) a venue — existing events keep referencing it
- `sola venue conflict` — Find the first event that would clash with a given time window — the check an event editor runs before submitting
- `sola venue set-availability` — Replace a venue's whole availability set

### place

- `sola place list` — List places (paginated)
- `sola place get` — Fetch a place by id
- `sola place search` — Typeahead search over place name/address (case-insensitive substring, max 20 results)
- `sola place create` — Find-or-create a place by name

### track

- `sola track list` — List tracks, optionally scoped to a group
- `sola track get` — Fetch a single track by id, including its admin roles
- `sola track create` — Create a new track in a group
- `sola track update` — Update fields on an existing track
- `sola track remove` — Delete a track

### ticket

- `sola ticket list-types` — List all ticket types defined for a group (across all its events)
- `sola ticket list` — List an event's ticket types (with payment methods)
- `sola ticket create` — Create a ticket type for an event
- `sola ticket update` — Update a ticket type
- `sola ticket remove` — Remove a ticket type — destroyed outright if unsold, retired (status: inactive) if any tickets have already been sold against it
- `sola ticket rsvp` — RSVP to an event using a specific ticket
- `sola ticket verify-payment` — Confirm a pending order by proving payment (Stripe/WeChat are checked server-side; crypto needs --txhash)
- `sola ticket cancel-unpaid` — Cancel your own pending (unpaid) order, releasing the reserved ticket quantity
- `sola ticket check-coupon` — Check whether a coupon code exists for an event
- `sola ticket coupon-price` — Preview the discounted price a coupon code would give for a payment method
- `sola ticket checkout-session` — Get the Stripe-hosted checkout page for a pending card order (re-serves the same open session)
- `sola ticket wechat-prepay` — Place the WeChat Pay JSAPI order for a pending WeChat order and print { pay_params } (meant for WeixinJSBridge inside WeChat — of limited use from a terminal)
- `sola ticket refund` — Refund a paid card/WeChat order (organizer only; crypto orders are not refundable here)
- `sola ticket set-payment-status` — Server-to-server confirm of a CRYPTO order, authenticated by the deployment's shared NEXT_TOKEN secret instead of a user token (card/WeChat orders are refused — they confirm via webhook)
- `sola ticket add-group-item` — Grant a group ticket (and thus membership) to an email address
- `sola ticket orders` — List an event's orders (ticket_items)
- `sola ticket order-summary` — Revenue rollup for an event, per payment rail and currency (WeChat adds fee/withdrawable figures)
- `sola ticket coupons` — List an event's (non-removed) coupons
- `sola ticket coupon` — Fetch one coupon by id
- `sola ticket coupon-code` — Print just { coupon_id, code } for a coupon id
- `sola ticket coupon-usage` — List the orders that redeemed a coupon
- `sola ticket set-coupons` — Create, edit, or remove an event's coupons in one batch

### discover

- `sola discover home` — Fetch the homepage payload: `groups` (featured), `communities` (pinned, max 40), `popup_cities` and `events` (next public)
- `sola discover search` — Global keyword search across events, groups, users, and badge classes

### service

- `sola service upload-image` — Upload an image file (png/jpeg/gif/webp/svg, max 10MB) to Cloudflare Images

### form

- `sola form event-get` — Get an event's registration form
- `sola form event-save` — Create or replace an event's registration form (also turns on require-approval)
- `sola form event-clear` — Detach the registration form from an event
- `sola form event-submission` — Read one person's application answers
- `sola form event-my-submission` — Read my own application answers for an event
- `sola form event-update-submission` — Edit my pending application answers
- `sola form event-submissions` — List all application submissions for an event
- `sola form list` — List forms I created (including event registration forms)
- `sola form my-submissions` — List the forms I have filled in, with my answers
- `sola form get` — Get a standalone form by slug or id
- `sola form create` — Create a standalone form
- `sola form update` — Update a form
- `sola form remove` — Delete a form
- `sola form submissions` — List a form's submissions (paginated)
- `sola form my-submission` — Read my answers to a standalone form
- `sola form submit` — Submit (or re-submit, which edits) my answers to a standalone form

### team

- `sola team list` — List a group's teams
- `sola team create` — Create a team in a group
- `sola team update` — Update a team
- `sola team remove` — Delete a team (members are un-grouped, not deleted)
- `sola team members` — List a team's members
- `sola team add-member` — Add a user to a team
- `sola team remove-member` — Remove a user from a team

### marker

- `sola marker list` — List markers
- `sola marker get` — Get a marker by id
- `sola marker create` — Pin a marker on a group map
- `sola marker update` — Update a marker (group cannot be changed)
- `sola marker remove` — Delete a marker

### event-role

- `sola event-role list` — List an event's roles
- `sola event-role create` — Add a role to an event
- `sola event-role update` — Update a role
- `sola event-role remove` — Remove a role from an event

### recurring

- `sola recurring show` — Show a series and its (visible) occurrences
- `sola recurring create` — Create a series with one event per occurrence, atomically
- `sola recurring update` — Update occurrences in a series
- `sola recurring cancel` — Soft-cancel occurrences (status becomes cancelled; nothing is deleted)

### comment

- `sola comment list` — List comments of one type, newest first
- `sola comment create` — Post a comment
- `sola comment star` — Star an item
- `sola comment unstar` — Remove my star from an item
- `sola comment remove` — Soft-remove my own comment

### activity

- `sola activity list` — List activities addressed to me, newest first
- `sola activity mark-read` — Mark activities as read

### category

- `sola category list` — List the boards the caller may see in a group
- `sola category create` — Create a board in a group
- `sola category update` — Update a board
- `sola category remove` — Delete an EMPTY board (422 if it ever had topics; archive instead)

### topic

- `sola topic list` — List topics in a group, newest-activity first (pinned on top)
- `sola topic get` — Fetch one topic with its content
- `sola topic create` — Create a topic in a board
- `sola topic update` — Update a topic (author or manager)
- `sola topic remove` — Soft-delete a topic (author or manager)
- `sola topic pin` — Pin a topic to the top of its list (manager)
- `sola topic unpin` — Unpin a topic (manager)
- `sola topic close` — Close a topic to new replies
- `sola topic open` — Reopen a closed topic
- `sola topic flag` — Flag (hide) a topic for review
- `sola topic unflag` — Remove a topic flag
- `sola topic restore` — Restore a soft-deleted topic

### reply

- `sola reply list` — List a topic's replies in chronological order
- `sola reply create` — Post a reply to a topic
- `sola reply update` — Edit a reply (author or manager)
- `sola reply remove` — Soft-delete a reply (author or manager)
- `sola reply flag` — Flag (hide) a reply for review
- `sola reply unflag` — Remove a reply flag
- `sola reply restore` — Restore a soft-deleted reply

### poll

- `sola poll list` — List polls in a group, newest first
- `sola poll get` — Fetch one poll with options and (if permitted) results
- `sola poll create` — Create a poll in a group
- `sola poll update` — Update a poll (author or manager)
- `sola poll remove` — Soft-delete a poll
- `sola poll vote` — Cast or replace your vote
- `sola poll retract` — Withdraw your vote
- `sola poll close` — Close a poll now (author or manager)
- `sola poll flag` — Flag (hide) a poll for review
- `sola poll unflag` — Remove a poll flag
- `sola poll restore` — Restore a soft-deleted poll
- `sola poll export` — Print results as CSV to stdout (author/manager)

### hackathon

- `sola hackathon list` — List hackathons in a group, newest first
- `sola hackathon get` — Fetch one hackathon with tracks and permissions
- `sola hackathon create` — Create a hackathon (starts as draft)
- `sola hackathon update` — Update a hackathon
- `sola hackathon remove` — Soft-delete a hackathon
- `sola hackathon publish` — Publish a draft hackathon
- `sola hackathon unpublish` — Return a hackathon to draft
- `sola hackathon tracks` — Replace the hackathon's tracks
- `sola hackathon judges-team` — Snapshot the registration event's judges into a private group team (idempotent; re-running diffs the roster)
- `sola hackathon flag` — Flag (hide) a hackathon for review
- `sola hackathon unflag` — Remove a hackathon flag
- `sola hackathon restore` — Restore a soft-deleted hackathon
- `sola hackathon export` — Print the projects CSV to stdout (organisers only)

### hackathon-project

- `sola hackathon-project list` — List projects of a hackathon
- `sola hackathon-project get` — Fetch one project
- `sola hackathon-project create` — Create a draft project; you become its owner
- `sola hackathon-project update` — Update a project (owner/members/manager per policy)
- `sola hackathon-project remove` — Hard-delete a DRAFT project (irreversible; submitted projects must be unsubmitted first)
- `sola hackathon-project submit` — Submit the project (owner only, while submissions are open)
- `sola hackathon-project unsubmit` — Withdraw a submitted project back to draft
- `sola hackathon-project review` — Approve or reject a submitted project (organisers)
- `sola hackathon-project award` — Set (or clear, with --clear) a project's award label (organisers)
- `sola hackathon-project star` — Star a project
- `sola hackathon-project unstar` — Remove your star
- `sola hackathon-project leave` — Leave a project you are a member of
- `sola hackathon-project add-member` — Add a teammate (owner only; no self-join; not after submission)
- `sola hackathon-project remove-member` — Remove a teammate (owner only; the owner themself cannot be removed — transfer first)
- `sola hackathon-project transfer` — Transfer ownership to an existing member (owner only)
- `sola hackathon-project flag` — Flag (hide) a project for review
- `sola hackathon-project unflag` — Remove a project flag

### badge-class

- `sola badge-class list` — List badge classes, paginated
- `sola badge-class get` — Fetch a badge class by id
- `sola badge-class by-user` — Badge classes of every group a user is a member of
- `sola badge-class create` — Create a badge class
- `sola badge-class invites` — Unexpired group invites for a badge class's group (exposes invitee emails)

### badge

- `sola badge list` — List minted badges, paginated
- `sola badge get` — Fetch a badge by id
- `sola badge update` — Set how a badge is displayed on your profile
- `sola badge transfer` — Give a badge to another user by handle
- `sola badge burn` — Burn a minted badge
- `sola badge swap-code` — Generate a swap token for one of your badges to hand to another holder
- `sola badge swap` — Swap one of your badges for the badge behind a swap token

### voucher

- `sola voucher list` — List active (unexpired, not exhausted) vouchers, paginated
- `sola voucher get` — Fetch a voucher with its badges
- `sola voucher create` — Mint a code voucher redeemable by anyone holding its code
- `sola voucher send-badge` — Send the badge to existing users
- `sola voucher send-badge-by-address` — Send the badge to wallet addresses
- `sola voucher send-badge-by-email` — Send the badge to emails (or 0x addresses)
- `sola voucher code` — Reveal a voucher's redeem code
- `sola voucher revoke` — Revoke a voucher (sets its counter to 0)
- `sola voucher use` — Redeem a voucher into a badge for the current user
- `sola voucher reject-badge` — Decline a badge voucher addressed to you

### remember

- `sola remember meta` — Show the remember badge class id and joiner threshold
- `sola remember related-groups` — Popup-city groups each user attended events in
- `sola remember create` — Create a remember voucher (auto-joins you)
- `sola remember get` — Show who has joined and whether it has been minted
- `sola remember join` — Join a remember (idempotent)
- `sola remember cancel` — Leave a remember before it is minted
- `sola remember mint` — Mint one badge per joiner

### oauth

- `sola oauth apps` — List your registered OAuth applications
- `sola oauth app-get` — Fetch one of your applications
- `sola oauth app-create` — Register an application
- `sola oauth app-update` — Update one of your applications
- `sola oauth app-delete` — Delete an application and end every session it holds
- `sola oauth app-rotate-secret` — Issue a new client secret (shown once)
- `sola oauth grants` — List the apps you have granted access to
- `sola oauth grant-revoke` — Revoke a grant and the tokens it produced
- `sola oauth admin-apps` — Platform admin only (users.admin): list every application, paginated
- `sola oauth admin-app-get` — Platform admin only: fetch any application (admin view)
- `sola oauth admin-app-review` — Platform admin only: mark an application as reviewed (informational, shown on the consent screen)
- `sola oauth admin-app-disable` — Platform admin only: disable an application AND burn its live tokens

### stripe

- `sola stripe list` — List your Stripe settings (masked keys)
- `sola stripe for-event` — The event OWNER's active Stripe settings (masked), for picking one on a ticket
- `sola stripe create` — Add a Stripe key
- `sola stripe update` — Rename a setting or rotate its key
- `sola stripe delete` — Delete a setting

### withdrawal

- `sola withdrawal groups` — Groups you manage, with available and withdrawn amounts
- `sola withdrawal balance` — Available and withdrawn amounts for one group
- `sola withdrawal list` — Every withdrawal requested against a group's pool
- `sola withdrawal create` — Request withdrawal of a group's ENTIRE available balance (no partial amounts) to a bank account
- `sola withdrawal admin-list` — Platform admin only: every withdrawal, paginated
- `sola withdrawal admin-update` — Platform admin only: settle or reject a PENDING withdrawal after paying it out by hand

### upload

- `sola upload file` — Upload a document (pdf, txt, csv, zip, Office files, or png/jpg/gif/webp)
