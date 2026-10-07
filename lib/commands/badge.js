import {
  listBadges, getBadge, updateBadge, transferBadge, burnBadge, swapBadge, badgeSwapCode,
} from '../api-assets.js'
import { handleError } from '../utils.js'

export const command = 'badge <subcommand>'
export const describe = 'Browse and manage issued badges. list/get are public (minted badges only); the rest require auth and ownership.'

const out = (v) => console.log(JSON.stringify(v, null, 2))
const idOpt = (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Badge id' })

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List minted badges, paginated. Public. --owned/--created only take effect together with --user-id.',
      (y) => y
        .option('user-id', { type: 'string', describe: 'User id to scope --owned / --created to' })
        .option('owned', { type: 'boolean', describe: 'With --user-id: badges that user owns' })
        .option('created', { type: 'boolean', describe: 'With --user-id: badges that user created' })
        .option('owner-handle', { type: 'string', describe: 'Badges owned by the user with this handle' })
        .option('badge-class-id', { type: 'string', describe: 'Only badges of this class' })
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' })
        .example('$0 badge list --owner-handle alice', 'Badges alice holds'),
      handleError(async (argv) => {
        out(await listBadges({
          user_id: argv['user-id'],
          // The server tests presence of these keys, so only send when true.
          owned_badges: argv.owned ? true : undefined,
          created_badges: argv.created ? true : undefined,
          owner_handle: argv['owner-handle'], badge_class_id: argv['badge-class-id'],
          page: argv.page, limit: argv.limit,
        }))
      })
    )
    .command('get', 'Fetch a badge by id. Public.', idOpt, handleError(async (argv) => out(await getBadge(argv.id))))
    .command(
      'update',
      'Set how a badge is displayed on your profile. Requires auth (owner).',
      (y) => idOpt(y).option('display', { type: 'string', demandOption: true, choices: ['normal', 'hidden', 'pinned'], describe: 'Display mode' }),
      handleError(async (argv) => out(await updateBadge(argv.id, argv.display)))
    )
    .command(
      'transfer',
      'Give a badge to another user by handle. Badge class must be transferable. Requires auth (owner).',
      (y) => idOpt(y).option('target', { type: 'string', demandOption: true, describe: 'Recipient user handle (name)' }),
      handleError(async (argv) => out(await transferBadge(argv.id, argv.target)))
    )
    .command(
      'burn',
      'Burn a minted badge. Irreversible. Requires auth (owner).',
      idOpt,
      handleError(async (argv) => out(await burnBadge(argv.id)))
    )
    .command(
      'swap-code',
      'Generate a swap token for one of your badges to hand to another holder. Requires auth (owner).',
      idOpt,
      handleError(async (argv) => out(await badgeSwapCode(argv.id)))
    )
    .command(
      'swap',
      'Swap one of your badges for the badge behind a swap token. Both must be transferable. Requires auth (owner).',
      (y) => idOpt(y).option('swap-token', { type: 'string', demandOption: true, describe: 'Token from `badge swap-code` run by the other holder' }),
      handleError(async (argv) => out(await swapBadge(argv.id, argv['swap-token'])))
    )
    .demandCommand(1, 'Specify a subcommand')
}
