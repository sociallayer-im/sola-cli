import { listMarkers, getMarker, createMarker, updateMarker, removeMarker } from '../api-forms.js'
import { handleError, parseJsonOption } from '../utils.js'

export const command = 'marker <subcommand>'
export const describe = 'Community map markers. Reads are public (list needs --group when anonymous); writes require auth.'

const out = (v) => console.log(JSON.stringify(v, null, 2))

export function builder(yargs) {
  return yargs
    .command(
      'list',
      "List markers. With --group, public; without it, markers across the caller's own groups (auth).",
      (y) => y
        .option('group', { type: 'string', describe: 'Group TSID or slug' })
        .option('category', { type: 'string', describe: 'Filter by category' })
        .option('limit', { type: 'number', describe: 'Page size' })
        .option('page', { type: 'number', describe: 'Page number' }),
      handleError(async (argv) => out(await listMarkers({
        group_id: argv.group, category: argv.category, limit: argv.limit, page: argv.page,
      })))
    )
    .command(
      'get',
      'Get a marker by id. No auth required.',
      (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Marker id' }),
      handleError(async (argv) => out(await getMarker(argv.id)))
    )
    .command(
      'create',
      'Pin a marker on a group map. Group members only.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID' })
        .option('title', { type: 'string', describe: 'Title' })
        .option('place', { type: 'string', describe: 'Place id' })
        .option('category', { type: 'string', describe: 'Category' })
        .option('about', { type: 'string', describe: 'Description' })
        .option('link', { type: 'string', describe: 'Link URL' })
        .option('pin-image-url', { type: 'string', describe: 'Pin image URL' })
        .option('cover-image-url', { type: 'string', describe: 'Cover image URL' })
        .option('status', { type: 'string', describe: 'Status (e.g. active)' })
        .option('data', { type: 'string', describe: 'Extra data as a JSON object' }),
      handleError(async (argv) => out(await createMarker({
        group_id: argv.group,
        title: argv.title,
        place_id: argv.place,
        category: argv.category,
        about: argv.about,
        link: argv.link,
        pin_image_url: argv['pin-image-url'],
        cover_image_url: argv['cover-image-url'],
        status: argv.status,
        data: parseJsonOption(argv.data, 'data'),
      })))
    )
    .command(
      'update',
      'Update a marker (group cannot be changed). Owner or group manager only.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Marker id' })
        .option('title', { type: 'string', describe: 'Title' })
        .option('place', { type: 'string', describe: 'Place id' })
        .option('category', { type: 'string', describe: 'Category' })
        .option('about', { type: 'string', describe: 'Description' })
        .option('link', { type: 'string', describe: 'Link URL' })
        .option('pin-image-url', { type: 'string', describe: 'Pin image URL' })
        .option('cover-image-url', { type: 'string', describe: 'Cover image URL' })
        .option('status', { type: 'string', describe: 'Status' })
        .option('data', { type: 'string', describe: 'Extra data as a JSON object' }),
      handleError(async (argv) => out(await updateMarker(argv.id, {
        title: argv.title,
        place_id: argv.place,
        category: argv.category,
        about: argv.about,
        link: argv.link,
        pin_image_url: argv['pin-image-url'],
        cover_image_url: argv['cover-image-url'],
        status: argv.status,
        data: parseJsonOption(argv.data, 'data'),
      })))
    )
    .command(
      'remove',
      'Delete a marker. Owner or group manager only.',
      (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Marker id' }),
      handleError(async (argv) => {
        await removeMarker(argv.id)
        out({ result: 'removed' })
      })
    )
}
