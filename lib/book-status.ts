import { BookStatus } from '@prisma/client'

interface BookStatusData {
  introduction?: string | null
  chaptersCount: number
  totalWordCount?: number
}

/**
 * Determines the appropriate book status based on content
 */
export function calculateBookStatus(data: BookStatusData, currentStatus?: BookStatus): BookStatus {
  const hasIntroduction = data.introduction && data.introduction.replace(/<[^>]*>/g, '').trim().length > 0
  const hasChapters = data.chaptersCount > 0
  
  // Don't automatically downgrade from COMPLETED or PUBLISHED
  if (currentStatus === BookStatus.COMPLETED || currentStatus === BookStatus.PUBLISHED) {
    return currentStatus
  }
  
  // If there's either introduction content or chapters, move to IN_PROGRESS
  if (hasIntroduction || hasChapters) {
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