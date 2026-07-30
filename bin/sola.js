#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as auth        from '../lib/commands/auth.js'
import * as user         from '../lib/commands/user.js'
import * as event        from '../lib/commands/event.js'
import * as participant  from '../lib/commands/participant.js'
import * as venue        from '../lib/commands/venue.js'
import * as place        from '../lib/commands/place.js'
import * as track        from '../lib/commands/track.js'
import * as group        from '../lib/commands/group.js'
import * as invite       from '../lib/commands/invite.js'
import * as ticket       from '../lib/commands/ticket.js'
import * as discover     from '../lib/commands/discover.js'
import * as service      from '../lib/commands/service.js'

yargs(hideBin(process.argv))
  .scriptName('sola')
  .usage('$0 <command> [options]')
  .command(auth)
  .command(user)
  .command(event)
  .command(participant)
  .command(venue)
  .command(place)
  .command(track)
  .command(group)
  .command(invite)
  .command(ticket)
  .command(discover)
  .command(service)
  .demandCommand(1, 'Specify a command')
  .strict()
  .help()
  .argv
