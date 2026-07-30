import { discoverHome, search } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'discover <subcommand>'
export const describe = 'Public discovery surfaces: the homepage payload and global search. No auth required — both only ever expose public, published content.'

export function builder(yargs) {
  return yargs
    .command(
      'home',
      'Fetch the homepage payload: featured communities, curated popup cities, and the next public events.',
      (y) => y.example('$0 discover home', 'Fetch featured groups, popup cities, and upcoming events'),
      handleError(async () => {
        console.log(JSON.stringify(await discoverHome(), null, 2))
      })
    )
    .command(
      'search',
      'Global keyword search across events, groups, users, and badge classes. Requires at least 2 characters.',
      (y) => y
        .option('keyword', { type: 'string', demandOption: true, describe: 'Search text (min 2 characters)' })
        .example('$0 discover search --keyword solaverse', 'Search everything for "solaverse"'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await search(argv.keyword), null, 2))
      })
    )
}
