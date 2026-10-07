import {
  getGroup, listMyGroups, groupDirectory, groupCalendarUrl, createGroup, updateGroup, freezeGroup, sendGroupEmail,
  listMemberships, addMembership, updateMembership, removeMembership,
  getMe,
} from '../api.js'
import { handleError, splitList } from '../utils.js'

export const command = 'group <subcommand>'
export const describe = 'Look up and manage Sola groups. A group IS a popup city (same table) — start-date/end-date/location double as popup-city fields. create/update/membership changes require auth.'

// Shared editable fields for create/update. Only defined flags are sent.
// group_tags is not a field flag — edit tags with `group tags --add/--remove`,
// which read-modify-writes the list instead of overwriting it blind.
const TIERS = ['manager', 'member', 'everyone']

const groupFieldOptions = (y) => y
  .option('nickname',   { type: 'string', describe: 'Display name of the group (e.g. "SolaVerse")' })
  .option('bio',        { type: 'string', describe: 'Description. Markdown supported.' })
  .option('timezone',   { type: 'string', describe: 'IANA timezone (e.g. Asia/Singapore)' })
  .option('location',   { type: 'string', describe: 'Human-readable location (e.g. "Singapore")' })
  .option('image-url',  { type: 'string', describe: 'Avatar/logo image URL' })
  .option('logo-url',   { type: 'string', describe: 'Secondary logo URL' })
  .option('featured-image-url', { type: 'string', describe: 'Wide banner-style image used on cards/discover (falls back to --image-url if unset)' })
  .option('banner-image-url', { type: 'string', describe: 'Group page banner image URL' })
  .option('banner-link-url', { type: 'string', describe: 'URL the banner links to' })
  .option('banner-text', { type: 'string', describe: 'Text overlaid on the banner' })
  .option('parent-id',  { type: 'string', describe: 'Parent group TSID — nests this group under one you manage' })
  .option('start-date', { type: 'string', describe: 'Popup-city start date (ISO date, e.g. 2026-06-01)' })
  .option('end-date',   { type: 'string', describe: 'Popup-city end date (ISO date, e.g. 2026-06-30)' })
  .option('can-publish-event', { type: 'string', choices: TIERS, describe: 'Who may publish events in this group: manager | member | everyone' })
  .option('can-join-event',    { type: 'string', choices: TIERS, describe: 'Who may join its events: manager | member | everyone' })
  .option('can-view-event',    { type: 'string', choices: TIERS, describe: 'Who may view its events: manager | member | everyone' })
  .option('require-event-approval', { type: 'boolean', describe: 'Events published in this group wait for manager approval' })
  .option('discussion-enabled', { type: 'boolean', describe: 'Enable the discussion board (also needs DISCUSSION_ENABLED server-side)' })
  .option('can-post-topic',    { type: 'string', choices: TIERS, describe: 'Who may post discussion topics' })
  .option('poll-enabled',       { type: 'boolean', describe: 'Enable polls (also needs POLL_ENABLED server-side)' })
  .option('can-create-poll',    { type: 'string', choices: TIERS, describe: 'Who may create polls' })
  .option('hackathon-enabled',  { type: 'boolean', describe: 'Enable hackathons (also needs HACKATHON_ENABLED server-side)' })
  .option('can-create-hackathon', { type: 'string', choices: TIERS, describe: 'Who may create hackathons' })
  .option('map-enabled',        { type: 'boolean', describe: 'Show the map on the group page' })
  .option('event-tags',       { type: 'string', describe: 'Comma-separated event tag list (replaces the existing list)' })
  .option('requirement-tags', { type: 'string', describe: 'Comma-separated requirement tag list (replaces the existing list)' })
  .option('venue-tags',       { type: 'string', describe: 'Comma-separated venue tag list (replaces the existing list)' })
  .option('twitter',    { type: 'string', describe: 'Twitter/X handle for social_links' })
  .option('github',     { type: 'string', describe: 'GitHub handle for social_links' })
  .option('discord',    { type: 'string', describe: 'Discord handle for social_links' })
  .option('telegram',   { type: 'string', describe: 'Telegram handle for social_links' })

