import { listCategories, createCategory, updateCategory, removeCategory } from '../api-community.js'
import { handleError, splitList } from '../utils.js'

export const command = 'category <subcommand>'
export const describe = 'Discussion boards (categories) of a group. Requires DISCUSSION_ENABLED on the server and discussion enabled on the group, otherwise every call 404s. Writes require group manager role.'

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List the boards the caller may see in a group. Works anonymously (token optional); private boards only show with a token.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID or handle' })
        .option('include-archived', { type: 'boolean', describe: 'Also list archived boards' })
        .option('page', { type: 'number', describe: 'Page number' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' })
        .example('$0 category list --group solaverse', 'List boards'),
      handleError(async (argv) => {
        const params = {
          group_id: argv.group,
          include_archived: argv['include-archived'] ? 'true' : undefined,
          page: argv.page,
          limit: argv.limit,
        }
        console.log(JSON.stringify(await listCategories(params), null, 2))
      })
    )
    .command(
      'create',
      'Create a board in a group. Requires auth and group manager role. `slug` is generated from the name if omitted.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID or handle' })
        .option('name', { type: 'string', demandOption: true, describe: 'Board name' })
        .option('slug', { type: 'string', describe: 'URL slug (unique within the group)' })
        .option('summary', { type: 'string', describe: 'Short description' })
        .option('sort', { type: 'number', describe: 'Sort order' })
        .option('archived', { type: 'boolean', describe: 'Archive the board' })
        .option('visibility', { type: 'string', choices: ['public', 'member', 'manager', 'team'], describe: 'Who can see the board' })
        .option('team-ids', { type: 'string', describe: 'Comma-separated team TSIDs allowed to see a visibility=team board' })
        .example('$0 category create --group solaverse --name General', 'Create a board'),
      handleError(async (argv) => {
        const fields = {
          group_id: argv.group,
          name: argv.name,
          slug: argv.slug,
          summary: argv.summary,
          sort: argv.sort,
          archived: argv.archived,
          visibility: argv.visibility,
          team_ids: splitList(argv['team-ids']),
        }
        console.log(JSON.stringify(await createCategory(fields), null, 2))
      })
    )
    .command(
      'update',
      'Update a board. Only passed fields change; omitting --team-ids leaves team access untouched. Requires auth and group manager role.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Category id' })
        .option('name', { type: 'string', describe: 'New name' })
        .option('slug', { type: 'string', describe: 'New slug' })
        .option('summary', { type: 'string', describe: 'New summary' })
        .option('sort', { type: 'number', describe: 'New sort order' })
        .option('archived', { type: 'boolean', describe: 'Archive / unarchive (--no-archived)' })
        .option('visibility', { type: 'string', choices: ['public', 'member', 'manager', 'team'], describe: 'New visibility' })
        .option('team-ids', { type: 'string', describe: 'Comma-separated team TSIDs — replaces the allowed set' })
        .example('$0 category update --id abc --archived', 'Archive a board'),
      handleError(async (argv) => {
        const fields = {
          name: argv.name,
          slug: argv.slug,
          summary: argv.summary,
          sort: argv.sort,
          archived: argv.archived,
          visibility: argv.visibility,
          team_ids: splitList(argv['team-ids']),
        }
        console.log(JSON.stringify(await updateCategory(argv.id, fields), null, 2))
      })
    )
    .command(
      'remove',
      'Delete an EMPTY board (422 if it ever had topics; archive instead). Requires auth and group manager role.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Category id' }),
      handleError(async (argv) => {
        console.log(JSON.stringify(await removeCategory(argv.id), null, 2))
      })
    )
}
