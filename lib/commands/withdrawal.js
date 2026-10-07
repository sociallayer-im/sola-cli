import {
  withdrawalGroups, withdrawalBalance, listWithdrawals, createWithdrawal,
  adminListWithdrawals, adminUpdateWithdrawal,
} from '../api-assets.js'
import { handleError } from '../utils.js'

export const command = 'withdrawal <subcommand>'
export const describe = 'WeChat Pay withdrawals of a group\'s pooled revenue. Requires auth; user endpoints 404 unless the deployment has WECHAT_PAY_ENABLED. admin-* need a platform admin.'

const out = (v) => console.log(JSON.stringify(v, null, 2))
const groupOpt = (y) => y.option('group-id', { type: 'string', demandOption: true, describe: 'Group id (you must manage it)' })

export function builder(yargs) {
  return yargs
    .command('groups', 'Groups you manage, with available and withdrawn amounts.', {}, handleError(async () => out(await withdrawalGroups())))
    .command('balance', 'Available and withdrawn amounts for one group.', groupOpt, handleError(async (argv) => out(await withdrawalBalance(argv['group-id']))))
    .command('list', 'Every withdrawal requested against a group\'s pool.', groupOpt, handleError(async (argv) => out(await listWithdrawals(argv['group-id']))))
    .command(
      'create',
      'Request withdrawal of a group\'s ENTIRE available balance (no partial amounts) to a bank account.',
      (y) => groupOpt(y)
        .option('bank-name', { type: 'string', describe: 'Bank name' })
        .option('bank-account-number', { type: 'string', describe: 'Bank account number' })
        .option('bank-account-name', { type: 'string', describe: 'Account holder name' }),
      handleError(async (argv) => {
        out(await createWithdrawal({
          group_id: argv['group-id'], bank_name: argv['bank-name'],
          bank_account_number: argv['bank-account-number'], bank_account_name: argv['bank-account-name'],
        }))
      })
    )
    .command(
      'admin-list',
      'Platform admin only: every withdrawal, paginated.',
      (y) => y
        .option('status', { type: 'string', describe: 'Filter by status (pending, completed, rejected)' })
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' }),
      handleError(async (argv) => out(await adminListWithdrawals({ status: argv.status, page: argv.page, limit: argv.limit })))
    )
    .command(
      'admin-update',
      'Platform admin only: settle or reject a PENDING withdrawal after paying it out by hand.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Withdrawal id' })
        .option('status', { type: 'string', demandOption: true, choices: ['completed', 'rejected'], describe: 'Outcome' })
        .option('note', { type: 'string', describe: 'Note recorded with the decision' }),
      handleError(async (argv) => out(await adminUpdateWithdrawal(argv.id, { status: argv.status, note: argv.note })))
    )
    .demandCommand(1, 'Specify a subcommand')
}
