import { getRecurring, createRecurring, updateRecurring, cancelRecurring } from '../api-forms.js'
import { handleError, splitList } from '../utils.js'

export const command = 'recurring <subcommand>'
export const describe = 'Recurring event series: create, show, update, cancel occurrences.'

const out = (v) => console.log(JSON.stringify(v, null, 2))

const eventFields = (y) => y
  .option('title', { type: 'string', describe: 'Event title' })
  .option('content', { type: 'string', describe: 'Event description (Markdown)' })
  .option('timezone', { type: 'string', describe: 'IANA timezone (default: group timezone)' })
  .option('status', { type: 'string', describe: 'Event status' })
  .option('visibility', { type: 'string', describe: 'Event visibility' })
  .option('place', { type: 'string', describe: 'Place id' })
  .option('track', { type: 'string', describe: 'Track id' })
  .option('meeting-url', { type: 'string', describe: 'Online meeting URL' })
  .option('external-url', { type: 'string', describe: 'External URL' })
  .option('max-participant', { type: 'number', describe: 'Participant cap' })
  .option('require-approval', { type: 'boolean', describe: 'Require approval to join' })
  .option('category', { type: 'string', describe: 'Category' })
  .option('kind', { type: 'string', describe: 'Kind' })
  .option('image-url', { type: 'string', describe: 'Cover image URL' })
  .option('image-note', { type: 'string', describe: 'Cover image note' })
  .option('tags', { type: 'string', describe: 'Comma-separated tags' })
  .option('requirement-tags', { type: 'string', describe: 'Comma-separated requirement tags' })
  .option('venue', { type: 'string', describe: 'Venue id (every occurrence is availability-checked)' })

const eventBody = (argv) => ({
  title: argv.title,
  content: argv.content,
  timezone: argv.timezone,
  status: argv.status,
  visibility: argv.visibility,
  place_id: argv.place,
  track_id: argv.track,
  meeting_url: argv['meeting-url'],
  external_url: argv['external-url'],
  max_participant: argv['max-participant'],
  require_approval: argv['require-approval'],
  category: argv.category,
  kind: argv.kind,
  image_url: argv['image-url'],
  image_note: argv['image-note'],
  tags: splitList(argv.tags),
  requirement_tags: splitList(argv['requirement-tags']),
  venue_id: argv.venue,
})

export function builder(yargs) {
  return yargs
    .command(
      'show',
      'Show a series and its (visible) occurrences. Public.',
      (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Recurring id' }),
      handleError(async (argv) => out(await getRecurring(argv.id)))
    )
    .command(
      'create',
      'Create a series with one event per occurrence, atomically. Requires auth and permission to create events in the group.',
      (y) => eventFields(y)
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID (raw id, not slug)' })
        .option('interval', { type: 'string', demandOption: true, choices: ['day', 'week', 'month'], describe: 'Repeat interval' })
        .option('event-count', { type: 'number', demandOption: true, describe: 'Number of occurrences' })
        .option('start-time', { type: 'string', demandOption: true, describe: 'First start, e.g. "2026-07-16 18:00" (interpreted in --timezone)' })
        .option('end-time', { type: 'string', demandOption: true, describe: 'First end (same format)' })
        .example('$0 recurring create --group 3m... --title Standup --interval week --event-count 8 --start-time "2026-10-12 10:00" --end-time "2026-10-12 11:00" --timezone Asia/Shanghai', 'Weekly series'),
      handleError(async (argv) => out(await createRecurring({
        ...eventBody(argv),
        group_id: argv.group,
        interval: argv.interval,
        event_count: argv['event-count'],
        start_time: argv['start-time'],
        end_time: argv['end-time'],
      })))
    )
    .command(
      'update',
      'Update occurrences in a series. Shifts are in seconds per occurrence. Requires auth and event edit rights.',
      (y) => eventFields(y)
        .option('id', { type: 'string', demandOption: true, describe: 'Recurring id' })
        .option('selector', { type: 'string', choices: ['all', 'after'], describe: '"after" limits to --after-event onward; default whole series' })
        .option('after-event', { type: 'string', describe: 'Pivot event id for --selector after' })
        .option('start-time-diff', { type: 'number', describe: 'Seconds to shift each start' })
        .option('end-time-diff', { type: 'number', describe: 'Seconds to shift each end' }),
      handleError(async (argv) => out(await updateRecurring(argv.id, {
        ...eventBody(argv),
        selector: argv.selector,
        after_event_id: argv['after-event'],
        start_time_diff: argv['start-time-diff'],
        end_time_diff: argv['end-time-diff'],
      })))
    )
    .command(
      'cancel',
      'Soft-cancel occurrences (status becomes cancelled; nothing is deleted). Requires auth and event edit rights.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Recurring id' })
        .option('selector', { type: 'string', choices: ['all', 'after'], describe: '"after" cancels --event onward; default whole series' })
        .option('event', { type: 'string', describe: 'Pivot event id for --selector after' }),
      handleError(async (argv) => out(await cancelRecurring(argv.id, {
        selector: argv.selector,
        event_id: argv.event,
      })))
    )
}
