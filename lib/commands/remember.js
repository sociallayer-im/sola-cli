import {
  rememberMeta, rememberRelatedGroups, createRemember, getRemember,
  joinRemember, cancelRemember, mintRemember,
} from '../api-assets.js'
import { handleError, splitList } from '../utils.js'

export const command = 'remember <subcommand>'
export const describe = 'Remember: a shared commemorative badge minted for people who were together. One creates, others join, the creator mints (needs 2+ joiners).'

const out = (v) => console.log(JSON.stringify(v, null, 2))
const idOpt = (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Remember voucher id' })

export function builder(yargs) {
  return yargs
    .command('meta', 'Show the remember badge class id and joiner threshold. Public.', {}, handleError(async () => out(await rememberMeta())))
    .command(
      'related-groups',
      'Popup-city groups each user attended events in. Public.',
      (y) => y.option('user-ids', { type: 'string', demandOption: true, describe: 'Comma-separated user ids (first 50 used)' }),
      handleError(async (argv) => out(await rememberRelatedGroups(splitList(argv['user-ids']))))
    )
    .command(
      'create',
      'Create a remember voucher (auto-joins you). Requires auth. Get --badge-class-id from `remember meta`.',
      (y) => y
        .option('badge-class-id', { type: 'string', demandOption: true, describe: 'Remember badge class id' })
        .option('message', { type: 'string', describe: 'Message shown on the remember' })
        .option('value', { type: 'string', describe: 'Badge value (weighted classes only)' })
        .option('start-time', { type: 'string', describe: 'ISO 8601 start' })
        .option('end-time', { type: 'string', describe: 'ISO 8601 end' })
        .option('expires-at', { type: 'string', describe: 'ISO 8601 expiry (default 90 days)' }),
      handleError(async (argv) => {
        out(await createRemember({
          badge_class_id: argv['badge-class-id'], message: argv.message, value: argv.value,
          start_time: argv['start-time'], end_time: argv['end-time'], expires_at: argv['expires-at'],
        }))
      })
    )
    .command('get', 'Show who has joined and whether it has been minted. Public.', idOpt, handleError(async (argv) => out(await getRemember(argv.id))))
    .command('join', 'Join a remember (idempotent). Requires auth.', idOpt, handleError(async (argv) => out(await joinRemember(argv.id))))
    .command('cancel', 'Leave a remember before it is minted. Requires auth.', idOpt, handleError(async (argv) => out(await cancelRemember(argv.id))))
    .command('mint', 'Mint one badge per joiner. Creator only, once. Requires auth.', idOpt, handleError(async (argv) => out(await mintRemember(argv.id))))
    .demandCommand(1, 'Specify a subcommand')
}
