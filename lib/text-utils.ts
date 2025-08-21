/**
 * Extract plain text from HTML content for word counting
 */
export function extractTextFromHTML(html: string): string {
  if (!html) return ''
  
  // Remove HTML tags and decode entities
  const text = html
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
  
  return text
}

/**
 * Count words in HTML content
 */
export function countWordsInHTML(html: string): number {
  const plainText = extractTextFromHTML(html)
  if (!plainText) return 0
  
  const words = plainText.split(/\s+/).filter(word => word.length > 0)
  return words.length
}