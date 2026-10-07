import {
  listBadgeClasses, getBadgeClass, badgeClassesByUser, createBadgeClass, badgeClassInvites,
} from '../api-assets.js'
import { handleError, splitList, parseJsonOption } from '../utils.js'

export const command = 'badge-class <subcommand>'
export const describe = 'Browse and create badge classes (badge templates). list/get/by-user are public; create and invites require auth.'

const out = (v) => console.log(JSON.stringify(v, null, 2))

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List badge classes, paginated. Public.',
      (y) => y
        .option('group-id', { type: 'string', describe: 'Only classes belonging to this group id' })
        .option('group-handle', { type: 'string', describe: 'Only classes of the group with this handle' })
        .option('creator-handle', { type: 'string', describe: 'Only classes created by this user handle' })
        .option('badge-type', { type: 'string', describe: 'Filter by badge_type (e.g. "badge", "remember")' })
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' })
        .example('$0 badge-class list --group-handle solafans', 'Badge classes of a group'),
      handleError(async (argv) => {
        out(await listBadgeClasses({
          group_id: argv['group-id'], group_handle: argv['group-handle'],
          creator_handle: argv['creator-handle'], badge_type: argv['badge-type'],
          page: argv.page, limit: argv.limit,
        }))
      })
    )
    .command(
      'get',
      'Fetch a badge class by id. Public.',
      (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Badge class id' }),
      handleError(async (argv) => out(await getBadgeClass(argv.id)))
    )
    .command(
      'by-user',
      'Badge classes of every group a user is a member of. Public.',
      (y) => y.option('handle', { type: 'string', demandOption: true, describe: 'User handle (name)' }),
      handleError(async (argv) => out(await badgeClassesByUser(argv.handle)))
    )
    .command(
      'create',
      'Create a badge class. Requires auth; with --group-id you must be able to manage that group.',
      (y) => y
        .option('name', { type: 'string', describe: 'Machine name' })
        .option('title', { type: 'string', describe: 'Display title' })
        .option('group-id', { type: 'string', describe: 'Owning group id (omit for a personal class)' })
        .option('image-url', { type: 'string', describe: 'Badge image URL' })
        .option('content', { type: 'string', describe: 'Description. Markdown supported.' })
        .option('metadata', { type: 'string', describe: 'Free-form metadata string' })
        .option('badge-type', { type: 'string', describe: 'badge_type value' })
        .option('display', { type: 'string', choices: ['normal', 'hidden', 'pinned'], describe: 'Display mode' })
        .option('transferable', { type: 'boolean', describe: 'Holders may transfer/swap it' })
        .option('revocable', { type: 'boolean', describe: 'Issuer may revoke it' })
        .option('weighted', { type: 'boolean', describe: 'Badges carry a numeric value' })
        .option('encrypted', { type: 'boolean', describe: 'Encrypted badge' })
        .option('can-send-badge', { type: 'string', describe: 'Who may send this badge (policy value, passed through as-is)' })
        .option('permissions', { type: 'string', describe: 'Comma-separated permissions (e.g. "group_member_pass")' })
        .option('fields-json', { type: 'string', describe: 'JSON object merged over the flags above' })
        .example('$0 badge-class create --group-id 3mloe3vkidht3 --name early --title "Early Bird" --transferable false', 'Create a group badge class'),
      handleError(async (argv) => {
        const fields = {
          name: argv.name, title: argv.title, group_id: argv['group-id'],
          image_url: argv['image-url'], content: argv.content, metadata: argv.metadata,
          badge_type: argv['badge-type'], display: argv.display,
          transferable: argv.transferable, revocable: argv.revocable,
          weighted: argv.weighted, encrypted: argv.encrypted,
          can_send_badge: argv['can-send-badge'], permissions: splitList(argv.permissions),
          ...parseJsonOption(argv['fields-json'], 'fields-json'),
        }
        out(await createBadgeClass(fields))
      })
    )
    .command(
      'invites',
      'Unexpired group invites for a badge class\'s group (exposes invitee emails). Requires auth and group update rights.',
      (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Badge class id' }),
      handleError(async (argv) => out(await badgeClassInvites(argv.id)))
    )
    .demandCommand(1, 'Specify a subcommand')
}
