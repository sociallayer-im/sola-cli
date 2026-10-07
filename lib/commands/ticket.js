import {
  listGroupTicketTypes, checkCoupon, couponPrice, listEventTickets,
  createTicket, updateTicket, removeTicket, rsvpTicket, verifyPayment, cancelUnpaidItem,
  checkoutSession, wechatPrepay, refundTicketItem, setPaymentStatus, addGroupTicketItem,
  listTicketItems, orderSummary, setCoupons, listCoupons, getCoupon, getCouponCode, couponUsage,
} from '../api.js'
import { handleError, parseJsonOption, splitList } from '../utils.js'

export const command = 'ticket <subcommand>'
export const describe = 'Define event tickets, RSVP/pay, manage orders, refunds and coupons. list-types, check-coupon, coupon-price and set-payment-status need no token; everything else requires auth. Card payment: `checkout-session` prints a Stripe-hosted checkout_url to open in a browser (the embedded payment element and webhooks are not driven from the CLI).'

const TICKET_STATUS = ['normal', 'nosale', 'hidden', 'inactive']
const TICKET_TYPES = ['event', 'group', 'membership_card']

// check_group_ids: "" clears the members-only gate (splitList("") is [] and the
// backend treats an empty list as no restriction).
const listOrClear = (v) => (v === '' ? [] : splitList(v))

// Writable ticket fields shared by create and update (TicketsController#ticket_params).
const ticketOptions = (y) => y
  .option('title', { type: 'string', describe: 'Ticket title (e.g. "General Admission")' })
  .option('content', { type: 'string', describe: 'Ticket description. For group tickets this text is also what `ticket add-group-item --title` matches on.' })
  .option('quantity', { type: 'number', describe: 'Number available. Omit for unlimited.' })
  .option('status', { type: 'string', choices: TICKET_STATUS, describe: 'normal (on sale) | nosale | hidden | inactive (default: normal)' })
  .option('ticket-type', { type: 'string', choices: TICKET_TYPES, describe: 'event (default) | group (grants group membership) | membership_card (needs --membership-duration-days). group/membership_card tickets must belong to the event\'s own group.' })
  .option('group-id', { type: 'string', describe: 'Group TSID a group/membership_card ticket grants membership in (must be the event\'s group; defaults to it on the group-ticket event)' })
  .option('membership-duration-days', { type: 'number', describe: 'Membership length in days (required > 0 for membership_card)' })
  .option('need-approval', { type: 'boolean', describe: 'RSVPs on this ticket require organizer approval' })
  .option('check-badge-class', { type: 'string', describe: 'Restrict to holders of this badge class id' })
  .option('check-group-ids', { type: 'string', describe: 'Comma-separated group TSIDs — only members of ANY listed group can claim (members-only ticket); "" clears' })
  .option('end-time', { type: 'string', describe: 'Sale cutoff (ISO 8601 datetime) — rsvp is rejected once this passes' })
  .option('start-date', { type: 'string', describe: 'Multi-day-ticket validity window start (ISO date; separate from --end-time)' })
  .option('end-date', { type: 'string', describe: 'Multi-day-ticket validity window end (ISO date; separate from --end-time)' })
  .option('days-allowed', { type: 'string', describe: 'Comma-separated ISO dates this ticket admits (multi-day events)' })
  .option('tracks-allowed', { type: 'string', describe: 'Comma-separated track ids this ticket admits' })
  .option('payment-methods-json', {
    type: 'string',
    describe: 'JSON array of payment methods (payment_methods_attributes): {chain: ethereum|optimism|arbitrum|polygon|base|stripe|wechat, kind, price, currency, token_name, token_address, receiver_address, protocol, chains[], stripe_setting_id}. Price in minor units for stripe (min 400 cents) / wechat (fen). A stripe_setting_id must belong to the event owner. On update include "id" to edit and "_destroy": true to remove; omitting "id" adds a new one.',
  })

