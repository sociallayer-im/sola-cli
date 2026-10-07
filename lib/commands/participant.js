import {
  listParticipants, joinEvent, updateParticipant, cancelParticipant,
  approveParticipant, rejectParticipant, checkInParticipant, getMe,
} from '../api.js'
import { handleError, parseJsonOption } from '../utils.js'

export const command = 'participant <subcommand>'
export const describe = 'Manage event participation (was folded into `event` in the old CLI). `list` is public (like the event itself); every other action requires auth.'

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List an event\'s active (non-cancelled) participants, each with a participant record id (needed by update/cancel/approve/reject). No auth required, but the event must be visible to you.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('limit', { type: 'number', describe: 'Max per page (default 20, hard cap 500)' })
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .example('$0 participant list --event 0GA2...', 'List participants'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listParticipants(argv.event, { limit: argv.limit, page: argv.page }), null, 2))
      })
    )
    .command(
      'join',
      'RSVP / join an event directly (no ticket). Requires auth. Ends up "pending" instead of "attending" if the event requires approval or has a required form and you\'re not a manager.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID to join' })
        .option('form-answers-json', { type: 'string', describe: 'JSON array of {field_id, value}, required only if the event has a required form' })
        .example('$0 participant join --event 0GA2...', 'Join an event'),
      handleError(async (argv) => {
        const formAnswers = parseJsonOption(argv['form-answers-json'], 'form-answers-json')
        console.log(JSON.stringify(await joinEvent(argv.event, formAnswers), null, 2))
      })
    )
    .command(
      'update',
      'Change your own participation status (e.g. to "maybe" or "cancelled"). Requires auth — only your own participant record. Find --id via `participant list`.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('id', { type: 'string', demandOption: true, describe: 'Your participant record id' })
        .option('status', { type: 'string', demandOption: true, choices: ['attending', 'maybe', 'declined', 'cancelled', 'pending'], describe: 'New status; must be a legal transition (e.g. attending -> maybe/cancelled; cancelled -> attending/pending/maybe). Joining a full event is rejected.' })
        .example('$0 participant update --event 0GA2... --id 9001 --status cancelled', 'Cancel your own RSVP'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await updateParticipant(argv.event, argv.id, argv.status), null, 2))
      })
    )
    .command(
      'cancel',
      'Cancel your own RSVP — a convenience that looks up your own participant record and withdraws it (soft delete; also cancels unpaid orders). Requires auth.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .example('$0 participant cancel --event 0GA2...', 'Cancel your own RSVP'),
      handleError(async (argv) => {
        const me = await getMe()
        // The list is paginated (default 20) — walk every page so a large
        // event can't hide your own row.
        let own, page = 1
        while (!own && page) {
          const res = await listParticipants(argv.event, { limit: 500, page })
          own = res.data.find((p) => p.user?.id === me.id)
          page = res.meta?.next_page
        }
        if (!own) throw new Error('You are not a participant of this event')
        await cancelParticipant(argv.event, own.id)
        console.log(JSON.stringify({ result: 'cancelled' }, null, 2))
      })
    )
    .command(
      'approve',
      'Approve a pending (approval-required) participant. Requires auth and event ownership or group manager role. Find --id via `participant list`.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('id', { type: 'string', demandOption: true, describe: 'Participant record id' })
        .example('$0 participant approve --event 0GA2... --id 9001', 'Approve participant 9001'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await approveParticipant(argv.event, argv.id), null, 2))
      })
    )
    .command(
      'reject',
      'Decline a pending participant. Requires auth and event ownership or group manager role.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('id', { type: 'string', demandOption: true, describe: 'Participant record id' })
        .example('$0 participant reject --event 0GA2... --id 9001', 'Reject participant 9001'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await rejectParticipant(argv.event, argv.id), null, 2))
      })
    )
    .command(
      'check-in',
      'Stamp an attendee as checked in at the door. Requires auth and event ownership or an editor role/group manager. Idempotent; the user must be an active participant.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('user', { type: 'string', demandOption: true, describe: 'User TSID to check in' })
        .example('$0 participant check-in --event 0GA2... --user 0GB3...', 'Check in a user'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await checkInParticipant(argv.event, argv.user), null, 2))
      })
    )
}
