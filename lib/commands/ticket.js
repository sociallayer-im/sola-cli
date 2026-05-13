import { rsvpTicket, listGroupTicketTypes, checkCoupon, cancelTicketItem } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'ticket <subcommand>'
export const describe = 'RSVP, manage, and look up tickets for events. rsvp requires auth.'

export function builder(yargs) {
  return yargs
    .command(
      'rsvp',
      'RSVP to an event using a specific ticket. Requires auth. For free tickets, completes immediately. For paid tickets, creates a pending ticket_item.',
      (y) => y
        .option('event', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric event ID (e.g. 42)',
        })
        .option('ticket', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric ticket ID (from event get response)',
        })
        .option('payment-method', {
          type: 'number',
          describe: 'Payment method ID (required for paid tickets)',
        })
        .option('coupon', {
          type: 'string',
          describe: 'Coupon code for a discount (e.g. "SAVE20")',
        })
        .option('message', {
          type: 'string',
          describe: 'Message to the organizer when applying for approval-required tickets',
        })
        .example('$0 ticket rsvp --event 42 --ticket 7', 'RSVP with a free ticket')
        .example('$0 ticket rsvp --event 42 --ticket 7 --payment-method 3 --coupon SAVE20', 'RSVP with payment and coupon'),
      handleError(async (argv) => {
        const opts = {}
        if (argv['payment-method'] !== undefined) opts.payment_method_id = argv['payment-method']
        if (argv.coupon)   opts.coupon  = argv.coupon
        if (argv.message)  opts.message = argv.message
        console.log(JSON.stringify(await rsvpTicket(argv.event, argv.ticket, opts), null, 2))
      })
    )
    .command(
      'list-group-types',
      'List all ticket types defined for a group. No auth required.',
      (y) => y
        .option('group', {
          type: 'string',
          demandOption: true,
          describe: 'Group numeric ID or handle (e.g. 10 or "solaverse")',
        })
        .example('$0 ticket list-group-types --group solaverse', 'List ticket types for solaverse'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listGroupTicketTypes(argv.group), null, 2))
      })
    )
    .command(
      'check-coupon',
      'Check whether a coupon code is valid for an event. No auth required.',
      (y) => y
        .option('event', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric event ID (e.g. 42)',
        })
        .option('code', {
          type: 'string',
          demandOption: true,
          describe: 'Coupon code to validate (e.g. "SAVE20")',
        })
        .example('$0 ticket check-coupon --event 42 --code SAVE20', 'Check coupon SAVE20 for event 42'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await checkCoupon(argv.event, argv.code), null, 2))
      })
    )
    .command(
      'cancel',
      'Cancel a pending (unpaid) ticket item. Requires auth. Only works for items with status "pending".',
      (y) => y
        .option('chain', {
          type: 'string',
          demandOption: true,
          describe: 'Payment chain (e.g. "stripe", "base", "arbitrum", "op")',
        })
        .option('event', {
          type: 'number',
          demandOption: true,
          describe: 'Numeric event ID (product_id)',
        })
        .option('order', {
          type: 'string',
          demandOption: true,
          describe: 'Order number from the ticket_item (e.g. "1000042")',
        })
        .example('$0 ticket cancel --chain stripe --event 42 --order 1000042', 'Cancel a pending stripe payment'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await cancelTicketItem(argv.chain, argv.event, argv.order), null, 2))
      })
    )
}
