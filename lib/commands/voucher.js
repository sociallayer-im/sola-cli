import {
  listVouchers, getVoucher, createVoucher, sendBadge, getVoucherCode,
  revokeVoucher, useVoucher, rejectVoucherBadge,
} from '../api-assets.js'
import { handleError, splitList } from '../utils.js'

export const command = 'voucher <subcommand>'
export const describe = 'Vouchers: claimable/sendable badge grants. list/get are public; everything else requires auth.'

const out = (v) => console.log(JSON.stringify(v, null, 2))
const idOpt = (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Voucher id' })

// Fields shared by create and the three send-* actions (top-level body keys).
const issueOptions = (y) => y
  .option('badge-class-id', { type: 'string', demandOption: true, describe: 'Badge class to issue from (you need send rights on it)' })
  .option('value', { type: 'string', describe: 'Badge value (weighted classes only)' })
  .option('badge-title', { type: 'string', describe: 'Override the badge title' })
  .option('badge-content', { type: 'string', describe: 'Override the badge content' })
  .option('badge-image', { type: 'string', describe: 'Override the badge image URL' })
  .option('message', { type: 'string', describe: 'Message shown with the voucher' })
  .option('start-time', { type: 'string', describe: 'Badge validity start (ISO 8601)' })
  .option('end-time', { type: 'string', describe: 'Badge validity end (ISO 8601)' })
  .option('expires-at', { type: 'string', describe: 'Voucher expiry (ISO 8601; default 90 days)' })

const issueFields = (argv) => ({
  badge_class_id: argv['badge-class-id'], value: argv.value,
  badge_title: argv['badge-title'], badge_content: argv['badge-content'],
  badge_image: argv['badge-image'], message: argv.message,
  start_time: argv['start-time'], end_time: argv['end-time'], expires_at: argv['expires-at'],
})

const sendCmd = (yargs, name, kind, desc, receiverDesc) => yargs.command(
  name,
  desc,
  (y) => issueOptions(y)
    .option('receivers', { type: 'string', demandOption: true, describe: receiverDesc })
    .example(`$0 voucher ${name} --badge-class-id 3mloe3vkidht3 --receivers alice,bob`, 'One voucher per receiver; all-or-nothing'),
  handleError(async (argv) => {
    out(await sendBadge(kind, { ...issueFields(argv), receivers: splitList(argv.receivers) }))
  })
)

export function builder(yargs) {
  yargs
    .command(
      'list',
      'List active (unexpired, not exhausted) vouchers, paginated. Public.',
      (y) => y
        .option('sender-handle', { type: 'string', describe: 'Vouchers sent by this user handle' })
        .option('group-handle', { type: 'string', describe: 'Vouchers of this group\'s badge classes (ignored if --sender-handle is set)' })
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' }),
      handleError(async (argv) => {
        out(await listVouchers({
          sender_handle: argv['sender-handle'], group_handle: argv['group-handle'],
          page: argv.page, limit: argv.limit,
        }))
      })
    )
    .command('get', 'Fetch a voucher with its badges. Public.', idOpt, handleError(async (argv) => out(await getVoucher(argv.id))))
    .command(
      'create',
      'Mint a code voucher redeemable by anyone holding its code. Requires auth and send rights on the class.',
      (y) => issueOptions(y)
        .option('counter', { type: 'number', describe: 'How many times it can be redeemed (default 65535)' })
        .example('$0 voucher create --badge-class-id 3mloe3vkidht3 --counter 50', 'Voucher good for 50 claims'),
      handleError(async (argv) => out(await createVoucher({ ...issueFields(argv), counter: argv.counter })))
    )
  sendCmd(yargs, 'send-badge', 'send_badge', 'Send the badge to existing users. Requires auth and send rights.', 'Comma-separated receivers: user handle, eth address or email of an existing user')
  sendCmd(yargs, 'send-badge-by-address', 'send_badge_by_address', 'Send the badge to wallet addresses. Requires auth and send rights.', 'Comma-separated 0x wallet addresses')
  sendCmd(yargs, 'send-badge-by-email', 'send_badge_by_email', 'Send the badge to emails (or 0x addresses). Requires auth and send rights.', 'Comma-separated email addresses')
  return yargs
    .command('code', 'Reveal a voucher\'s redeem code. Requires auth and read rights on it.', idOpt, handleError(async (argv) => out(await getVoucherCode(argv.id))))
    .command('revoke', 'Revoke a voucher (sets its counter to 0). Requires auth and update rights.', idOpt, handleError(async (argv) => out(await revokeVoucher(argv.id))))
    .command(
      'use',
      'Redeem a voucher into a badge for the current user. Code vouchers need --code. Requires auth.',
      (y) => idOpt(y)
        .option('code', { type: 'string', describe: 'Redeem code (code-strategy vouchers only)' })
        .option('index', { type: 'string', describe: 'Optional index recorded in the activity payload' }),
      handleError(async (argv) => out(await useVoucher(argv.id, { code: argv.code, index: argv.index })))
    )
    .command('reject-badge', 'Decline a badge voucher addressed to you. Requires auth.', idOpt, handleError(async (argv) => out(await rejectVoucherBadge(argv.id))))
    .demandCommand(1, 'Specify a subcommand')
}