function buildGroupFields(argv) {
  const fields = {
    nickname:            argv.nickname,
    bio:                 argv.bio,
    timezone:            argv.timezone,
    location:            argv.location,
    image_url:           argv['image-url'],
    logo_url:            argv['logo-url'],
    featured_image_url:  argv['featured-image-url'],
    banner_image_url:    argv['banner-image-url'],
    banner_link_url:     argv['banner-link-url'],
    banner_text:         argv['banner-text'],
    parent_id:           argv['parent-id'],
    start_date:          argv['start-date'],
    end_date:            argv['end-date'],
    can_publish_event:   argv['can-publish-event'],
    can_join_event:      argv['can-join-event'],
    can_view_event:      argv['can-view-event'],
    require_event_approval: argv['require-event-approval'],
    discussion_enabled:  argv['discussion-enabled'],
    can_post_topic:      argv['can-post-topic'],
    poll_enabled:        argv['poll-enabled'],
    can_create_poll:     argv['can-create-poll'],
    hackathon_enabled:   argv['hackathon-enabled'],
    can_create_hackathon: argv['can-create-hackathon'],
    map_enabled:         argv['map-enabled'],
    event_tag_list:      splitList(argv['event-tags']),
    requirement_tag_list: splitList(argv['requirement-tags']),
    venue_tag_list:      splitList(argv['venue-tags']),
  }
  const social = {
    twitter:  argv.twitter,
    github:   argv.github,
    discord:  argv.discord,
    telegram: argv.telegram,
  }
  const socialSet = Object.fromEntries(
    Object.entries(social).filter(([, v]) => v !== undefined)
  )
  if (Object.keys(socialSet).length > 0) fields.social_links = socialSet
  return fields
}

