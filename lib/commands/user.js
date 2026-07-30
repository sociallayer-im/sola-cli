import { getUser, getMe, updateUser, getUserGroups } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'user <subcommand>'
export const describe = 'Look up and manage Sola users (soon\'s User model — sails called this "profile"). me/update require auth.'

export function builder(yargs) {
  return yargs
    .command(
      'me',
      'Fetch the currently authenticated user. Requires auth. Includes private fields (email, permissions) that public lookups never see.',
      (y) => y.example('$0 user me', 'Show your own user record'),
      handleError(async () => {
        console.log(JSON.stringify(await getMe(), null, 2))
      })
    )
    .command(
      'get',
      'Fetch a user by TSID or username. No auth required (looking up your own id returns the same private fields as `user me`, if signed in).',
      (y) => y
        .option('id', {
          type: 'string',
          demandOption: true,
          describe: 'User TSID or username (e.g. "alice")',
        })
        .example('$0 user get --id alice', 'Look up user "alice"'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getUser(argv.id), null, 2))
      })
    )
    .command(
      'update',
      'Update your own user record. Requires auth. Only the fields you pass are changed. Email is not updatable here — it\'s the login identity.',
      (y) => y
        .option('name', { type: 'string', describe: 'Unique username/handle, lowercase letters/digits/underscores only (e.g. "alice"). Cannot be blanked out once set.' })
        .option('nickname', { type: 'string', describe: 'Display name (e.g. "Alice Tan")' })
        .option('bio', { type: 'string', describe: 'Bio / about text. Markdown supported.' })
        .option('image-url', { type: 'string', describe: 'Avatar image URL (e.g. https://cdn.example.com/me.jpg)' })
        .example('$0 user update --name alice --nickname "Alice"', 'Set your username and display name')
        .example('$0 user update --bio "Builder"', 'Update just your bio'),
      handleError(async (argv) => {
        const fields = {
          name: argv.name,
          nickname: argv.nickname,
          bio: argv.bio,
          image_url: argv['image-url'],
        }
        console.log(JSON.stringify(await updateUser(fields), null, 2))
      })
    )
    .command(
      'groups',
      'List the groups a user belongs to. Optionally filter by membership role. No auth required.',
      (y) => y
        .option('id', {
          type: 'string',
          demandOption: true,
          describe: 'User TSID or username whose groups to list (e.g. "alice")',
        })
        .option('role', {
          type: 'string',
          describe: 'Comma-separated role filter (e.g. "owner,manager"). Omit for all memberships.',
        })
        .example('$0 user groups --id alice', 'List all groups alice belongs to')
        .example('$0 user groups --id alice --role owner,manager', 'Only groups alice manages'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getUserGroups(argv.id, argv.role), null, 2))
      })
    )
}
