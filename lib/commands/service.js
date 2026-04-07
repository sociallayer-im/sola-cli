import { uploadImage } from '../api.js'
import { handleError } from '../utils.js'

export const command = 'service <subcommand>'
export const describe = 'Utility services: image uploads and data exports'

export function builder(yargs) {
  return yargs
    .command(
      'upload-image',
      'Upload an image file to the Sola platform. Returns URL of the uploaded image. Requires auth.',
      (y) => y
        .option('file', {
          type: 'string',
          demandOption: true,
          describe: 'Path to image file to upload (e.g. /path/to/image.jpg)',
        })
        .option('provider', {
          type: 'string',
          describe: 'Storage provider: default (ImageKit), s3, or cloudflare (default: default)',
          default: 'default',
        })
        .example('$0 service upload-image --file ./cover.jpg', 'Upload image using ImageKit')
        .example('$0 service upload-image --file ./photo.png --provider s3', 'Upload to S3'),
      handleError(async (argv) => {
        console.log(`Uploading image: ${argv.file}...`)
        const result = await uploadImage(argv.file, argv.provider)
        console.log(`Image uploaded successfully:`)
        console.log(JSON.stringify(result, null, 2))
      })
    )
}
