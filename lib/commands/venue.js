import { getVenue, listVenues, createVenue, updateVenue } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'venue <subcommand>'
export const describe = 'Get, list, create, and update venues for a group. Create/update require auth.'

function buildVenueFields(argv) {
  return {
    title:    argv.title,
    location: argv.location,
    about:    argv.about,
    capacity: argv.capacity,
    geo_lat:  argv['geo-lat'],
    geo_lng:  argv['geo-lng'],
    tags:     argv.tags,
  }
}

const venueOptions = (y) => y
  .option('title',    { type: 'string', describe: 'Venue name (e.g. "Marina Bay Conference Hall")' })
  .option('location', { type: 'string', describe: 'Human-readable address (e.g. "10 Bayfront Ave, Singapore 018956")' })
  .option('about',    { type: 'string', describe: 'Description of the venue. Markdown supported.' })
  .option('capacity', { type: 'number', describe: 'Maximum number of people the venue can hold (e.g. 200)' })
  .option('geo-lat',  { type: 'number', describe: 'Latitude in decimal degrees (e.g. 1.2836)' })
  .option('geo-lng',  { type: 'number', describe: 'Longitude in decimal degrees (e.g. 103.8607)' })
  .option('tags',     { type: 'string', describe: 'Comma-separated venue tags (e.g. "outdoor,parking,wheelchair")' })

export function builder(yargs) {
  return yargs
    .command(
      'get',
      'Fetch a venue by numeric ID. Returns title, location, capacity, coordinates, timeslots, and availability.',
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
      'List all venues belonging to a group. Requires auth.',
      (y) => y
        .option('group', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric group ID whose venues to list (e.g. 10)',
        })
        .example('$0 venue list --group 10', 'List all venues for group 10'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listVenues(argv.group), null, 2))
      })
    )
    .command(
      'create',
      'Create a new venue for a group. Requires auth and group manager role. Returns the created venue object.',
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
        .example('$0 venue create --group 10 --title "Rooftop Space" --location "21 Tanjong Pagar Rd" --capacity 80', 'Create a venue'),
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
}
