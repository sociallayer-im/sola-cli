import { listTopics, getTopic, createTopic, updateTopic, removeTopic, topicAction } from '../api-community.js'
import { handleError, splitList } from '../utils.js'

export const command = 'topic <subcommand>'
export const describe = 'Discussion topics. Requires DISCUSSION_ENABLED on the server and discussion enabled on the group, otherwise every call 404s. Reads are public (token optional); writes require auth.'

const idOpt = (y) => y.option('id', { type: 'string', demandOption: true, describe: 'Topic id' })

export function builder(yargs) {
  return yargs
    .command(
      'list',
      'List topics in a group, newest-activity first (pinned on top). Token optional; managers also see flagged topics.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID or handle' })
        .option('category', { type: 'string', describe: 'Filter by category id' })
        .option('category-slug', { type: 'string', describe: 'Filter by category slug' })
        .option('tags', { type: 'string', describe: 'Comma-separated tags (any match)' })
        .option('search', { type: 'string', describe: 'Title substring' })
        .option('user', { type: 'string', describe: 'Only topics by this user (TSID or handle)' })
        .option('starred-by', { type: 'string', describe: 'Only topics starred by this user' })
        .option('collection', { type: 'string', choices: ['newest', 'unanswered'], describe: 'Alternative ordering/filter' })
        .option('page', { type: 'number', describe: 'Page number' })
        .option('limit', { type: 'number', describe: 'Page size (default 20, max 500)' })
        .example('$0 topic list --group solaverse --collection unanswered', 'Unanswered topics'),
      handleError(async (argv) => {
        const params = {
          group_id: argv.group,
          category_id: argv.category,
          category_slug: argv['category-slug'],
          tags: argv.tags,
          search: argv.search,
          user_id: argv.user,
          starred_id: argv['starred-by'],
          collection: argv.collection,
          page: argv.page,
          limit: argv.limit,
        }
        console.log(JSON.stringify(await listTopics(params), null, 2))
      })
    )
    .command(
      'get',
      'Fetch one topic with its content. 404 if the caller cannot see its board.',
      (y) => idOpt(y),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getTopic(argv.id), null, 2))
      })
    )
    .command(
      'create',
      'Create a topic in a board. Requires auth; rate limited. 404 if the board is invisible to you.',
      (y) => y
        .option('category', { type: 'string', demandOption: true, describe: 'Category id' })
        .option('title', { type: 'string', demandOption: true, describe: 'Title' })
        .option('content', { type: 'string', describe: 'Body text' })
        .option('content-type', { type: 'string', describe: 'Content format, e.g. markdown' })
        .option('image-url', { type: 'string', describe: 'Cover image URL' })
        .option('tags', { type: 'string', describe: 'Comma-separated tags' })
        .example('$0 topic create --category abc --title "Hello" --content "First post"', 'Post a topic'),
      handleError(async (argv) => {
        const fields = {
          category_id: argv.category,
          title: argv.title,
          content: argv.content,
          content_type: argv['content-type'],
          image_url: argv['image-url'],
          tags: splitList(argv.tags),
        }
        console.log(JSON.stringify(await createTopic(fields), null, 2))
      })
    )
    .command(
      'update',
      'Update a topic (author or manager). Passing --category moves it to another board of the same group (manager only).',
      (y) => idOpt(y)
        .option('category', { type: 'string', describe: 'Move to this category id (manager)' })
        .option('title', { type: 'string', describe: 'New title' })
        .option('content', { type: 'string', describe: 'New body' })
        .option('content-type', { type: 'string', describe: 'New content format' })
        .option('image-url', { type: 'string', describe: 'New image URL' })
        .option('tags', { type: 'string', describe: 'Comma-separated tags — replaces the set' }),
      handleError(async (argv) => {
        const fields = {
          category_id: argv.category,
          title: argv.title,
          content: argv.content,
          content_type: argv['content-type'],
          image_url: argv['image-url'],
          tags: splitList(argv.tags),
        }
        console.log(JSON.stringify(await updateTopic(argv.id, fields), null, 2))
      })
    )
    .command(
      'remove',
      'Soft-delete a topic (author or manager). Reversible with `topic restore`.',
      (y) => idOpt(y),
      handleError(async (argv) => {
        console.log(JSON.stringify(await removeTopic(argv.id), null, 2))
      })
    )
    .command('pin', 'Pin a topic to the top of its list (manager).', (y) => idOpt(y),
      handleError(async (argv) => console.log(JSON.stringify(await topicAction(argv.id, 'pin'), null, 2))))
    .command('unpin', 'Unpin a topic (manager).', (y) => idOpt(y),
      handleError(async (argv) => console.log(JSON.stringify(await topicAction(argv.id, 'unpin'), null, 2))))
    .command('close', 'Close a topic to new replies.', (y) => idOpt(y),
      handleError(async (argv) => console.log(JSON.stringify(await topicAction(argv.id, 'close'), null, 2))))
    .command('open', 'Reopen a closed topic.', (y) => idOpt(y),
      handleError(async (argv) => console.log(JSON.stringify(await topicAction(argv.id, 'open'), null, 2))))
    .command(
      'flag',
      'Flag (hide) a topic for review. Hidden from non-managers until unflagged.',
      (y) => idOpt(y).option('reason', { type: 'string', describe: 'Reason' }),
      handleError(async (argv) => console.log(JSON.stringify(await topicAction(argv.id, 'flag', { reason: argv.reason }), null, 2)))
    )
    .command('unflag', 'Remove a topic flag.', (y) => idOpt(y),
      handleError(async (argv) => console.log(JSON.stringify(await topicAction(argv.id, 'unflag'), null, 2))))
    .command('restore', 'Restore a soft-deleted topic.', (y) => idOpt(y),
      handleError(async (argv) => console.log(JSON.stringify(await topicAction(argv.id, 'restore'), null, 2))))
}
