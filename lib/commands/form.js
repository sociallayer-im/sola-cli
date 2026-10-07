import {
  getEventForm, saveEventForm, clearEventForm, getEventFormSubmission,
  getMyEventFormSubmission, updateEventFormSubmission, listEventFormSubmissions,
  listForms, listMyFormSubmissions, getForm, createForm, updateForm, removeForm,
  listFormSubmissions, getMyFormSubmission, submitForm,
} from '../api-forms.js'
import { handleError, parseJsonOption } from '../utils.js'

export const command = 'form <subcommand>'
export const describe = 'Event registration forms and standalone forms (surveys, sign-up sheets): define fields, submit, read answers.'

const out = (v) => console.log(JSON.stringify(v, null, 2))
const FIELDS_DESC = 'JSON array of fields, e.g. \'[{"label":"Name","field_type":"text","required":true}]\'. field_type: text|textarea|select|multi_select|date|url|image|file; options only for select/multi_select; include "id" to keep an existing field. The list is authoritative: fields you omit are deleted with their answers.'

export function builder(yargs) {
  return yargs
    // ── Event forms ──
    .command(
      'event-get',
      "Get an event's registration form. Public for visible events; null form if none.",
      (y) => y.option('event', { type: 'string', demandOption: true, describe: 'Event id' }),
      handleError(async (argv) => out(await getEventForm(argv.event)))
    )
    .command(
      'event-save',
      "Create or replace an event's registration form (also turns on require-approval). Requires auth and event edit rights.",
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event id' })
        .option('title', { type: 'string', describe: 'Form title (default "Application Form")' })
        .option('fields', { type: 'string', describe: FIELDS_DESC })
        .option('public-submissions', { type: 'boolean', describe: 'Publish answers publicly (omit to keep current)' }),
      handleError(async (argv) => out(await saveEventForm(argv.event, {
        title: argv.title,
        fields: parseJsonOption(argv.fields, 'fields'),
        public_submissions: argv['public-submissions'],
      })))
    )
    .command(
      'event-clear',
      "Detach the registration form from an event. Requires auth and event edit rights.",
      (y) => y.option('event', { type: 'string', demandOption: true, describe: 'Event id' }),
      handleError(async (argv) => {
        await clearEventForm(argv.event)
        out({ result: 'cleared' })
      })
    )
    .command(
      'event-submission',
      "Read one person's application answers. Event manager, or the user themself.",
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event id' })
        .option('user', { type: 'string', demandOption: true, describe: 'User id' }),
      handleError(async (argv) => out(await getEventFormSubmission(argv.event, argv.user)))
    )
    .command(
      'event-my-submission',
      'Read my own application answers for an event. Requires auth.',
      (y) => y.option('event', { type: 'string', demandOption: true, describe: 'Event id' }),
      handleError(async (argv) => out(await getMyEventFormSubmission(argv.event)))
    )
    .command(
      'event-update-submission',
      'Edit my pending application answers. Only while the application is still pending. Requires auth.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event id' })
        .option('answers', { type: 'string', demandOption: true, describe: 'JSON array: [{"field_id":"...","value":"..."}]' }),
      handleError(async (argv) => out(await updateEventFormSubmission(argv.event, parseJsonOption(argv.answers, 'answers'))))
    )
    .command(
      'event-submissions',
      'List all application submissions for an event. Event owner or group manager only.',
      (y) => y.option('event', { type: 'string', demandOption: true, describe: 'Event id' }),
      handleError(async (argv) => out(await listEventFormSubmissions(argv.event)))
    )
    // ── Standalone forms ──
    .command(
      'list',
      'List forms I created (including event registration forms). Requires auth.',
      (y) => y
        .option('limit', { type: 'number', describe: 'Page size (default 20)' })
        .option('page', { type: 'number', describe: 'Page number' }),
      handleError(async (argv) => out(await listForms({ limit: argv.limit, page: argv.page })))
    )
    .command(
      'my-submissions',
      'List the forms I have filled in, with my answers. Requires auth.',
      (y) => y
        .option('limit', { type: 'number', describe: 'Page size (default 20)' })
        .option('page', { type: 'number', describe: 'Page number' }),
      handleError(async (argv) => out(await listMyFormSubmissions({ limit: argv.limit, page: argv.page })))
    )
    .command(
      'get',
      'Get a standalone form by slug or id. Published forms are public; drafts only for their author.',
      (y) => y.option('slug', { type: 'string', demandOption: true, describe: 'Form slug or id' }),
      handleError(async (argv) => out(await getForm(argv.slug)))
    )
    .command(
      'create',
      'Create a standalone form. Requires auth.',
      (y) => y
        .option('title', { type: 'string', describe: 'Title (default "Untitled Form")' })
        .option('description', { type: 'string', describe: 'Description' })
        .option('submission-message', { type: 'string', describe: 'Message shown after submitting' })
        .option('published', { type: 'boolean', describe: 'Accept responses / readable by link' })
        .option('public-submissions', { type: 'boolean', describe: 'Let anyone read the answers' })
        .option('fields', { type: 'string', describe: FIELDS_DESC }),
      handleError(async (argv) => out(await createForm({
        title: argv.title,
        description: argv.description,
        submission_message: argv['submission-message'],
        published: argv.published,
        public_submissions: argv['public-submissions'],
        fields: parseJsonOption(argv.fields, 'fields'),
      })))
    )
    .command(
      'update',
      'Update a form. Only passed fields change; --fields (if passed) replaces the whole field list. Author or event editor only.',
      (y) => y
        .option('slug', { type: 'string', demandOption: true, describe: 'Form slug or id' })
        .option('title', { type: 'string', describe: 'New title' })
        .option('description', { type: 'string', describe: 'New description' })
        .option('submission-message', { type: 'string', describe: 'New post-submit message' })
        .option('published', { type: 'boolean', describe: 'Published state' })
        .option('public-submissions', { type: 'boolean', describe: 'Let anyone read the answers' })
        .option('fields', { type: 'string', describe: FIELDS_DESC }),
      handleError(async (argv) => out(await updateForm(argv.slug, {
        title: argv.title,
        description: argv.description,
        submission_message: argv['submission-message'],
        published: argv.published,
        public_submissions: argv['public-submissions'],
        fields: parseJsonOption(argv.fields, 'fields'),
      })))
    )
    .command(
      'remove',
      'Delete a form. Refused while an event still uses it.',
      (y) => y.option('slug', { type: 'string', demandOption: true, describe: 'Form slug or id' }),
      handleError(async (argv) => {
        await removeForm(argv.slug)
        out({ result: 'removed' })
      })
    )
    .command(
      'submissions',
      "List a form's submissions (paginated). Author always; others only if published with public submissions.",
      (y) => y
        .option('slug', { type: 'string', demandOption: true, describe: 'Form slug or id' })
        .option('limit', { type: 'number', describe: 'Page size (default 20)' })
        .option('page', { type: 'number', describe: 'Page number' }),
      handleError(async (argv) => out(await listFormSubmissions(argv.slug, { limit: argv.limit, page: argv.page })))
    )
    .command(
      'my-submission',
      'Read my answers to a standalone form. Requires auth.',
      (y) => y.option('slug', { type: 'string', demandOption: true, describe: 'Form slug or id' }),
      handleError(async (argv) => out(await getMyFormSubmission(argv.slug)))
    )
    .command(
      'submit',
      'Submit (or re-submit, which edits) my answers to a standalone form. Not for event forms. Requires auth.',
      (y) => y
        .option('slug', { type: 'string', demandOption: true, describe: 'Form slug or id' })
        .option('answers', { type: 'string', demandOption: true, describe: 'JSON array: [{"field_id":"...","value":"..."}]' })
        .example('$0 form submit --slug survey --answers \'[{"field_id":"abc","value":"yes"}]\'', 'Submit answers'),
      handleError(async (argv) => out(await submitForm(argv.slug, parseJsonOption(argv.answers, 'answers'))))
    )
}