const ticketFields = (argv) => ({
  title: argv.title,
  content: argv.content,
  quantity: argv.quantity,
  status: argv.status,
  ticket_type: argv['ticket-type'],
  group_id: argv['group-id'],
  membership_duration_days: argv['membership-duration-days'],
  need_approval: argv['need-approval'],
  check_badge_class_id: argv['check-badge-class'],
  check_group_ids: listOrClear(argv['check-group-ids']),
  end_time: argv['end-time'],
  start_date: argv['start-date'],
  end_date: argv['end-date'],
  days_allowed: listOrClear(argv['days-allowed']),
  tracks_allowed: listOrClear(argv['tracks-allowed']),
  payment_methods_attributes: parseJsonOption(argv['payment-methods-json'], 'payment-methods-json'),
})

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
      'List an event\'s ticket types (with payment methods). Requires auth.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('limit', { type: 'number', describe: 'Max per page (default 20, hard cap 500)' })
        .option('page', { type: 'number', describe: 'Page number (default 1)' })
        .example('$0 ticket list --event 0GA2...', 'List tickets for an event'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listEventTickets(argv.event, { limit: argv.limit, page: argv.page }), null, 2))
      })
    )
    .command(
      'create',
      'Create a ticket type for an event. Requires auth and event edit rights (owner, editor role, or group manager).',
      (y) => ticketOptions(y)
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('title', { type: 'string', demandOption: true, describe: 'Ticket title (e.g. "General Admission")' })
        .example('$0 ticket create --event 0GA2... --title "General" --quantity 50', 'Create a free ticket type')
        .example('$0 ticket create --event 0GA2... --title "Members" --check-group-ids 0G1...', 'Members-only ticket')
        .example('$0 ticket create --event 0GA2... --title "Card" --payment-methods-json \'[{"chain":"stripe","kind":"fiat","price":1000,"currency":"usd","stripe_setting_id":"..."}]\'', 'Paid ticket via Stripe'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await createTicket(argv.event, ticketFields(argv)), null, 2))
      })
    )
    .command(
      'update',
      'Update a ticket type. Only the fields you pass are changed. Requires auth and event edit rights. To edit payment methods, include "id" on entries to keep/change and "_destroy": true to remove one — omitting "id" adds a new one.',
      (y) => ticketOptions(y)
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('id', { type: 'string', demandOption: true, describe: 'Ticket id' })
        .example('$0 ticket update --event 0GA2... --id 7 --quantity 100', 'Raise the quantity'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await updateTicket(argv.event, argv.id, ticketFields(argv)), null, 2))
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
      'RSVP to an event using a specific ticket. Requires auth. Free tickets confirm immediately; paid ones create a pending order (ticket_item) — then settle it: crypto with `ticket verify-payment`, card with `ticket checkout-session`, WeChat with `ticket wechat-prepay`. Fails if the event is closed/ended/full, the ticket is off sale, or you lack a required badge / group membership.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('ticket', { type: 'string', demandOption: true, describe: 'Ticket id (from `ticket list`)' })
        .option('payment-method', { type: 'string', describe: 'Payment method id (required for paid tickets; from `ticket list`)' })
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
      'Confirm a pending order by proving payment (Stripe/WeChat are checked server-side; crypto needs --txhash). Requires auth — only the order\'s own owner may verify it.',
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
        .option('ticket-item', { type: 'string', describe: 'ticket_item id (alternative to --chain/--event/--order)' })
        .option('chain', { type: 'string', describe: 'Payment chain (e.g. "stripe", "base", "arbitrum")' })
        .option('event', { type: 'string', describe: 'Event TSID' })
        .option('order', { type: 'string', describe: 'ticket_item id' })
        .check((argv) => argv['ticket-item'] || (argv.chain && argv.event && argv.order) ||
          (() => { throw new Error('Pass --ticket-item, or all of --chain --event --order') })())
        .example('$0 ticket cancel-unpaid --ticket-item 501', 'Cancel a pending order')
        .example('$0 ticket cancel-unpaid --chain stripe --event 0GA2... --order 501', 'Same, by chain/event/order'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await cancelUnpaidItem(argv.chain, argv.event, argv.order, argv['ticket-item']), null, 2))
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
    .command(
      'checkout-session',
      'Get the Stripe-hosted checkout page for a pending card order (re-serves the same open session). Prints { checkout_url, session_id } — open checkout_url in a browser to pay. Requires auth; only the order\'s owner. Order must be pending, stripe, and (if approval is needed) already approved.',
      (y) => y
        .option('ticket-item', { type: 'string', demandOption: true, describe: 'ticket_item id from the rsvp response' })
        .example('$0 ticket checkout-session --ticket-item 501', 'Get the checkout URL'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await checkoutSession(argv['ticket-item']), null, 2))
      })
    )
    .command(
      'wechat-prepay',
      'Place the WeChat Pay JSAPI order for a pending WeChat order and print { pay_params } (meant for WeixinJSBridge inside WeChat — of limited use from a terminal). Requires auth; only the order\'s owner. 404s where WeChat Pay is not enabled.',
      (y) => y
        .option('ticket-item', { type: 'string', demandOption: true, describe: 'ticket_item id from the rsvp response' })
        .example('$0 ticket wechat-prepay --ticket-item 501', 'Get WeChat pay params'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await wechatPrepay(argv['ticket-item']), null, 2))
      })
    )
    .command(
      'refund',
      'Refund a paid card/WeChat order (organizer only; crypto orders are not refundable here). The refund is asynchronous — it is created pending and settled by the provider callback. Requires auth and event edit rights.',
      (y) => y
        .option('ticket-item', { type: 'string', demandOption: true, describe: 'ticket_item id' })
        .option('amount', { type: 'number', describe: 'Amount in minor units (cents/fen). Omit to refund the whole remaining balance.' })
        .option('reason', { type: 'string', describe: 'Reason (recorded on the refund and the order\'s activity log)' })
        .example('$0 ticket refund --ticket-item 501 --amount 500 --reason "partial"', 'Partial refund'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await refundTicketItem(argv['ticket-item'], { amount: argv.amount, reason: argv.reason }), null, 2))
      })
    )
    .command(
      'set-payment-status',
      'Server-to-server confirm of a CRYPTO order, authenticated by the deployment\'s shared NEXT_TOKEN secret instead of a user token (card/WeChat orders are refused — they confirm via webhook). Operator use only. Identify the order by --ticket-item, or by --chain/--event/--order.',
      (y) => y
        .option('next-token', { type: 'string', demandOption: true, describe: 'Shared secret (the server\'s NEXT_TOKEN env var)' })
        .option('ticket-item', { type: 'string', describe: 'ticket_item id' })
        .option('chain', { type: 'string', describe: 'Chain the payment was made on' })
        .option('event', { type: 'string', describe: 'Event TSID (product_id)' })
        .option('order', { type: 'string', describe: 'ticket_item id (item_id), with --chain/--event' })
        .option('amount', { type: 'number', describe: 'Amount paid; must be >= the order amount' })
        .option('txhash', { type: 'string', describe: 'On-chain transaction hash' })
        .option('sender-address', { type: 'string', describe: 'Sender address' })
        .example('$0 ticket set-payment-status --next-token $NEXT_TOKEN --ticket-item 501 --amount 1000 --txhash 0xabc...', 'Confirm a crypto order'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await setPaymentStatus({
          nextToken: argv['next-token'], ticketItemId: argv['ticket-item'], chain: argv.chain,
          eventId: argv.event, orderId: argv.order, amount: argv.amount,
          txhash: argv.txhash, senderAddress: argv['sender-address'],
        }), null, 2))
      })
    )
    .command(
      'add-group-item',
      'Grant a group ticket (and thus membership) to an email address. Known account: ticket + membership immediately. Unknown email: a pending invite that auto-accepts on signup. Requires auth and group manager role.',
      (y) => y
        .option('group', { type: 'string', demandOption: true, describe: 'Group TSID or nickname' })
        .option('email', { type: 'string', demandOption: true, describe: 'Recipient email' })
        .option('title', { type: 'string', demandOption: true, describe: 'The group ticket type\'s content text (see `ticket list-types`)' })
        .example('$0 ticket add-group-item --group 0G1... --email a@b.co --title "Annual member"', 'Grant a membership ticket'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await addGroupTicketItem(argv.group, { email: argv.email, title: argv.title }), null, 2))
      })
    )
    .command(
      'orders',
      'List an event\'s orders (ticket_items). Event managers get every order with refunds and activity; a regular user may list only their own via --user <their username>. Requires auth.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('user', { type: 'string', describe: 'Username (profile handle) to restrict to' })
        .option('status', { type: 'string', describe: 'Order status filter (e.g. pending, succeeded, partially_refunded, cancelled)' })
        .example('$0 ticket orders --event 0GA2... --status succeeded', 'Paid orders'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listTicketItems(argv.event, { profileHandle: argv.user, status: argv.status }), null, 2))
      })
    )
    .command(
      'order-summary',
      'Revenue rollup for an event, per payment rail and currency (WeChat adds fee/withdrawable figures). Requires auth and event manager rights.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .example('$0 ticket order-summary --event 0GA2...', 'Revenue summary'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await orderSummary(argv.event), null, 2))
      })
    )
    .command(
      'coupons',
      'List an event\'s (non-removed) coupons. Requires auth and event edit rights.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .example('$0 ticket coupons --event 0GA2...', 'List coupons'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await listCoupons(argv.event), null, 2))
      })
    )
    .command(
      'coupon',
      'Fetch one coupon by id. Requires auth and edit rights on its event.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Coupon id' })
        .example('$0 ticket coupon --id 12', 'Get coupon 12'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getCoupon(argv.id), null, 2))
      })
    )
    .command(
      'coupon-code',
      'Print just { coupon_id, code } for a coupon id. Requires auth and edit rights on its event.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Coupon id' })
        .example('$0 ticket coupon-code --id 12', 'Get the code for coupon 12'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await getCouponCode(argv.id), null, 2))
      })
    )
    .command(
      'coupon-usage',
      'List the orders that redeemed a coupon. Requires auth and edit rights on its event.',
      (y) => y
        .option('id', { type: 'string', demandOption: true, describe: 'Coupon id' })
        .example('$0 ticket coupon-usage --id 12', 'Who used coupon 12'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await couponUsage(argv.id), null, 2))
      })
    )
    .command(
      'set-coupons',
      'Create, edit, or remove an event\'s coupons in one batch. Requires auth and event edit rights. Entries with "id" update that coupon; "id" + "_destroy": true soft-deletes it (past orders keep their history); entries without "id" create a new coupon.',
      (y) => y
        .option('event', { type: 'string', demandOption: true, describe: 'Event TSID' })
        .option('coupons-json', {
          type: 'string', demandOption: true,
          describe: 'JSON array of {id, selector_type: code|email|badge, label, code, receiver_address, discount_type: ratio|amount, discount, expires_at, max_allowed_usages, order_usage_count, applicable_ticket_ids[], ticket_item_ids[], _destroy}',
        })
        .example('$0 ticket set-coupons --event 0GA2... --coupons-json \'[{"selector_type":"code","code":"SAVE20","discount_type":"ratio","discount":20,"max_allowed_usages":50}]\'', 'Add a 20% coupon'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await setCoupons(argv.event, parseJsonOption(argv['coupons-json'], 'coupons-json')), null, 2))
      })
    )
}
