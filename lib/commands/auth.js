import { createInterface } from 'readline'
import { sendEmail, signinWithEmail, createProfile } from '../api.js'
import { saveToken } from '../config.js'
import { handleError } from '../utils.js'

function prompt(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()) })
  })
}

export const command = 'auth <subcommand>'
export const describe = 'Authenticate with the Sola API and manage your identity'

export function builder(yargs) {
  return yargs
    .command(
      'signin',
      'Sign in with email. Either prompts for code (interactive), or accepts --code (non-interactive). Saves auth_token to ~/.sola/config.json on success.',
      (y) => y
        .option('email', {
          type: 'string',
          demandOption: true,
          describe: 'Email address to receive the verification code (e.g. user@example.com)',
        })
        .option('code', {
          type: 'number',
          describe: 'Verification code (optional). If provided, skips interactive prompt. If omitted and stdin is interactive, prompts for code.',
        })
        .example('$0 auth signin --email user@example.com', 'Send code, prompt for input (interactive)')
        .example('$0 auth signin --email user@example.com --code 123456', 'Complete signin with code (non-interactive)'),
      handleError(async (argv) => {
        console.log(`Sending verification code to ${argv.email}...`)
        await sendEmail(argv.email)

        // If code provided, use it directly (non-interactive)
        if (argv.code !== undefined) {
          const data = await signinWithEmail(argv.email, argv.code)
          await saveToken(data.auth_token)
          console.log(`Signed in successfully. Token saved to ~/.sola/config.json`)
          if (data.profile) console.log(`Welcome, ${data.profile.handle ?? data.profile.email}`)
          return
        }

        // If stdin is interactive, prompt for code
        if (process.stdin.isTTY) {
          const code = await prompt('Enter the verification code: ')
          const data = await signinWithEmail(argv.email, parseInt(code, 10))
          await saveToken(data.auth_token)
          console.log(`Signed in successfully. Token saved to ~/.sola/config.json`)
          if (data.profile) console.log(`Welcome, ${data.profile.handle ?? data.profile.email}`)
          return
        }

        // Non-interactive, no code provided: just confirm code was sent
        console.log('Code sent. Check your email and run:')
        console.log(`  sola auth signin --email ${argv.email} --code <code>`)
      })
    )
    .command(
      'set-handle',
      'Set a unique handle on your profile after signing in. Handle is used as a public username and URL slug (e.g. sola.day/u/yourhandle). Requires auth.',
      (y) => y
        .option('handle', {
          type: 'string',
          demandOption: true,
          describe: 'Unique alphanumeric handle, lowercase, no spaces (e.g. alice, bob42)',
        })
        .example('$0 auth set-handle --handle alice', 'Set handle to "alice"'),
      handleError(async (argv) => {
        const data = await createProfile(argv.handle)
        console.log(`Handle set successfully:`)
        console.log(JSON.stringify(data, null, 2))
      })
    )
}

export const handler = () => {}
