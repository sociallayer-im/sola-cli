import {
  getVenue, listVenues, createVenue, updateVenue,
  removeVenue, venueConflict, setVenueAvailability,
} from '../api.js'
import { handleError, splitList, parseJsonOption } from '../utils.js'

export const command = 'venue <subcommand>'
export const describe = 'Get, list, create, update, and remove venues. `get` is public; list and all writes require auth.'

function buildVenueFields(argv) {
  return {
    name:               argv.name,
    about:              argv.about,
    website:            argv.website,
    capacity:           argv.capacity,
    require_approval:   argv['require-approval'],
    featured_image_url: argv['featured-image-url'],
    start_date:         argv['start-date'],
    end_date:           argv['end-date'],
    place_id:           argv['place-id'],
    tags:               splitList(argv.tags),
    amenities:          splitList(argv.amenities),
    image_urls:         splitList(argv['image-urls']),
    track_ids:          splitList(argv['track-ids']),
  }
}

// Venue location comes from a Place record via --place-id (create one with
// `sola place create`), not free-text fields.
const venueOptions = (y) => y
  .option('name',              { type: 'string',  describe: 'Venue name (e.g. "Marina Bay Conference Hall")' })
  .option('about',             { type: 'string',  describe: 'Description. Markdown supported.' })
  .option('website',           { type: 'string',  describe: 'External link for the venue (e.g. a booking page URL)' })
  .option('capacity',          { type: 'number',  describe: 'Maximum number of people the venue can hold' })
  .option('require-approval',  { type: 'boolean', describe: 'If true, bookings require organizer approval' })
  .option('featured-image-url',{ type: 'string',  describe: 'Cover image URL' })
  .option('start-date',        { type: 'string',  describe: 'Availability window start date (ISO date)' })
  .option('end-date',          { type: 'string',  describe: 'Availability window end date (ISO date)' })
  .option('place-id',          { type: 'string',  describe: 'Place id providing the venue location/coordinates' })
  .option('tags',              { type: 'string',  describe: 'Comma-separated venue tags (e.g. "outdoor,parking")' })
  .option('amenities',         { type: 'string',  describe: 'Comma-separated amenities (e.g. "wifi,projector,stage")' })
  .option('image-urls',        { type: 'string',  describe: 'Comma-separated gallery image URLs' })
  .option('track-ids',         { type: 'string',  describe: 'Comma-separated track ids this venue is associated with' })

export function builder(yargs) {
  return yargs
    .command(
      'get',
      'Fetch a venue by id, including its availability rules. No auth required.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Venue id' })
        .example('$0 venue get --id 7', 'Get venue 7'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getVenue(argv.id), null, 2))
      })
    )
    .command(
      'list',
      'List non-archived venues, optionally scoped to a group. Requires auth.',
      (y) => y
        .option('group', { type: 'string', describe: 'Group TSID or slug to scope to' })
        .option('limit', { type: 'number', describe: 'Max per page (default 20, hard cap 500)' })
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .example('$0 venue list --group solaverse', 'List venues for solaverse'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listVenues(argv.group, { limit: argv.limit, page: argv.page }), null, 2))
      })
    )
    .command(
      'create',
      'Create a new venue for a group. Requires auth and group manager role.',
      (y) => venueOptions(y)
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID that owns this venue' })
        .option('name', { type: 'string', demandOption: true, describe: 'Venue name' })
        .example('$0 venue create --group 10 --name "Rooftop Space" --capacity 80 --tags "outdoor,rooftop"', 'Create a venue'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await createVenue({ group_id: argv.group, ...buildVenueFields(argv) }), null, 2))
      })
    )
    .command(
      'update',
      'Update fields on an existing venue. Only the fields you pass are changed. Requires auth and group manager role.',
      (y) => venueOptions(y)
        .option('id', { type: 'string', demandOption: true, describe: 'Venue id to update' })
        .example('$0 venue update --id 7 --capacity 150 --tags "indoor,av-equipment"', 'Update capacity and tags'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await updateVenue(argv.id, buildVenueFields(argv)), null, 2))
      })
    )
    .command(
      'remove',
      'Archive (soft-delete) a venue — existing events keep referencing it. Requires auth and group manager role.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Venue id to remove' })
        .example('$0 venue remove --id 7', 'Remove venue 7'),
      handleError(async (argv) => {
        await removeVenue(argv.id)
        console.log(JSON.stringify({ result: 'archived' }, null, 2))
      })
    )
    .command(
      'conflict',
      'Find the first event that would clash with a given time window — the check an event editor runs before submitting. Requires auth.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Venue id' })
        .option('start', { type: 'string', demandOption: true, describe: 'ISO 8601 start datetime' })
        .option('end', { type: 'string', demandOption: true, describe: 'ISO 8601 end datetime' })
        .option('exclude-event', { type: 'string', describe: 'Event TSID to exclude from the check (when editing an existing booking)' })
        .example('$0 venue conflict --id 7 --start "2026-06-15T09:00:00" --end "2026-06-15T11:00:00"', 'Check for a clash'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await venueConflict(argv.id, {
          startTime: argv.start, endTime: argv.end, excludeEventId: argv['exclude-event'],
        }), null, 2))
      })
    )
    .command(
      'set-availability',
      'Replace a venue\'s whole availability set. Requires auth and group manager role. Empty intervals means closed that slot; passing no availabilities at all makes the venue open 24/7.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Venue id' })
        .option('availabilities-json', {
          type: 'string',
          demandOption: true,
          describe: 'JSON array of {day_of_week, day, intervals: [["HH:MM","HH:MM"]], role_required}. day_of_week is a weekly slot (0=Sunday); day is a specific-date override and takes priority.',
        })
        .example(
          '$0 venue set-availability --id 7 --availabilities-json \'[{"day_of_week":1,"intervals":[["09:00","18:00"]]}]\'',
          'Open every Monday 9am-6pm, closed all other days'
        ),
      handleError(async (argv) => {
        const availabilities = parseJsonOption(argv['availabilities-json'], 'availabilities-json')
        console.log(JSON.stringify(await setVenueAvailability(argv.id, availabilities), null, 2))
      })
    )
}
