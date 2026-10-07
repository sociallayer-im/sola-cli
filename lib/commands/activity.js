import { listActivities, markActivitiesRead } from '../api-forms.js'
import { handleError, splitList } from '../utils.js'

export const command = 'activity <subcommand>'
export const describe = 'My activity feed (notifications). Requires auth.'

const out = (v) => console.log(JSON.stringify(v, null, 2))

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List activities addressed to me, newest first.',
      (y) => y
        .option('limit', { type: 'number', describe: 'Page size (default 20)' })
        .option('page', { type: 'number', describe: 'Page number' }),
      handleError(async (argv) => out(await listActivities({ limit: argv.limit, page: argv.page })))
    )
    .command(
      'mark-read',
      'Mark activities as read. All ids must be addressed to me.',
      (y) => y.option('ids', { type: 'string', demandOption: true, describe: 'Comma-separated activity ids' }),
      handleError(async (argv) => out(await markActivitiesRead(splitList(argv.ids))))
    )
}
