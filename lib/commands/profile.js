import { getProfileByEmail, getProfileByHandle } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'profile <subcommand>'
export const describe = 'Profile commands'

export function builder(yargs) {
  return yargs
    .command(
      'get-by-email',
      'Get profile by email',
      (y) => y.option('email', { type: 'string', demandOption: true }),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getProfileByEmail(argv.email), null, 2))
      })
    )
    .command(
      'get-by-handle',
      'Get profile by handle',
      (y) => y.option('handle', { type: 'string', demandOption: true }),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getProfileByHandle(argv.handle), null, 2))
      })
    )
}

export const handler = () => {}
