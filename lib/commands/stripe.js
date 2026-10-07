import {
  listStripeSettings, stripeSettingsForEvent, createStripeSetting,
  updateStripeSetting, deleteStripeSetting,
} from '../api-assets.js'
import { handleError } from '../utils.js'

export const command = 'stripe <subcommand>'
export const describe = 'Manage your own Stripe API keys used for ticket payments (server returns only masked keys). Requires auth; every endpoint 404s unless the deployment has STRIPE_ENABLED.'

const out = (v) => console.log(JSON.stringify(v, null, 2))
const idOpt = (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Stripe setting id' })

export function builder(yargs) {
  return yargs
    .command('list', 'List your Stripe settings (masked keys).', {}, handleError(async () => out(await listStripeSettings())))
    .command(
      'for-event',
      'The event OWNER\'s active Stripe settings (masked), for picking one on a ticket. Requires edit rights on the event.',
      (y) => y.option('event-id', { type: 'string', demandOption: true, describe: 'Event id' }),
      handleError(async (argv) => out(await stripeSettingsForEvent(argv['event-id'])))
    )
    .command(
      'create',
      'Add a Stripe key. It is validated against Stripe and a webhook endpoint is provisioned. Only secret (sk_/rk_) keys are accepted.',
      (y) => y
        .option('name', { type: 'string', demandOption: true, describe: 'Label for this key' })
        .option('secret-key', { type: 'string', demandOption: true, describe: 'Stripe secret key' })
        .option('currency', { type: 'string', describe: 'Currency code (e.g. usd)' }),
      handleError(async (argv) => out(await createStripeSetting({ name: argv.name, secret_key: argv['secret-key'], currency: argv.currency })))
    )
    .command(
      'update',
      'Rename a setting or rotate its key. Rotation is refused while orders on it are pending or recently paid.',
      (y) => idOpt(y)
        .option('name', { type: 'string', describe: 'New label' })
        .option('secret-key', { type: 'string', describe: 'New Stripe secret key' })
        .option('currency', { type: 'string', describe: 'Currency code' }),
      handleError(async (argv) => out(await updateStripeSetting(argv.id, { name: argv.name, secret_key: argv['secret-key'], currency: argv.currency })))
    )
    .command(
      'delete',
      'Delete a setting. Refused while orders on it are pending or recently paid.',
      (y) => idOpt(y),
      handleError(async (argv) => {
        await deleteStripeSetting(argv.id)
        out({ result: 'ok' })
      })
    )
    .demandCommand(1, 'Specify a subcommand')
}
