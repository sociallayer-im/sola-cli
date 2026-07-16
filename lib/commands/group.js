import {
  getGroup, createGroup, updateGroup, listGroupMembers,
  addManager, removeManager, removeMember, leaveGroup,
} from '../api.js'
import { handleError } from '../utils.js'

export const command = 'group <subcommand>'
export const describe = 'Look up and manage Sola groups. create/update/membership changes require auth.'

// Shared editable fields for create/update. Only defined flags are sent.
const groupFieldOptions = (y) => y
  .option('nickname',   { type: 'string', describe: 'Display name of the group (e.g. "SolaVerse")' })
  .option('about',      { type: 'string', describe: 'Description. Markdown supported.' })
  .option('timezone',   { type: 'string', describe: 'IANA timezone (e.g. Asia/Singapore)' })
  .option('location',   { type: 'string', describe: 'Human-readable location (e.g. "Singapore")' })
  .option('website',    { type: 'string', describe: 'Website URL (e.g. https://solaverse.xyz)' })
  .option('image-url',  { type: 'string', describe: 'Logo/avatar image URL' })
  .option('status',     { type: 'string', describe: 'Group status (e.g. normal, freezed)' })
  .option('start-date', { type: 'string', describe: 'Popup-city start date (ISO date, e.g. 2025-06-01)' })
  .option('end-date',   { type: 'string', describe: 'Popup-city end date (ISO date, e.g. 2025-06-30)' })
  .option('twitter',    { type: 'string', describe: 'Twitter/X handle for social_links' })
  .option('github',     { type: 'string', describe: 'GitHub handle for social_links' })
  .option('discord',    { type: 'string', describe: 'Discord handle for social_links' })
  .option('telegram',   { type: 'string', describe: 'Telegram handle for social_links' })

function buildGroupFields(argv) {
  const fields = {
    nickname:   argv.nickname,
    about:      argv.about,
    timezone:   argv.timezone,
    location:   argv.location,
    website:    argv.website,
    image_url:  argv['image-url'],
    status:     argv.status,
    start_date: argv['start-date'],
    end_date:   argv['end-date'],
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
  return fields
}

export function builder(yargs) {
  return yargs
    .command(
      'get',
      'Fetch a group by numeric ID or handle. Returns name, description, timezone, membership counts, and tracks. Pass --detail to also include venues and other detail.',
      (y) => y
        .option('id', {
          type: 'string',
          demandOption: true,
          describe: 'Numeric group ID or handle string (e.g. 10 or "solaverse")',
        })
        .option('detail', {
          type: 'boolean',
          describe: 'Include full detail (venues, tracks, etc.) in the response',
        })
        .example('$0 group get --id 10', 'Get group by numeric ID')
        .example('$0 group get --id solaverse --detail', 'Get group with venues and full detail'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getGroup(argv.id, argv.detail), null, 2))
      })
    )
    .command(
      'create',
      'Create a new group. Requires auth. You become the owner. Returns the created group.',
      (y) => groupFieldOptions(y)
        .option('handle', {
          type: 'string',
          demandOption: true,
          describe: 'Unique handle for the group, lowercase, no spaces (e.g. "solaverse")',
        })
        .example('$0 group create --handle solaverse --nickname "SolaVerse" --timezone Asia/Singapore', 'Create a group'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await createGroup(argv.handle, buildGroupFields(argv)), null, 2))
      })
    )
    .command(
      'update',
      'Update fields on an existing group. Only the fields you pass are changed. Requires auth and manager role.',
      (y) => groupFieldOptions(y)
        .option('id', {
          type: 'string',
          demandOption: true,
          describe: 'Numeric group ID to update (e.g. 10)',
        })
        .example('$0 group update --id 10 --about "Updated description" --website https://sola.day', 'Update group fields'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await updateGroup(argv.id, buildGroupFields(argv)), null, 2))
      })
    )
    .command(
      'members',
      'List a group\'s members with their roles. No auth required.',
      (y) => y
        .option('group', {
          type: 'string',
          demandOption: true,
          describe: 'Numeric group ID or handle (e.g. 10 or "solaverse")',
        })
        .example('$0 group members --group solaverse', 'List members of solaverse'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listGroupMembers(argv.group), null, 2))
      })
    )
    .command(
      'add-manager',
      'Promote a member to manager. Requires auth and manager role.',
      (y) => y
        .option('group',   { type: 'number', demandOption: true, describe: 'Numeric group ID (e.g. 10)' })
        .option('profile', { type: 'number', demandOption: true, describe: 'Numeric profile ID to promote (e.g. 123)' })
        .example('$0 group add-manager --group 10 --profile 123', 'Make profile 123 a manager'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await addManager(argv.group, argv.profile), null, 2))
      })
    )
    .command(
      'remove-manager',
      'Demote a manager back to member. Requires auth and owner role.',
      (y) => y
        .option('group',   { type: 'number', demandOption: true, describe: 'Numeric group ID (e.g. 10)' })
        .option('profile', { type: 'number', demandOption: true, describe: 'Numeric profile ID to demote (e.g. 123)' })
        .example('$0 group remove-manager --group 10 --profile 123', 'Demote profile 123 to member'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await removeManager(argv.group, argv.profile), null, 2))
      })
    )
    .command(
      'remove-member',
      'Remove a member from the group. Requires auth and manager role.',
      (y) => y
        .option('group',   { type: 'number', demandOption: true, describe: 'Numeric group ID (e.g. 10)' })
        .option('profile', { type: 'number', demandOption: true, describe: 'Numeric profile ID to remove (e.g. 123)' })
        .example('$0 group remove-member --group 10 --profile 123', 'Remove profile 123 from the group'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await removeMember(argv.group, argv.profile), null, 2))
      })
    )
    .command(
      'leave',
      'Leave a group yourself. Requires auth. Pass your own profile ID (owners cannot leave).',
      (y) => y
        .option('group',   { type: 'number', demandOption: true, describe: 'Numeric group ID to leave (e.g. 10)' })
        .option('profile', { type: 'number', demandOption: true, describe: 'Your own numeric profile ID (from profile me)' })
        .example('$0 group leave --group 10 --profile 123', 'Leave group 10'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await leaveGroup(argv.group, argv.profile), null, 2))
      })
    )
}
