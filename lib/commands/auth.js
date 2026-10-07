import { createInterface } from 'readline'
import {
  requestCode, verifyCode, getMe,
  requestPhoneCode, verifyPhoneCode, bindPhone, bindEmail,
} from '../api.js'
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

// Shared two-step flow for the phone/bind commands: send a code unless --code
// is given and --send-only is not set, then complete with the code (from
// --code, an interactive prompt, or printed instructions when non-interactive).
async function codeFlow({ argv, label, sendCode, complete, retryHint }) {
  if (argv.code === undefined) {
    console.log(`Sending verification code to ${label}...`)
    await sendCode()
    if (argv.sendOnly) { console.log(`Code sent to ${label}`); return }
    if (process.stdin.isTTY) {
      await complete(await prompt('Enter the verification code: '))
      return
    }
    console.log('Code sent. Complete with:')
    console.log(`  ${retryHint} --code <code>`)
    return
  }
  await complete(argv.code)
}

// bind_* may answer { token, merged: true } when the identity already had an
// account and the two were merged — the old token is then stale.
async function reportBind(data) {
  if (data?.token) {
    await saveToken(data.token)
    console.log('Accounts merged; new token saved to ~/.sola/config.json')
  }
  console.log(JSON.stringify(data?.token ? { ...data, token: '(saved)' } : data, null, 2))
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
    .command(
      'signin-phone',
      'Sign in with an SMS one-time code. CN deployment only (juluo.xyz; elsewhere the endpoints 404) and +86 mainland mobile numbers only. Saves the JWT on success; new numbers sign up automatically. Rate limited: 30s between sends, 10/hour per number.',
      (y) => y
        .option('phone', { type: 'string', demandOption: true, describe: 'Mainland China mobile number (e.g. 13800138000 or +8613800138000)' })
        .option('send-only', { type: 'boolean', describe: 'Send the code and exit' })
        .option('code', { type: 'string', describe: 'Verification code. If given, skips sending and completes signin.' })
        .example('$0 auth signin-phone --phone 13800138000', 'Send code, prompt for it')
        .example('$0 auth signin-phone --phone 13800138000 --code 123456', 'Complete signin with a code'),
      handleError(async (argv) => {
        await codeFlow({
          argv, label: argv.phone,
          sendCode: () => requestPhoneCode(argv.phone),
          complete: async (code) => {
            const data = await verifyPhoneCode(argv.phone, code)
            await saveToken(data.token)
            console.log('Signed in successfully. Token saved to ~/.sola/config.json')
          },
          retryHint: `sola auth signin-phone --phone ${argv.phone}`,
        })
      })
    )
    .command(
      'bind-email',
      'Attach an email to the signed-in account (for accounts created by wallet, WeChat or phone). Requires auth. The email can only be set once. If the email already has an account and yours is a fresh WeChat one, the two are merged and a new token is saved.',
      (y) => y
        .option('email', { type: 'string', demandOption: true, describe: 'Email address to bind' })
        .option('send-only', { type: 'boolean', describe: 'Send the code and exit' })
        .option('code', { type: 'string', describe: 'Verification code. If given, skips sending and completes the bind.' })
        .example('$0 auth bind-email --email me@example.com', 'Send code, prompt for it')
        .example('$0 auth bind-email --email me@example.com --code 123456', 'Complete the bind'),
      handleError(async (argv) => {
        await codeFlow({
          argv, label: argv.email,
          sendCode: () => requestCode(argv.email, 'bind_email'),
          complete: async (code) => reportBind(await bindEmail(argv.email, code)),
          retryHint: `sola auth bind-email --email ${argv.email}`,
        })
      })
    )
    .command(
      'bind-phone',
      'Attach a mobile number to the signed-in account. Requires auth. CN deployment only, +86 numbers only. The number can only be set once; whitelist group invites for it are accepted on success. May merge with an existing account for a fresh WeChat user.',
      (y) => y
        .option('phone', { type: 'string', demandOption: true, describe: 'Mainland China mobile number' })
        .option('send-only', { type: 'boolean', describe: 'Send the code and exit' })
        .option('code', { type: 'string', describe: 'Verification code. If given, skips sending and completes the bind.' })
        .example('$0 auth bind-phone --phone 13800138000', 'Send code, prompt for it')
        .example('$0 auth bind-phone --phone 13800138000 --code 123456', 'Complete the bind'),
      handleError(async (argv) => {
        await codeFlow({
          argv, label: argv.phone,
          sendCode: () => requestPhoneCode(argv.phone, 'bind_phone'),
          complete: async (code) => reportBind(await bindPhone(argv.phone, code)),
          retryHint: `sola auth bind-phone --phone ${argv.phone}`,
        })
      })
    )
}
