import {
  listTeams, createTeam, updateTeam, removeTeam,
  listTeamMembers, addTeamMember, removeTeamMember,
} from '../api-forms.js'
import { handleError } from '../utils.js'

export const command = 'team <subcommand>'
export const describe = "Teams: named subsets of a group's members. All endpoints require auth (members/managers)."

const out = (v) => console.log(JSON.stringify(v, null, 2))

export function builder(yargs) {
  return yargs
    .command(
      'list',
      "List a group's teams. Group members and managers only.",
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID or slug' })
        .option('include-archived', { type: 'boolean', describe: 'Include archived teams' })
        .option('limit', { type: 'number', describe: 'Page size' })
        .option('page', { type: 'number', describe: 'Page number' }),
      handleError(async (argv) => out(await listTeams({
        group_id: argv.group,
        include_archived: argv['include-archived'] ? 'true' : undefined,
        limit: argv.limit,
        page: argv.page,
      })))
    )
    .command(
      'create',
      'Create a team in a group. The slug is generated from the name if omitted.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID or slug' })
        .option('name', { type: 'string', demandOption: true, describe: 'Team name' })
        .option('slug', { type: 'string', describe: 'Team slug' })
        .option('description', { type: 'string', describe: 'Description' })
        .option('color', { type: 'string', describe: 'Color (e.g. #ff8800)' })
        .option('sort', { type: 'number', describe: 'Sort order' })
        .option('archived', { type: 'boolean', describe: 'Archive the team' })
        .option('is-public', { type: 'boolean', describe: 'Visible publicly' }),
      handleError(async (argv) => out(await createTeam({
        group_id: argv.group,
        name: argv.name,
        slug: argv.slug,
        description: argv.description,
        color: argv.color,
        sort: argv.sort,
        archived: argv.archived,
        is_public: argv['is-public'],
      })))
    )
    .command(
      'update',
      'Update a team. Only passed fields change.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Team id' })
        .option('name', { type: 'string', describe: 'New name' })
        .option('slug', { type: 'string', describe: 'New slug' })
        .option('description', { type: 'string', describe: 'New description' })
        .option('color', { type: 'string', describe: 'New color' })
        .option('sort', { type: 'number', describe: 'New sort order' })
        .option('archived', { type: 'boolean', describe: 'Archived state' })
        .option('is-public', { type: 'boolean', describe: 'Public visibility' }),
      handleError(async (argv) => out(await updateTeam(argv.id, {
        name: argv.name,
        slug: argv.slug,
        description: argv.description,
        color: argv.color,
        sort: argv.sort,
        archived: argv.archived,
        is_public: argv['is-public'],
      })))
    )
    .command(
      'remove',
      'Delete a team (members are un-grouped, not deleted).',
      (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Team id' }),
      handleError(async (argv) => out(await removeTeam(argv.id)))
    )
    .command(
      'members',
      "List a team's members.",
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Team id' })
        .option('limit', { type: 'number', describe: 'Page size' })
        .option('page', { type: 'number', describe: 'Page number' }),
      handleError(async (argv) => out(await listTeamMembers(argv.id, { limit: argv.limit, page: argv.page })))
    )
    .command(
      'add-member',
      'Add a user to a team.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Team id' })
        .option('user', { type: 'string', demandOption: true, describe: 'User TSID or username' }),
      handleError(async (argv) => out(await addTeamMember(argv.id, argv.user)))
    )
    .command(
      'remove-member',
      'Remove a user from a team.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Team id' })
        .option('user', { type: 'string', demandOption: true, describe: 'User TSID or username' }),
      handleError(async (argv) => out(await removeTeamMember(argv.id, argv.user)))
    )
}
