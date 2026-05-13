#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as auth    from '../lib/commands/auth.js'
import * as profile from '../lib/commands/profile.js'
import * as event   from '../lib/commands/event.js'
import * as venue   from '../lib/commands/venue.js'
import * as group   from '../lib/commands/group.js'
import * as service from '../lib/commands/service.js'
import * as ticket  from '../lib/commands/ticket.js'

yargs(hideBin(process.argv))
  .scriptName('sola')
  .usage('$0 <command> [options]')
  .command(auth)
  .command(profile)
  .command(event)
  .command(venue)
  .command(group)
  .command(service)
  .command(ticket)
  .demandCommand(1, 'Specify a command')
  .strict()
  .help()
  .argv
