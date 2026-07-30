import { listPlaces, getPlace, searchPlaces, createPlace } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'place <subcommand>'
export const describe = 'Look up and create Places — every location-bearing write (events, venues, markers) resolves its location to a place_id through here first. Requires auth.'

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List every place. Requires auth.',
      (y) => y.example('$0 place list', 'List all places'),
      handleError(async () => {
        console.log(JSON.stringify(await listPlaces(), null, 2))
      })
    )
    .command(
      'get',
      'Fetch a place by id. Requires auth.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Place id' })
        .example('$0 place get --id 42', 'Get place 42'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getPlace(argv.id), null, 2))
      })
    )
    .command(
      'search',
      'Typeahead search over place name/address. Requires auth.',
      (y) => y
        .option('query', { type: 'string', demandOption: true, describe: 'Search text' })
        .example('$0 place search --query "Marina Bay"', 'Find places matching "Marina Bay"'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await searchPlaces(argv.query), null, 2))
      })
    )
    .command(
      'create',
      'Find-or-create a place by name. Requires auth. An existing name returns the existing record instead of erroring — safe to call repeatedly for the same location.',
      (y) => y
        .option('name', { type: 'string', demandOption: true, describe: 'Place name (e.g. "Marina Bay Sands")' })
        .option('address', { type: 'string', describe: 'Street address' })
        .option('latitude', { type: 'number', describe: 'Latitude' })
        .option('longitude', { type: 'number', describe: 'Longitude' })
        .option('description', { type: 'string', describe: 'Free-text description' })
        .example('$0 place create --name "Marina Bay Sands" --address "10 Bayfront Ave" --latitude 1.2834 --longitude 103.8607', 'Create or reuse a place'),
      handleError(async (argv) => {
        const fields = {
          name: argv.name,
          address: argv.address,
          latitude: argv.latitude,
          longitude: argv.longitude,
          description: argv.description,
        }
        console.log(JSON.stringify(await createPlace(fields), null, 2))
      })
    )
}
