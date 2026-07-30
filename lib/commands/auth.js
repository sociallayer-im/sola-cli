import { createInterface } from 'readline'
import { requestCode, verifyCode, getMe } from '../api.js'
import { saveToken } from '../config.js'
import { handleError } from '../utils.js'

function prompt(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()) })
  })
}

async function completeSignin(email, code) {
  const data = await verifyCode(email, code)
  await saveToken(data.token)
  console.log(`Signed in successfully. Token saved to ~/.sola/config.json`)
  console.log(`Welcome, ${data.user?.name ?? data.user?.email ?? email}`)
}

export const command = 'auth <subcommand>'
export const describe = 'Authenticate with the Sola API and manage your identity'

export function builder(yargs) {
  return yargs
    .command(
      'signin',
      'Sign in with an emailed one-time code. Supports send-only, with-code, or interactive modes. Saves the JWT to ~/.sola/config.json on success. New emails sign up automatically on first successful verify.',
      (y) => y
        .option('email', {
          type: 'string',
          demandOption: true,
          describe: 'Email address to receive the verification code (e.g. user@example.com)',
        })
        .option('send-only', {
          type: 'boolean',
          describe: 'Send code and exit without expecting signin. Useful for two-step flows or CI/CD pipelines.',
        })
        .option('code', {
          type: 'string',
          describe: 'Verification code (optional). If provided, completes signin. If omitted and stdin is interactive, prompts for code.',
        })
        .example('$0 auth signin --email user@example.com', 'Send code, prompt for input (interactive)')
        .example('$0 auth signin --email user@example.com --send-only', 'Send code only, exit (non-interactive step 1)')
        .example('$0 auth signin --email user@example.com --code AB12CD', 'Complete signin with code (non-interactive step 2)'),
      handleError(async (argv) => {
        console.log(`Sending verification code to ${argv.email}...`)
        await requestCode(argv.email)

        if (argv.sendOnly) {
          console.log(`Code sent to ${argv.email}`)
          return
        }

        if (argv.code !== undefined) {
          await completeSignin(argv.email, argv.code)
          return
        }

        if (process.stdin.isTTY) {
          const code = await prompt('Enter the verification code: ')
          await completeSignin(argv.email, code)
          return
        }

        console.log('Code sent. Check your email and run:')
        console.log(`  sola auth signin --email ${argv.email} --code <code>`)
      })
    )
    .command(
      'whoami',
      'Show the currently authenticated user. Requires auth.',
      (y) => y.example('$0 auth whoami', 'Show who you are signed in as'),
      handleError(async () => {
        console.log(JSON.stringify(await getMe(), null, 2))
      })
    )
}
