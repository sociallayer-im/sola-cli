import { listComments, createComment, starItem, unstarItem, removeComment } from '../api-forms.js'
import { handleError } from '../utils.js'

export const command = 'comment <subcommand>'
export const describe = 'Comments, stars and feedback on items (events, groups, topics...). Listing is public; writes require auth.'

const out = (v) => console.log(JSON.stringify(v, null, 2))
const TYPES = ['checkin', 'chat', 'comment', 'star', 'feedback']

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List comments of one type, newest first. No auth required.',
      (y) => y
        .option('comment-type', { type: 'string', demandOption: true, choices: TYPES, describe: 'Comment type (required by the API)' })
        .option('item-type', { type: 'string', describe: 'Item class, e.g. Event, Group, Topic' })
        .option('item-id', { type: 'string', describe: 'Item id' })
        .option('user', { type: 'string', describe: 'Filter by author user id' })
        .option('limit', { type: 'number', describe: 'Page size' })
        .option('page', { type: 'number', describe: 'Page number' }),
      handleError(async (argv) => out(await listComments({
        comment_type: argv['comment-type'],
        item_type: argv['item-type'],
        item_id: argv['item-id'],
        user_id: argv.user,
        limit: argv.limit,
        page: argv.page,
      })))
    )
    .command(
      'create',
      'Post a comment. Requires auth.',
      (y) => y
        .option('item-type', { type: 'string', demandOption: true, describe: 'Item class, e.g. Event' })
        .option('item-id', { type: 'string', demandOption: true, describe: 'Item id' })
        .option('content', { type: 'string', demandOption: true, describe: 'Comment text' })
        .option('comment-type', { type: 'string', default: 'comment', choices: TYPES, describe: 'Comment type' })
        .option('title', { type: 'string', describe: 'Title' })
        .option('content-type', { type: 'string', describe: 'Content type (e.g. text)' })
        .option('reply-to', { type: 'string', describe: 'Parent comment id' })
        .option('edit-parent', { type: 'string', describe: 'Comment id this edits' })
        .option('icon-url', { type: 'string', describe: 'Icon URL' })
        .option('badge-id', { type: 'string', describe: 'Badge id' }),
      handleError(async (argv) => out(await createComment({
        item_type: argv['item-type'],
        item_id: argv['item-id'],
        content: argv.content,
        comment_type: argv['comment-type'],
        title: argv.title,
        content_type: argv['content-type'],
        reply_parent_id: argv['reply-to'],
        edit_parent_id: argv['edit-parent'],
        icon_url: argv['icon-url'],
        badge_id: argv['badge-id'],
      })))
    )
    .command(
      'star',
      'Star an item. Requires auth.',
      (y) => y
        .option('item-type', { type: 'string', demandOption: true, describe: 'Item class, e.g. Topic, Reply' })
        .option('item-id', { type: 'string', demandOption: true, describe: 'Item id' }),
      handleError(async (argv) => out(await starItem(argv['item-type'], argv['item-id'])))
    )
    .command(
      'unstar',
      'Remove my star from an item. Requires auth.',
      (y) => y
        .option('item-type', { type: 'string', demandOption: true, describe: 'Item class' })
        .option('item-id', { type: 'string', demandOption: true, describe: 'Item id' }),
      handleError(async (argv) => out(await unstarItem(argv['item-type'], argv['item-id'])))
    )
    .command(
      'remove',
      'Soft-remove my own comment. Requires auth; author only.',
      (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Comment id' }),
      handleError(async (argv) => out(await removeComment(argv.id)))
    )
}
