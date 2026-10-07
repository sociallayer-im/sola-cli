import { listTracks, getTrack, createTrack, updateTrack, removeTrack } from '../api.js'
import { handleError, splitList } from '../utils.js'

export const command = 'track <subcommand>'
export const describe = 'Get, list, create, update, and remove tracks (event programs/series within a group). Reads are public; writes require auth and group manager role.'

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List tracks, optionally scoped to a group. No auth required.',
      (y) => y
        .option('group', { type: 'string', describe: 'Group TSID or slug to scope to' })
        .option('limit', { type: 'number', describe: 'Max per page (default 20, hard cap 500)' })
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .example('$0 track list --group solaverse', 'List tracks for solaverse'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listTracks(argv.group, { limit: argv.limit, page: argv.page }), null, 2))
      })
    )
    .command(
      'get',
      'Fetch a single track by id, including its admin roles. No auth required.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Track id' })
        .example('$0 track get --id 12', 'Get track 12'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getTrack(argv.id), null, 2))
      })
    )
    .command(
      'create',
      'Create a new track in a group. Requires auth and group manager role. `name` (the unique slug) is auto-generated from the title if omitted.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID that owns this track' })
        .option('title', { type: 'string', demandOption: true, describe: 'Track title' })
        .option('name', { type: 'string', describe: 'Unique slug for the track (globally unique; auto-generated as <group>-<title> if omitted)' })
        .option('description', { type: 'string', describe: 'Description. Markdown supported.' })
        .option('image-url', { type: 'string', describe: 'Cover image URL' })
        .option('is-private', { type: 'boolean', describe: 'Restrict visibility to track admins/members' })
        .option('start-date', { type: 'string', describe: 'ISO date' })
        .option('end-date', { type: 'string', describe: 'ISO date' })
        .option('manager-ids', { type: 'string', describe: 'Comma-separated user TSIDs to set as track admins' })
        .example('$0 track create --group 10 --title "Workshops"', 'Create a track'),
      handleError(async (argv) => {
        const fields = {
          group_id: argv.group,
          name: argv.name,
          title: argv.title,
          description: argv.description,
          image_url: argv['image-url'],
          is_private: argv['is-private'],
          start_date: argv['start-date'],
          end_date: argv['end-date'],
          manager_ids: splitList(argv['manager-ids']),
        }
        console.log(JSON.stringify(await createTrack(fields), null, 2))
      })
    )
    .command(
      'update',
      'Update fields on an existing track. Only the fields you pass are changed; omitting --manager-ids leaves admins untouched. Requires auth and group manager role.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Track id to update' })
        .option('title', { type: 'string', describe: 'New title' })
        .option('name', { type: 'string', describe: 'New unique slug (changes the track\'s URL — use with care)' })
        .option('description', { type: 'string', describe: 'New description' })
        .option('image-url', { type: 'string', describe: 'New cover image URL' })
        .option('is-private', { type: 'boolean', describe: 'New visibility setting' })
        .option('start-date', { type: 'string', describe: 'New start date' })
        .option('end-date', { type: 'string', describe: 'New end date' })
        .option('manager-ids', { type: 'string', describe: 'Comma-separated user TSIDs — replaces the current admin set' })
        .example('$0 track update --id 12 --title "Renamed Track"', 'Rename a track'),
      handleError(async (argv) => {
        const fields = {
          name: argv.name,
          title: argv.title,
          description: argv.description,
          image_url: argv['image-url'],
          is_private: argv['is-private'],
          start_date: argv['start-date'],
          end_date: argv['end-date'],
          manager_ids: splitList(argv['manager-ids']),
        }
        console.log(JSON.stringify(await updateTrack(argv.id, fields), null, 2))
      })
    )
    .command(
      'remove',
      'Delete a track. Existing events keep their track_id nullified, not deleted. Requires auth and group manager role.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Track id to remove' })
        .example('$0 track remove --id 12', 'Remove track 12'),
      handleError(async (argv) => {
        await removeTrack(argv.id)
        console.log(JSON.stringify({ result: 'removed' }, null, 2))
      })
    )
}
