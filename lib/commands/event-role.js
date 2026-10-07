import { listEventRoles, createEventRole, updateEventRole, removeEventRole } from '../api-forms.js'
import { handleError } from '../utils.js'

export const command = 'event-role <subcommand>'
export const describe = 'Hosts, speakers and judges on an event. Requires auth; writes need event owner/role-holder/group manager.'

const out = (v) => console.log(JSON.stringify(v, null, 2))
const ROLES = ['group_host', 'custom_host', 'co_host', 'speaker', 'judge']

const roleOptions = (y) => y
  .option('item-id', { type: 'string', describe: 'User or Group id the role is for' })
  .option('item-type', { type: 'string', choices: ['User', 'Group'], describe: 'Type of --item-id' })
  .option('role', { type: 'string', choices: ROLES, describe: 'Role' })
  .option('email', { type: 'string', describe: 'Email (account-less roles)' })
  .option('display-name', { type: 'string', describe: 'Display name (account-less roles)' })
  .option('image-url', { type: 'string', describe: 'Image URL (account-less roles)' })

const fieldsOf = (argv) => ({
  item_id: argv['item-id'],
  item_type: argv['item-type'],
  role: argv.role,
  email: argv.email,
  display_name: argv['display-name'],
  image_url: argv['image-url'],
})

export function builder(yargs) {
  return yargs
    .command(
      'list',
      "List an event's roles.",
      (y) => y.option('event', { type: 'string', demandOption: true, describe: 'Event id' }),
      handleError(async (argv) => out(await listEventRoles(argv.event)))
    )
    .command(
      'create',
      'Add a role to an event. judge is listed but cannot edit the event.',
      (y) => roleOptions(y)
        .option('event', { type: 'string', demandOption: true, describe: 'Event id' })
        .demandOption('role'),
      handleError(async (argv) => out(await createEventRole(argv.event, fieldsOf(argv))))
    )
    .command(
      'update',
      'Update a role. Only passed fields change.',
      (y) => roleOptions(y)
        .option('event', { type: 'string', demandOption: true, describe: 'Event id' })
        .option('id', { type: 'string', demandOption: true, describe: 'Event role id' }),
      handleError(async (argv) => out(await updateEventRole(argv.event, argv.id, fieldsOf(argv))))
    )
    .command(
      'remove',
      'Remove a role from an event.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event id' })
        .option('id', { type: 'string', demandOption: true, describe: 'Event role id' }),
      handleError(async (argv) => {
        await removeEventRole(argv.event, argv.id)
        out({ result: 'removed' })
      })
    )
}
