import { BookStatus } from '@prisma/client'

interface BookStatusData {
  chaptersCount: number
  totalWordCount?: number
}

/**
 * Determines the appropriate book status based on content
 */
export function calculateBookStatus(data: BookStatusData, currentStatus?: BookStatus): BookStatus {
  const hasChapters = data.chaptersCount > 0
  
  // Don't automatically downgrade from COMPLETED or PUBLISHED
  if (currentStatus === BookStatus.COMPLETED || currentStatus === BookStatus.PUBLISHED) {
    return currentStatus
  }
  
  // If there are chapters, move to IN_PROGRESS
  if (hasChapters) {
    return BookStatus.IN_PROGRESS
  }
  
  // Otherwise, stay as DRAFT
  return BookStatus.DRAFT
}

/**
 * Check if status should be updated and return new status if different
 */
export function shouldUpdateBookStatus(data: BookStatusData, currentStatus: BookStatus): BookStatus | null {
  const newStatus = calculateBookStatus(data, currentStatus)
  return newStatus !== currentStatus ? newStatus : null
}