import {
  listOauthApps, getOauthApp, createOauthApp, updateOauthApp, deleteOauthApp, rotateOauthSecret,
  listOauthGrants, revokeOauthGrant,
  adminListOauthApps, adminGetOauthApp, adminReviewOauthApp, adminDisableOauthApp,
} from '../api-assets.js'
import { handleError, splitList } from '../utils.js'

export const command = 'oauth <subcommand>'
export const describe = 'OAuth provider developer portal: your registered apps, the grants you gave to third-party apps, and (platform admins) review/disable. The protocol endpoints (authorize/token/userinfo) are not wrapped. Requires auth.'

const out = (v) => console.log(JSON.stringify(v, null, 2))
const idOpt = (y, d = 'Application id') => y.option('id', { type: 'string', demandOption: true, describe: d })

const SCOPES = 'openid, profile, email, phone, wallet, groups:read, events:read, badges:read, tickets:read'

const appOptions = (y) => y
  .option('name', { type: 'string', describe: 'App name (names that read as first-party, e.g. containing "sola", are rejected for non-admins)' })
  .option('description', { type: 'string', describe: 'Shown on the consent screen' })
  .option('logo-url', { type: 'string', describe: 'Logo URL' })
  .option('homepage-url', { type: 'string', describe: 'App homepage URL' })
  .option('redirect-uris', { type: 'string', describe: 'Comma-separated redirect URIs (https only)' })
  .option('allowed-scopes', { type: 'string', describe: `Comma-separated scopes: ${SCOPES}` })
  .option('status', { type: 'string', choices: ['draft', 'active', 'disabled'], describe: 'Lifecycle status (active = self-activation, no review)' })

const appFields = (argv) => ({
  name: argv.name, description: argv.description, logo_url: argv['logo-url'],
  homepage_url: argv['homepage-url'], status: argv.status,
  redirect_uris: splitList(argv['redirect-uris']), allowed_scopes: splitList(argv['allowed-scopes']),
})

export function builder(yargs) {
  return yargs
    .command('apps', 'List your registered OAuth applications.', {}, handleError(async () => out(await listOauthApps())))
    .command('app-get', 'Fetch one of your applications.', (y) => idOpt(y), handleError(async (argv) => out(await getOauthApp(argv.id))))
    .command(
      'app-create',
      'Register an application. The client_secret in the response is shown ONCE; store it safely. Max 10 apps per owner.',
      (y) => appOptions(y)
        .option('group-id', { type: 'string', describe: 'Attach to a group (you must be able to update it)' })
        .option('public', { type: 'boolean', describe: 'Public client (no secret). Fixed at creation.' })
        .example('$0 oauth app-create --name "My Tool" --redirect-uris https://example.com/cb --allowed-scopes openid,profile', 'Register a confidential client'),
      handleError(async (argv) => {
        const application = appFields(argv)
        if (argv.public) application.confidential = false
        out(await createOauthApp(application, argv['group-id']))
      })
    )
    .command('app-update', 'Update one of your applications. (confidential cannot change after creation.)', (y) => appOptions(idOpt(y)), handleError(async (argv) => out(await updateOauthApp(argv.id, appFields(argv)))))
    .command('app-delete', 'Delete an application and end every session it holds.', (y) => idOpt(y), handleError(async (argv) => out(await deleteOauthApp(argv.id))))
    .command('app-rotate-secret', 'Issue a new client secret (shown once). Confidential clients only.', (y) => idOpt(y), handleError(async (argv) => out(await rotateOauthSecret(argv.id))))
    .command('grants', 'List the apps you have granted access to.', {}, handleError(async () => out(await listOauthGrants())))
    .command('grant-revoke', 'Revoke a grant and the tokens it produced.', (y) => idOpt(y, 'Grant id'), handleError(async (argv) => out(await revokeOauthGrant(argv.id))))
    .command(
      'admin-apps',
      'Platform admin only (users.admin): list every application, paginated.',
      (y) => y
        .option('status', { type: 'string', choices: ['draft', 'active', 'disabled'], describe: 'Filter by status' })
        .option('q', { type: 'string', describe: 'Search name or client_id' })
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' }),
      handleError(async (argv) => out(await adminListOauthApps({ status: argv.status, q: argv.q, page: argv.page, limit: argv.limit })))
    )
    .command('admin-app-get', 'Platform admin only: fetch any application (admin view).', (y) => idOpt(y), handleError(async (argv) => out(await adminGetOauthApp(argv.id))))
    .command(
      'admin-app-review',
      'Platform admin only: mark an application as reviewed (informational, shown on the consent screen). --no-reviewed clears it.',
      (y) => idOpt(y).option('reviewed', { type: 'boolean', describe: 'Pass --no-reviewed to unmark' }),
      handleError(async (argv) => out(await adminReviewOauthApp(argv.id, argv.reviewed)))
    )
    .command('admin-app-disable', 'Platform admin only: disable an application AND burn its live tokens.', (y) => idOpt(y), handleError(async (argv) => out(await adminDisableOauthApp(argv.id))))
    .demandCommand(1, 'Specify a subcommand')
}
