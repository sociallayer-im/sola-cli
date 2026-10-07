import { uploadFile } from '../api-assets.js'
import { handleError } from '../utils.js'

export const command = 'upload <subcommand>'
export const describe = 'Upload a document to the sola datastore and print its public URL. Requires auth. (Images: see the existing image upload command.)'

export function builder(yargs) {
  return yargs
    .command(
      'file',
      'Upload a document (pdf, txt, csv, zip, Office files, or png/jpg/gif/webp). Max 10 MB. Prints {url, filename, size}.',
      (y) => y
        .option('path', { type: 'string', demandOption: true, describe: 'Local file path' })
        .option('content-type', { type: 'string', describe: 'Override the MIME type (default: from the file extension)' })
        .example('$0 upload file --path ./deck.pdf', 'Upload a PDF'),
      handleError(async (argv) => {
        console.log(JSON.stringify(await uploadFile(argv.path, argv['content-type']), null, 2))
      })
    )
    .demandCommand(1, 'Specify a subcommand')
}
