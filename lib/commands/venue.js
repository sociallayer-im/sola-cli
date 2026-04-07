import { getVenue, listVenues, createVenue, updateVenue } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'venue <subcommand>'
export const describe = 'Venue commands'

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
  .option('title',    { type: 'string' })
  .option('location', { type: 'string' })
  .option('about',    { type: 'string' })
  .option('capacity', { type: 'number' })
  .option('geo-lat',  { type: 'number' })
  .option('geo-lng',  { type: 'number' })
  .option('tags',     { type: 'string' })

export function builder(yargs) {
  return yargs
    .command(
      'get',
      'Get a venue by ID',
      (y) => y.option('id', { type: 'number', demandOption: true }),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getVenue(argv.id), null, 2))
      })
    )
    .command(
      'list',
      'List venues for a group',
      (y) => y.option('group', { type: 'number', demandOption: true }),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listVenues(argv.group), null, 2))
      })
    )
    .command(
      'create',
      'Create a venue',
      (y) => venueOptions(y)
        .option('group', { type: 'number', demandOption: true })
        .option('title', { type: 'string', demandOption: true }),
      handleError(async (argv) => {
        console.log(JSON.stringify(await createVenue(argv.group, buildVenueFields(argv)), null, 2))
      })
    )
    .command(
      'update',
      'Update a venue',
      (y) => venueOptions(y)
        .option('id', { type: 'number', demandOption: true }),
      handleError(async (argv) => {
        console.log(JSON.stringify(await updateVenue(argv.id, buildVenueFields(argv)), null, 2))
      })
    )
}

export const handler = () => {}
