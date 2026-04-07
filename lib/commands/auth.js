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
export const describe = 'Authentication commands'

export function builder(yargs) {
  return yargs
    .command(
      'signin',
      'Sign in with email (sends code, then prompts for it)',
      (y) => y.option('email', { type: 'string', demandOption: true, describe: 'Your email address' }),
      handleError(async (argv) => {
        console.log(`Sending verification code to ${argv.email}...`)
        await sendEmail(argv.email)
        const code = await prompt('Enter the verification code: ')
        const data = await signinWithEmail(argv.email, parseInt(code, 10))
        await saveToken(data.auth_token)
        console.log(`Signed in successfully. Token saved to ~/.sola/config.json`)
        if (data.profile) console.log(`Welcome, ${data.profile.handle ?? data.profile.email}`)
      })
    )
    .command(
      'set-handle',
      'Set your profile handle after sign-in',
      (y) => y.option('handle', { type: 'string', demandOption: true, describe: 'Desired handle' }),
      handleError(async (argv) => {
        const data = await createProfile(argv.handle)
        console.log(`Handle set successfully:`)
        console.log(JSON.stringify(data, null, 2))
      })
    )
}

export const handler = () => {}
