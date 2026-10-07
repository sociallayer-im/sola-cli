import { listReplies, createReply, updateReply, removeReply, replyAction } from '../api-community.js'
import { handleError } from '../utils.js'

export const command = 'reply <subcommand>'
export const describe = 'Replies (floors) on discussion topics. Requires DISCUSSION_ENABLED on the server and discussion enabled on the group, otherwise every call 404s. Reads are public (token optional); writes require auth.'

const idOpt = (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Reply id' })
const out = (v) => console.log(JSON.stringify(v, null, 2))

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List a topic\'s replies in chronological order.',
      (y) => y
        .option('topic', { type: 'string', demandOption: true, describe: 'Topic id' })
        .option('page', { type: 'number', describe: 'Page number' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' }),
      handleError(async (argv) => {
        out(await listReplies(argv.topic, { page: argv.page, limit: argv.limit }))
      })
    )
    .command(
      'create',
      'Post a reply to a topic. Requires auth; rate limited; fails if the topic is closed.',
      (y) => y
        .option('topic', { type: 'string', demandOption: true, describe: 'Topic id' })
        .option('content', { type: 'string', demandOption: true, describe: 'Reply body' })
        .option('content-type', { type: 'string', describe: 'Content format, e.g. markdown' })
        .option('reply-to', { type: 'string', describe: 'Id of the reply this answers' })
        .example('$0 reply create --topic abc --content "Thanks!"', 'Reply to a topic'),
      handleError(async (argv) => {
        const fields = {
          content: argv.content,
          content_type: argv['content-type'],
          reply_to_id: argv['reply-to'],
        }
        out(await createReply(argv.topic, fields))
      })
    )
    .command(
      'update',
      'Edit a reply (author or manager). reply_to cannot be changed.',
      (y) => idOpt(y)
        .option('content', { type: 'string', describe: 'New body' })
        .option('content-type', { type: 'string', describe: 'New content format' }),
      handleError(async (argv) => {
        out(await updateReply(argv.id, { content: argv.content, content_type: argv['content-type'] }))
      })
    )
    .command('remove', 'Soft-delete a reply (author or manager). Reversible with `reply restore`.', (y) => idOpt(y),
      handleError(async (argv) => out(await removeReply(argv.id))))
    .command('flag', 'Flag (hide) a reply for review.',
      (y) => idOpt(y).option('reason', { type: 'string', describe: 'Reason' }),
      handleError(async (argv) => out(await replyAction(argv.id, 'flag', { reason: argv.reason }))))
    .command('unflag', 'Remove a reply flag.', (y) => idOpt(y),
      handleError(async (argv) => out(await replyAction(argv.id, 'unflag'))))
    .command('restore', 'Restore a soft-deleted reply.', (y) => idOpt(y),
      handleError(async (argv) => out(await replyAction(argv.id, 'restore'))))
}