export function builder(yargs) {
  return yargs
    .command(
      'get',
      'Fetch a group by TSID or its unique slug (`name`). Always returns full detail: parent/children, tracks, venues, memberships. No auth required.',
      (y) => y
        .option('id', {
          type: 'string',
          demandOption: true,
          describe: 'Group TSID or slug (e.g. "solaverse")',
        })
        .example('$0 group get --id solaverse', 'Get group by slug'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getGroup(argv.id), null, 2))
      })
    )
    .command(
      'list',
      'List the groups you belong to (paginated: { data, meta }). Requires auth.',
      (y) => y
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' })
        .example('$0 group list', 'List your groups'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listMyGroups({ page: argv.page, limit: argv.limit }), null, 2))
      })
    )
    .command(
      'directory',
      'List ALL active groups (public, paginated: { data, meta }) with member/event counts and tags. Unlike `discover home` this includes groups carrying no curation tag. No auth required.',
      (y) => y
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' })
        .example('$0 group directory --limit 100', 'Browse every active group'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await groupDirectory({ page: argv.page, limit: argv.limit }), null, 2))
      })
    )
    .command(
      'calendar',
      'Print the public iCalendar (.ics) subscription URL for a group\'s published events. No request is made; paste the URL into Apple Calendar / Google Calendar (or use webcal:// with --webcal).',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Group TSID or slug' })
        .option('webcal', { type: 'boolean', describe: 'Print a webcal:// URL instead of https://' })
        .example('$0 group calendar --id solaverse', 'Print the feed URL'),
      handleError(async (argv) => {
        const url = groupCalendarUrl(argv.id)
        console.log(argv.webcal ? url.replace(/^https?:/, 'webcal:') : url)
      })
    )
    .command(
      'create',
      'Create a new group. Requires auth. You become the owner. `name` is the unique URL slug — set it once, it cannot be changed later via update.',
      (y) => groupFieldOptions(y)
        .option('name', {
          type: 'string',
          demandOption: true,
          describe: 'Unique handle/slug (shared namespace with usernames): 6-20 lowercase letters, digits and hyphens, hyphen only between other characters (e.g. "solaverse")',
        })
        .example('$0 group create --name solaverse --nickname "SolaVerse" --timezone Asia/Singapore', 'Create a group'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await createGroup({ name: argv.name, ...buildGroupFields(argv) }), null, 2))
      })
    )
    .command(
      'update',
      'Update fields on an existing group. Only the fields you pass are changed. Requires auth and manager role (or, for --parent-id, ownership of that parent group).',
      (y) => groupFieldOptions(y)
        .option('id', {
          type: 'string',
          demandOption: true,
          describe: 'Group TSID to update (e.g. from `group get`)',
        })
        .example('$0 group update --id 10 --bio "Updated description" --location Singapore', 'Update group fields'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await updateGroup(argv.id, buildGroupFields(argv)), null, 2))
      })
    )
    .command(
      'tags',
      'Add/remove entries in group_tags without touching the rest. The homepage curation tags — "pin" (community grid, max 40), "top" (popup-city list), "top"+"featured" (carousel; "featured" alone reaches nothing) — are platform-admin-only: the backend silently strips them from anyone else and keeps the existing ones, so check the printed result. Requires auth and manager role.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Group TSID or slug' })
        .option('add', { type: 'string', describe: 'Comma-separated tags to add (e.g. "pin")' })
        .option('remove', { type: 'string', describe: 'Comma-separated tags to remove' })
        .example('$0 group tags --id solafans --add pin', 'Pin a group to the homepage community grid (platform admin)')
        .example('$0 group tags --id solafans --remove pin', 'Unpin it'),
      handleError(async (argv) => {
        const add = splitList(argv.add) ?? []
        const remove = splitList(argv.remove) ?? []
        if (!add.length && !remove.length) throw new Error('pass --add and/or --remove')
        const group = await getGroup(argv.id)
        const tags = (group.group_tags ?? []).filter((t) => !remove.includes(t))
        for (const t of add) if (!tags.includes(t)) tags.push(t)
        const updated = await updateGroup(group.id, { group_tags: tags })
        console.log(JSON.stringify({ id: updated.id, name: updated.name, group_tags: updated.group_tags }, null, 2))
      })
    )
    .command(
      'freeze',
      'Deactivate a group without deleting it. Requires auth and owner role.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Group TSID to freeze' })
        .example('$0 group freeze --id 10', 'Freeze group 10'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await freezeGroup(argv.id), null, 2))
      })
    )
    .command(
      'send-email',
      'Broadcast an email to every active member. Requires auth and manager role. Pass --test-recipient to preview-send to just that address instead of the whole group.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Group TSID' })
        .option('subject', { type: 'string', demandOption: true, describe: 'Email subject' })
        .option('content', { type: 'string', demandOption: true, describe: 'Email body. Markdown supported.' })
        .option('test-recipient', { type: 'string', describe: 'Send only to this address, as a preview' })
        .example('$0 group send-email --id 10 --subject "Meetup Friday" --content "Details inside"', 'Broadcast to all members')
        .example('$0 group send-email --id 10 --subject "Test" --content "..." --test-recipient me@example.com', 'Preview-send to yourself'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await sendGroupEmail(argv.id, {
          subject: argv.subject, content: argv.content, testRecipient: argv['test-recipient'],
        }), null, 2))
      })
    )
    .command(
      'members',
      'List a group\'s memberships (paginated: { data, meta }), each with a membership id (needed by set-role/remove-membership) and role. No auth required.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID or slug (e.g. "solaverse")' })
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' })
        .example('$0 group members --group solaverse', 'List members of solaverse'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listMemberships(argv.group, { page: argv.page, limit: argv.limit }), null, 2))
      })
    )
    .command(
      'add-member',
      'Directly add a user to the group with a given role, bypassing invites. Requires auth and manager role (owner role can only be granted by an existing owner).',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID' })
        .option('user',  { type: 'string', demandOption: true, describe: 'User TSID to add' })
        .option('role',  { type: 'string', default: 'member', describe: 'Role to grant: member, manager, or owner (default: member; only an owner may grant owner)' })
        .example('$0 group add-member --group 10 --user 0GA2... --role member', 'Add a member directly'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await addMembership(argv.group, argv.user, argv.role), null, 2))
      })
    )
    .command(
      'set-role',
      'Change an existing member\'s role and/or their admin-mail preference. Requires auth. Owners (and platform admins) may set any role; a manager (or parent-group manager) may only promote member -> manager; demotion and anything touching owner is owner-only. --admin-notification applies to owner/manager rows only (own row, or any if you manage the group). Find --membership via `group members`.',
      (y) => y
        .option('group',      { type: 'string', demandOption: true, describe: 'Group TSID' })
        .option('membership', { type: 'string', demandOption: true, describe: 'Membership id (from `group members`)' })
        .option('role',       { type: 'string', choices: ['member', 'manager', 'owner'], describe: 'New role' })
        .option('admin-notification', { type: 'boolean', describe: 'Whether this owner/manager receives group admin emails' })
        .example('$0 group set-role --group 10 --membership 55 --role manager', 'Promote membership 55 to manager'),
      handleError(async (argv) => {
        const fields = { role: argv.role, admin_notification: argv['admin-notification'] }
        Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k])
        if (!Object.keys(fields).length) throw new Error('pass --role and/or --admin-notification')
        console.log(JSON.stringify(await updateMembership(argv.group, argv.membership, fields), null, 2))
      })
    )
    .command(
      'remove-membership',
      'Remove a member from the group by membership id. Requires auth: managers can remove members/admins, only an owner can remove another owner, and the last owner can never be removed. Anyone may remove their own membership (self-leave). Find --membership via `group members`.',
      (y) => y
        .option('group',      { type: 'string', demandOption: true, describe: 'Group TSID' })
        .option('membership', { type: 'string', demandOption: true, describe: 'Membership id to remove (from `group members`)' })
        .example('$0 group remove-membership --group 10 --membership 55', 'Remove membership 55'),
      handleError(async (argv) => {
        await removeMembership(argv.group, argv.membership)
        console.log(JSON.stringify({ result: 'removed' }, null, 2))
      })
    )
    .command(
      'leave',
      'Leave a group yourself — a convenience that looks up your own membership id and removes it. Requires auth.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID to leave' })
        .example('$0 group leave --group 10', 'Leave group 10'),
      handleError(async (argv) => {
        const me = await getMe()
        let own, page = 1
        for (;;) {
          const { data, meta } = await listMemberships(argv.group, { page, limit: 500 })
          own = data.find((m) => m.user?.id === me.id)
          if (own || !meta?.next_page) break
          page = meta.next_page
        }
        if (!own) throw new Error('You are not a member of this group')
        await removeMembership(argv.group, own.id)
        console.log(JSON.stringify({ result: 'left' }, null, 2))
      })
    )
}
