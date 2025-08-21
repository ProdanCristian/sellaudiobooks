import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

// Initialize R2 client
const r2Client = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    // Use proper R2 API credentials if available, otherwise fallback to current setup
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCOUNT_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_TOKEN!,
  },
  forcePathStyle: true,
})

/**
 * Upload an image to R2 bucket
 */
export async function uploadImageToR2(
  bucketName: string,
  key: string,
  imageBuffer: Buffer,
  contentType: string = 'image/png'
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
    })
    
    await r2Client.send(command)
    
    // Return the public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
    return publicUrl
  } catch (error) {
    console.error('Error uploading image to R2:', error)
    throw error
  }
}

/**
 * Download image from URL and return as buffer
 */
export async function downloadImageAsBuffer(imageUrl: string): Promise<Buffer> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('Error downloading image:', error)
    throw error
  }
}

/**
 * Generate a unique filename for book cover
 */
export function generateCoverFileName(bookId: string, bookTitle: string): string {
  // Clean the title to make it URL-safe
  const cleanTitle = bookTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
  
  const timestamp = Date.now()
  // Store directly in covers folder without subdirectories
  return `covers/${cleanTitle}-${timestamp}.png`
}

/**
 * Delete a single file from R2 bucket
 */
export async function deleteFileFromR2(bucketName: string, key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    })
    await r2Client.send(command)
    console.log(`Successfully deleted file: ${key} from bucket: ${bucketName}`)
  } catch (error) {
    console.error(`Error deleting file ${key} from bucket ${bucketName}:`, error)
    throw error
  }
}

/**
 * Extract R2 key from a full R2 URL
 */
export function extractR2KeyFromUrl(url: string): string | null {
  try {
    if (!url) return null
    
    // Handle both public R2 URLs and direct bucket URLs
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL
    if (publicUrl && url.startsWith(publicUrl)) {
      return url.replace(`${publicUrl}/`, '')
    }
    
    // Fallback: try to extract key from URL path
    const urlObj = new URL(url)
    return urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname
  } catch (error) {
    console.error('Error extracting R2 key from URL:', url, error)
    return null
  }
}

/**
 * Delete file from R2 using its full URL
 */
export async function deleteFileFromR2ByUrl(bucketName: string, fileUrl: string): Promise<void> {
  const key = extractR2KeyFromUrl(fileUrl)
  if (!key) {
    console.warn(`Could not extract R2 key from URL: ${fileUrl}`)
    return
  }
  
  try {
    await deleteFileFromR2(bucketName, key)
  } catch (error) {
    console.error(`Failed to delete file from R2: ${fileUrl}`, error)
    // Don't throw - we don't want file cleanup failures to break the main operation
  }
}
