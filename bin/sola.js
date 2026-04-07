#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as auth    from '../lib/commands/auth.js'
import * as profile from '../lib/commands/profile.js'
import * as event   from '../lib/commands/event.js'
import * as venue   from '../lib/commands/venue.js'
import * as group   from '../lib/commands/group.js'

yargs(hideBin(process.argv))
  .scriptName('sola')
  .usage('$0 <command> [options]')
  .command(auth)
  .command(profile)
  .command(event)
  .command(venue)
  .command(group)
  .demandCommand(1, 'Specify a command')
  .strict()
  .help()
  .argv
