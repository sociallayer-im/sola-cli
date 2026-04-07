import { getProfileByEmail, getProfileByHandle } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'profile <subcommand>'
export const describe = 'Look up Sola user profiles. No auth required.'

export function builder(yargs) {
  return yargs
    .command(
      'get-by-email',
      'Fetch a profile by registered email address. Returns id, handle, nickname, image_url, social_links.',
      (y) => y
        .option('email', {
          type: 'string',
          demandOption: true,
          describe: 'Registered email address of the profile to look up (e.g. user@example.com)',
        })
        .example('$0 profile get-by-email --email user@example.com', 'Look up a profile by email'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getProfileByEmail(argv.email), null, 2))
      })
    )
    .command(
      'get-by-handle',
      'Fetch a profile by handle. Returns id, handle, nickname, image_url, social_links.',
      (y) => y
        .option('handle', {
          type: 'string',
          demandOption: true,
          describe: 'Public handle of the profile to look up (e.g. alice)',
        })
        .example('$0 profile get-by-handle --handle alice', 'Look up profile "alice"'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getProfileByHandle(argv.handle), null, 2))
      })
    )
}
