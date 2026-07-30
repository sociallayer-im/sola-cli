import {
  listGroupInvites, pendingInvites, getInvite, sendGroupInvites,
  cancelInvite, revokeInvite, acceptInvite, requestToJoinGroup, acceptJoinRequest,
  sendInviteCode, acceptInviteCode,
} from '../api.js'
import { handleError, splitList } from '../utils.js'

export const command = 'invite <subcommand>'
export const describe = 'Send, accept, and request group invitations. Everything here requires auth — group_invites carry PII (receiver email), so there is no anonymous read.'

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List all invites for a group (pending, accepted, cancelled, ...). Requires auth and manager role.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID' })
        .example('$0 invite list --group 10', 'List invites for group 10'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listGroupInvites(argv.group), null, 2))
      })
    )
    .command(
      'send',
      'Invite people to a group by username, email, or wallet address. Requires auth and manager role. Known users are added directly; unmatched emails receive a real email invite.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID to invite into' })
        .option('receivers', {
          type: 'string',
          demandOption: true,
          describe: 'Comma-separated usernames, emails, or wallet addresses (e.g. "alice,bob@example.com")',
        })
        .option('role', { type: 'string', default: 'member', describe: 'Role to grant: member or manager (default: member)' })
        .option('message', { type: 'string', describe: 'Optional message included in the invitation email' })
        .example('$0 invite send --group 10 --receivers "alice,bob@example.com" --role member', 'Invite two people as members'),
      handleError(async (argv) => {
        const receivers = splitList(argv.receivers)
        console.log(JSON.stringify(await sendGroupInvites(argv.group, receivers, argv.role, argv.message), null, 2))
      })
    )
    .command(
      'pending',
      'List invites pending for your own email address. Requires auth.',
      (y) => y.example('$0 invite pending', 'Show your pending invitations'),
      handleError(async () => {
        console.log(JSON.stringify(await pendingInvites(), null, 2))
      })
    )
    .command(
      'show',
      'Fetch a single invite by id (the invite-preview page). Requires auth.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Invite id' })
        .example('$0 invite show --id 55', 'Show invite 55'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getInvite(argv.id), null, 2))
      })
    )
    .command(
      'accept',
      'Accept an email invite addressed to you. Requires auth — the signed-in user\'s email must match the invite\'s receiver_address.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID the invite belongs to' })
        .option('id', { type: 'string', demandOption: true, describe: 'Invite id (from `invite pending`)' })
        .example('$0 invite accept --group 10 --id 55', 'Accept invitation 55'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await acceptInvite(argv.group, argv.id), null, 2))
      })
    )
    .command(
      'cancel',
      'Cancel a pending invite you sent. Requires auth and manager role.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID' })
        .option('id', { type: 'string', demandOption: true, describe: 'Invite id' })
        .example('$0 invite cancel --group 10 --id 55', 'Cancel invite 55'),
      handleError(async (argv) => {
        await cancelInvite(argv.group, argv.id)
        console.log(JSON.stringify({ result: 'cancelled' }, null, 2))
      })
    )
    .command(
      'revoke',
      'Revoke an already-accepted or outstanding invite. Requires auth and manager role.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID' })
        .option('id', { type: 'string', demandOption: true, describe: 'Invite id' })
        .example('$0 invite revoke --group 10 --id 55', 'Revoke invite 55'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await revokeInvite(argv.group, argv.id), null, 2))
      })
    )
    .command(
      'request',
      'Request to join a group yourself as a member. Requires auth. A manager must approve the request with `invite accept-request`.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID to request to join' })
        .example('$0 invite request --group 10', 'Request to join group 10'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await requestToJoinGroup(argv.group), null, 2))
      })
    )
    .command(
      'accept-request',
      'Approve a pending self-service join request. Requires auth and manager role.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID' })
        .option('id', { type: 'string', demandOption: true, describe: 'The requesting invite\'s id (from `invite list`)' })
        .example('$0 invite accept-request --group 10 --id 55', 'Approve join request 55'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await acceptJoinRequest(argv.group, argv.id), null, 2))
      })
    )
    .command(
      'send-with-code',
      'Generate a reusable invite code — anyone with the code can join via `invite accept-with-code`. Requires auth and manager role.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID' })
        .option('role', { type: 'string', default: 'member', describe: 'Role granted to anyone who redeems the code (default: member)' })
        .option('message', { type: 'string', describe: 'Optional message stored on the invite' })
        .example('$0 invite send-with-code --group 10', 'Generate a reusable member invite code'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await sendInviteCode(argv.group, argv.role, argv.message), null, 2))
      })
    )
    .command(
      'accept-with-code',
      'Join a group using a reusable invite code. Requires auth.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID' })
        .option('code', { type: 'string', demandOption: true, describe: 'The invite code' })
        .example('$0 invite accept-with-code --group 10 --code AB12CD34', 'Join using a code'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await acceptInviteCode(argv.group, argv.code), null, 2))
      })
    )
}
