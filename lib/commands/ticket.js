import {
  listGroupTicketTypes, checkCoupon, couponPrice, listEventTickets,
  createTicket, updateTicket, removeTicket, rsvpTicket, verifyPayment, cancelUnpaidItem,
} from '../api.js'
import { handleError, parseJsonOption } from '../utils.js'

export const command = 'ticket <subcommand>'
export const describe = 'Define, list, and RSVP to event tickets. Coupon lookups and list-types are public; everything else requires auth. Stripe checkout itself (client secret / webhook) isn\'t exposed here — a CLI can\'t drive a browser payment element.'

export function builder(yargs) {
  return yargs
    .command(
      'list-types',
      'List all ticket types defined for a group (across all its events). No auth required.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID or slug' })
        .example('$0 ticket list-types --group solaverse', 'List ticket types for solaverse'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listGroupTicketTypes(argv.group), null, 2))
      })
    )
    .command(
      'list',
      'List an event\'s ticket types. Requires auth.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .example('$0 ticket list --event 0GA2...', 'List tickets for an event'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listEventTickets(argv.event), null, 2))
      })
    )
    .command(
      'create',
      'Create a ticket type for an event. Requires auth and event ownership or group manager role.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('title', { type: 'string', demandOption: true, describe: 'Ticket title (e.g. "General Admission")' })
        .option('content', { type: 'string', describe: 'Ticket description' })
        .option('quantity', { type: 'number', describe: 'Number available. Omit for unlimited.' })
        .option('status', { type: 'string', describe: 'normal | nosale | hidden | inactive (default: normal)' })
        .option('ticket-type', { type: 'string', describe: 'event | group (default: event)' })
        .option('need-approval', { type: 'boolean', describe: 'RSVPs on this ticket require organizer approval' })
        .option('check-badge-class', { type: 'string', describe: 'Restrict to holders of this badge class id' })
        .option('end-time', { type: 'string', describe: 'Sale cutoff (ISO 8601 datetime) — rsvp is rejected once this passes' })
        .option('start-date', { type: 'string', describe: 'Multi-day-ticket validity window start (ISO date; separate from --end-time, the sale cutoff)' })
        .option('end-date', { type: 'string', describe: 'Multi-day-ticket validity window end (ISO date; separate from --end-time, the sale cutoff)' })
        .option('payment-methods-json', {
          type: 'string',
          describe: 'JSON array of payment methods, e.g. \'[{"chain":"stripe","kind":"fiat","price":1000}]\' (price in cents for stripe)',
        })
        .example('$0 ticket create --event 0GA2... --title "General" --quantity 50', 'Create a free ticket type'),
      handleError(async (argv) => {
        const fields = {
          title: argv.title,
          content: argv.content,
          quantity: argv.quantity,
          status: argv.status,
          ticket_type: argv['ticket-type'],
          need_approval: argv['need-approval'],
          check_badge_class_id: argv['check-badge-class'],
          end_time: argv['end-time'],
          start_date: argv['start-date'],
          end_date: argv['end-date'],
          payment_methods_attributes: parseJsonOption(argv['payment-methods-json'], 'payment-methods-json'),
        }
        console.log(JSON.stringify(await createTicket(argv.event, fields), null, 2))
      })
    )
    .command(
      'update',
      'Update a ticket type. Only the fields you pass are changed. Requires auth and event ownership or group manager role. To edit payment methods, include "id" on entries to keep/change and "_destroy": true to remove one — omitting "id" adds a new one.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('id', { type: 'string', demandOption: true, describe: 'Ticket id' })
        .option('title', { type: 'string', describe: 'New title' })
        .option('quantity', { type: 'number', describe: 'New quantity' })
        .option('status', { type: 'string', describe: 'New status' })
        .option('end-time', { type: 'string', describe: 'New sale cutoff (ISO 8601 datetime)' })
        .option('payment-methods-json', { type: 'string', describe: 'JSON array of payment method attrs (see `ticket create`)' })
        .example('$0 ticket update --event 0GA2... --id 7 --quantity 100', 'Raise the quantity'),
      handleError(async (argv) => {
        const fields = {
          title: argv.title,
          quantity: argv.quantity,
          status: argv.status,
          end_time: argv['end-time'],
          payment_methods_attributes: parseJsonOption(argv['payment-methods-json'], 'payment-methods-json'),
        }
        console.log(JSON.stringify(await updateTicket(argv.event, argv.id, fields), null, 2))
      })
    )
    .command(
      'remove',
      'Remove a ticket type — destroyed outright if unsold, retired (status: inactive) if any tickets have already been sold against it. Requires auth and event ownership or group manager role.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('id', { type: 'string', demandOption: true, describe: 'Ticket id' })
        .example('$0 ticket remove --event 0GA2... --id 7', 'Remove a ticket type'),
      handleError(async (argv) => {
        await removeTicket(argv.event, argv.id)
        console.log(JSON.stringify({ result: 'removed' }, null, 2))
      })
    )
    .command(
      'rsvp',
      'RSVP to an event using a specific ticket. Requires auth. Free tickets confirm immediately; paid ones create a pending order — settle crypto payments with `ticket verify-payment` once the tx confirms.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('ticket', { type: 'string', demandOption: true, describe: 'Ticket id (from `ticket list`)' })
        .option('payment-method', { type: 'string', describe: 'Payment method id (required for paid tickets)' })
        .option('chain', { type: 'string', describe: 'Chain to pay on, if the payment method supports several' })
        .option('coupon', { type: 'string', describe: 'Coupon code for a discount' })
        .option('message', { type: 'string', describe: 'Message to the organizer, for approval-required tickets' })
        .option('answers-json', { type: 'string', describe: 'JSON array of {field_id, value}, if the event has a required form' })
        .example('$0 ticket rsvp --event 0GA2... --ticket 7', 'RSVP with a free ticket'),
      handleError(async (argv) => {
        const opts = {}
        if (argv['payment-method'] !== undefined) opts.payment_method_id = argv['payment-method']
        if (argv.chain) opts.chain = argv.chain
        if (argv.coupon) opts.coupon = argv.coupon
        if (argv.message) opts.message = argv.message
        const answers = parseJsonOption(argv['answers-json'], 'answers-json')
        if (answers) opts.answers = answers
        console.log(JSON.stringify(await rsvpTicket(argv.event, argv.ticket, opts), null, 2))
      })
    )
    .command(
      'verify-payment',
      'Confirm a pending order by proving payment (Stripe is checked server-side automatically; crypto needs --txhash). Requires auth — only the order\'s own owner may verify it.',
      (y) => y
        .option('ticket-item', { type: 'string', demandOption: true, describe: 'ticket_item id from the rsvp response' })
        .option('txhash', { type: 'string', describe: 'On-chain transaction hash (crypto payments only)' })
        .option('sender-address', { type: 'string', describe: 'Address the payment was sent from' })
        .example('$0 ticket verify-payment --ticket-item 501 --txhash 0xabc...', 'Confirm a crypto payment'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await verifyPayment(argv['ticket-item'], {
          txhash: argv.txhash, senderAddress: argv['sender-address'],
        }), null, 2))
      })
    )
    .command(
      'cancel-unpaid',
      'Cancel your own pending (unpaid) order, releasing the reserved ticket quantity. Requires auth.',
      (y) => y
        .option('chain', { type: 'string', demandOption: true, describe: 'Payment chain (e.g. "stripe", "base", "arbitrum")' })
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('order', { type: 'string', demandOption: true, describe: 'ticket_item id' })
        .example('$0 ticket cancel-unpaid --chain stripe --event 0GA2... --order 501', 'Cancel a pending order'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await cancelUnpaidItem(argv.chain, argv.event, argv.order), null, 2))
      })
    )
    .command(
      'check-coupon',
      'Check whether a coupon code exists for an event. No auth required.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('code', { type: 'string', demandOption: true, describe: 'Coupon code' })
        .example('$0 ticket check-coupon --event 0GA2... --code SAVE20', 'Check a coupon'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await checkCoupon(argv.event, argv.code), null, 2))
      })
    )
    .command(
      'coupon-price',
      'Preview the discounted price a coupon code would give for a payment method. No auth required.',
      (y) => y
        .option('code', { type: 'string', demandOption: true, describe: 'Coupon code' })
        .option('payment-method', { type: 'string', demandOption: true, describe: 'Payment method id' })
        .option('amount', { type: 'number', describe: 'Base amount to discount from' })
        .example('$0 ticket coupon-price --code SAVE20 --payment-method 3 --amount 1000', 'Preview a discount'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await couponPrice(argv.code, argv['payment-method'], argv.amount), null, 2))
      })
    )
}
