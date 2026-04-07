import { getGroup } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'group <subcommand>'
export const describe = 'Group commands'

export function builder(yargs) {
  return yargs
    .command(
      'get',
      'Get a group by ID or handle',
      (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Group ID or handle' }),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getGroup(argv.id), null, 2))
      })
    )
}

export const handler = () => {}
