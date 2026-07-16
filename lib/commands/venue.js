import {
  getVenue, listVenues, createVenue, updateVenue,
  removeVenue, checkVenueAvailability,
} from '../api.js'
import { handleError } from '../utils.js'

export const command = 'venue <subcommand>'
export const describe = 'Get, list, create, update, and remove venues for a group. Write actions require auth.'

function splitList(v) {
  return v === undefined ? undefined : v.split(',').map((s) => s.trim()).filter(Boolean)
}

function buildVenueFields(argv) {
  return {
    title:            argv.title,
    about:            argv.about,
    link:             argv.link,
    capacity:         argv.capacity,
    require_approval: argv['require-approval'],
    visibility:       argv.visibility,
    start_date:       argv['start-date'],
    end_date:         argv['end-date'],
    place_id:         argv['place-id'],
    tags:             splitList(argv.tags),
    amenities:        splitList(argv.amenities),
  }
}

// Note: venue location/coordinates are set through a Place record via --place-id
// (create one with `place/create`), not as free-text fields on the venue.
const venueOptions = (y) => y
  .option('title',            { type: 'string',  describe: 'Venue name (e.g. "Marina Bay Conference Hall")' })
  .option('about',            { type: 'string',  describe: 'Description of the venue. Markdown supported.' })
  .option('link',             { type: 'string',  describe: 'External link for the venue (e.g. a booking page URL)' })
  .option('capacity',         { type: 'number',  describe: 'Maximum number of people the venue can hold (e.g. 200)' })
  .option('require-approval', { type: 'boolean', describe: 'If true, bookings require organizer approval' })
  .option('visibility',       { type: 'string',  describe: 'Visibility (e.g. "all", "none")' })
  .option('start-date',       { type: 'string',  describe: 'Availability start date (ISO date, e.g. 2025-06-01)' })
  .option('end-date',         { type: 'string',  describe: 'Availability end date (ISO date, e.g. 2025-06-30)' })
  .option('place-id',         { type: 'number',  describe: 'ID of a Place providing the venue location/coordinates' })
  .option('tags',             { type: 'string',  describe: 'Comma-separated venue tags (e.g. "outdoor,parking")' })
  .option('amenities',        { type: 'string',  describe: 'Comma-separated amenities (e.g. "wifi,projector,stage")' })

export function builder(yargs) {
  return yargs
    .command(
      'get',
      'Fetch a venue by numeric ID. Returns title, capacity, place/location, timeslots, and availability.',
      (y) => y
        .option('id', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric venue ID (e.g. 7)',
        })
        .example('$0 venue get --id 7', 'Get venue with ID 7'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getVenue(argv.id), null, 2))
      })
    )
    .command(
      'list',
      'List all venues belonging to a group. Fetched via the group detail view. No auth required.',
      (y) => y
        .option('group', {
          type: 'string',
          demandOption: true,
          describe: 'Numeric group ID or handle whose venues to list (e.g. 10 or "solaverse")',
        })
        .example('$0 venue list --group 10', 'List all venues for group 10'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listVenues(argv.group), null, 2))
      })
    )
    .command(
      'create',
      'Create a new venue for a group. Requires auth and group manager role. Returns the created venue.',
      (y) => venueOptions(y)
        .option('group', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric ID of the group that owns this venue (e.g. 10)',
        })
        .option('title', {
          type: 'string',
          demandOption: true,
          describe: 'Venue name (e.g. "Main Conference Hall")',
        })
        .example('$0 venue create --group 10 --title "Rooftop Space" --capacity 80 --tags "outdoor,rooftop"', 'Create a venue'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await createVenue(argv.group, buildVenueFields(argv)), null, 2))
      })
    )
    .command(
      'update',
      'Update fields on an existing venue. Only the fields you pass are changed. Requires auth and group manager role.',
      (y) => venueOptions(y)
        .option('id', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric ID of the venue to update (e.g. 7)',
        })
        .example('$0 venue update --id 7 --capacity 150 --tags "indoor,av-equipment"', 'Update capacity and tags'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await updateVenue(argv.id, buildVenueFields(argv)), null, 2))
      })
    )
    .command(
      'remove',
      'Remove (soft-delete) a venue. Requires auth and group manager role.',
      (y) => y
        .option('id', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric ID of the venue to remove (e.g. 7)',
        })
        .example('$0 venue remove --id 7', 'Remove venue 7'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await removeVenue(argv.id), null, 2))
      })
    )
    .command(
      'check-availability',
      'Check whether a venue is free for a given time window. No auth required.',
      (y) => y
        .option('id', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric venue ID (e.g. 7)',
        })
        .option('start', {
          type: 'string',
          demandOption: true,
          describe: 'ISO 8601 start datetime (e.g. "2025-06-15T09:00:00")',
        })
        .option('end', {
          type: 'string',
          demandOption: true,
          describe: 'ISO 8601 end datetime (e.g. "2025-06-15T11:00:00")',
        })
        .option('timezone', {
          type: 'string',
          describe: 'IANA timezone for interpreting the times (e.g. Asia/Singapore)',
        })
        .example('$0 venue check-availability --id 7 --start "2025-06-15T09:00:00" --end "2025-06-15T11:00:00" --timezone Asia/Singapore', 'Check if venue 7 is free'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await checkVenueAvailability(argv.id, argv.start, argv.end, argv.timezone), null, 2))
      })
    )
}
