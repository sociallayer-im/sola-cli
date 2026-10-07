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
import * as form             from '../lib/commands/form.js'
import * as team             from '../lib/commands/team.js'
import * as marker           from '../lib/commands/marker.js'
import * as eventRole        from '../lib/commands/event-role.js'
import * as recurring        from '../lib/commands/recurring.js'
import * as comment          from '../lib/commands/comment.js'
import * as activity         from '../lib/commands/activity.js'
import * as category         from '../lib/commands/category.js'
import * as topic            from '../lib/commands/topic.js'
import * as reply            from '../lib/commands/reply.js'
import * as poll             from '../lib/commands/poll.js'
import * as hackathon        from '../lib/commands/hackathon.js'
import * as hackathonProject from '../lib/commands/hackathon-project.js'
import * as badgeClass       from '../lib/commands/badge-class.js'
import * as badge            from '../lib/commands/badge.js'
import * as voucher          from '../lib/commands/voucher.js'
import * as remember         from '../lib/commands/remember.js'
import * as oauth            from '../lib/commands/oauth.js'
import * as stripe           from '../lib/commands/stripe.js'
import * as withdrawal       from '../lib/commands/withdrawal.js'
import * as upload           from '../lib/commands/upload.js'

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
  .command(form)
  .command(team)
  .command(marker)
  .command(eventRole)
  .command(recurring)
  .command(comment)
  .command(activity)
  .command(category)
  .command(topic)
  .command(reply)
  .command(poll)
  .command(hackathon)
  .command(hackathonProject)
  .command(badgeClass)
  .command(badge)
  .command(voucher)
  .command(remember)
  .command(oauth)
  .command(stripe)
  .command(withdrawal)
  .command(upload)
  .demandCommand(1, 'Specify a command')
  .strict()
  .help()
  .argv
