import {
  getMe, updateProfile, searchProfiles,
  getProfileById, getProfileByEmail, getProfileByHandle, getProfileGroups,
} from '../api.js'
import { handleError } from '../utils.js'

export const command = 'profile <subcommand>'
export const describe = 'Look up and manage Sola user profiles. me/update require auth.'

export function builder(yargs) {
  return yargs
    .command(
      'me',
      'Fetch the currently authenticated profile. Requires auth. Returns the full profile object.',
      (y) => y
        .example('$0 profile me', 'Show your own profile'),
      handleError(async () => {
        console.log(JSON.stringify(await getMe(), null, 2))
      })
    )
    .command(
      'update',
      'Update your own profile. Requires auth. Only the fields you pass are changed.',
      (y) => y
        .option('nickname', { type: 'string', describe: 'Display name (e.g. "Alice Tan")' })
        .option('about',    { type: 'string', describe: 'Bio / about text. Markdown supported.' })
        .option('location', { type: 'string', describe: 'Human-readable location (e.g. "Singapore")' })
        .option('image-url',{ type: 'string', describe: 'Avatar image URL (e.g. https://cdn.example.com/me.jpg)' })
        .option('twitter',  { type: 'string', describe: 'Twitter/X handle for social_links (e.g. "@alice")' })
        .option('github',   { type: 'string', describe: 'GitHub handle for social_links' })
        .option('discord',  { type: 'string', describe: 'Discord handle for social_links' })
        .option('telegram', { type: 'string', describe: 'Telegram handle for social_links' })
        .example('$0 profile update --nickname "Alice" --about "Builder"', 'Update name and bio')
        .example('$0 profile update --twitter "@alice" --github alice', 'Update social links'),
      handleError(async (argv) => {
        const fields = {
          nickname:  argv.nickname,
          about:     argv.about,
          location:  argv.location,
          image_url: argv['image-url'],
        }
        const social = {
          twitter:  argv.twitter,
          github:   argv.github,
          discord:  argv.discord,
          telegram: argv.telegram,
        }
        const socialSet = Object.fromEntries(
          Object.entries(social).filter(([, v]) => v !== undefined)
        )
        if (Object.keys(socialSet).length > 0) fields.social_links = socialSet
        console.log(JSON.stringify(await updateProfile(fields), null, 2))
      })
    )
    .command(
      'search',
      'Search profiles by handle, username, or nickname. No auth required.',
      (y) => y
        .option('keyword', {
          type: 'string',
          demandOption: true,
          describe: 'Search term matched against handle/username/nickname (e.g. "ali")',
        })
        .option('limit', {
          type: 'number',
          describe: 'Max results (1–20, default 5)',
        })
        .example('$0 profile search --keyword ali --limit 10', 'Find up to 10 profiles matching "ali"'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await searchProfiles(argv.keyword, argv.limit), null, 2))
      })
    )
    .command(
      'get-by-id',
      'Fetch a profile by numeric ID. No auth required.',
      (y) => y
        .option('id', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric profile ID (e.g. 123)',
        })
        .example('$0 profile get-by-id --id 123', 'Look up profile 123'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getProfileById(argv.id), null, 2))
      })
    )
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
    .command(
      'groups',
      'List the groups a profile belongs to, by handle. Optionally filter by membership role. No auth required.',
      (y) => y
        .option('handle', {
          type: 'string',
          demandOption: true,
          describe: 'Handle of the profile whose groups to list (e.g. alice)',
        })
        .option('role', {
          type: 'string',
          describe: 'Comma-separated role filter (e.g. "owner,manager"). Omit for all memberships.',
        })
        .example('$0 profile groups --handle alice', 'List all groups alice belongs to')
        .example('$0 profile groups --handle alice --role owner,manager', 'Only groups alice manages'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getProfileGroups(argv.handle, argv.role), null, 2))
      })
    )
}
