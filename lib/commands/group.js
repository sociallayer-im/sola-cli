import { getGroup } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'group <subcommand>'
export const describe = 'Look up Sola groups. No auth required.'

export function builder(yargs) {
  return yargs
    .command(
      'get',
      'Fetch a group by numeric ID or handle. Returns group details including name, description, timezone, membership counts, and tracks.',
      (y) => y
        .option('id', {
          type: 'string',
          demandOption: true,
          describe: 'Numeric group ID or handle string (e.g. 10 or "solaverse")',
        })
        .example('$0 group get --id 10', 'Get group by numeric ID')
        .example('$0 group get --id solaverse', 'Get group by handle'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getGroup(argv.id), null, 2))
      })
    )
}
