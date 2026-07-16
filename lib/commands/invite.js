import { sendInvite, acceptInvite, requestInvite, myPendingInvites } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'invite <subcommand>'
export const describe = 'Send, accept, and request group invitations. All require auth.'

export function builder(yargs) {
  return yargs
    .command(
      'send',
      'Invite people to a group by handle, email, or wallet address. Requires auth and manager role. Known profiles are added directly; unknown emails receive an email invite.',
      (y) => y
        .option('group', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric group ID to invite into (e.g. 10)',
        })
        .option('receivers', {
          type: 'string',
          demandOption: true,
          describe: 'Comma-separated handles, emails, or addresses (e.g. "alice,bob@example.com")',
        })
        .option('role', {
          type: 'string',
          demandOption: true,
          describe: 'Role to grant: "member" or "manager"',
        })
        .option('message', {
          type: 'string',
          describe: 'Optional message included in the invitation',
        })
        .example('$0 invite send --group 10 --receivers "alice,bob@example.com" --role member', 'Invite two people as members'),
      handleError(async (argv) => {
        const receivers = argv.receivers.split(',').map((s) => s.trim()).filter(Boolean)
        console.log(JSON.stringify(await sendInvite(argv.group, receivers, argv.role, argv.message), null, 2))
      })
    )
    .command(
      'accept',
      'Accept a group invitation addressed to you. Requires auth.',
      (y) => y
        .option('id', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric group_invite ID to accept (from invite mine)',
        })
        .example('$0 invite accept --id 55', 'Accept invitation 55'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await acceptInvite(argv.id), null, 2))
      })
    )
    .command(
      'request',
      'Request to join a group yourself. Requires auth. A manager must approve the request.',
      (y) => y
        .option('group', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric group ID to request to join (e.g. 10)',
        })
        .option('role', {
          type: 'string',
          demandOption: true,
          describe: 'Role you are requesting: "member" or "manager"',
        })
        .option('message', {
          type: 'string',
          describe: 'Optional message to the group managers',
        })
        .example('$0 invite request --group 10 --role member --message "Would love to join"', 'Request to join group 10'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await requestInvite(argv.group, argv.role, argv.message), null, 2))
      })
    )
    .command(
      'mine',
      'List pending group invitations addressed to your email. Requires auth.',
      (y) => y
        .example('$0 invite mine', 'Show your pending invitations'),
      handleError(async () => {
        console.log(JSON.stringify(await myPendingInvites(), null, 2))
      })
    )
}
