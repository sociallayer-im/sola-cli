import { uploadImage } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'service <subcommand>'
export const describe = 'Utility services: image uploads'

export function builder(yargs) {
  return yargs
    .command(
      'upload-image',
      'Upload an image file (png/jpeg/gif/webp/svg, max 10MB) to Cloudflare Images. Returns its delivery URL. Requires auth. There is only one storage backend now — no --provider option.',
      (y) => y
        .option('file', {
          type: 'string',
          demandOption: true,
          describe: 'Path to image file to upload (e.g. /path/to/image.jpg)',
        })
        .example('$0 service upload-image --file ./cover.jpg', 'Upload an image'),
      handleError(async (argv) => {
        console.log(`Uploading image: ${argv.file}...`)
        const result = await uploadImage(argv.file)
        console.log(`Image uploaded successfully:`)
        console.log(JSON.stringify(result, null, 2))
      })
    )
}
