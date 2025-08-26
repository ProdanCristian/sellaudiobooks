import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shouldUpdateBookStatus } from "@/lib/book-status";

interface ChapterData {
  title: string;
  description: string;
  keyPoints: string[];
}

interface OutlineRequest {
  chapters: ChapterData[];
  suggestions?: string[];
  // When true, do not touch actual book chapters; only update outline model
  skipChapterSync?: boolean;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookId = params.id;
    const {
      chapters,
      suggestions = [],
      skipChapterSync = false,
    }: OutlineRequest = await request.json();

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json(
        { error: "Chapters array is required" },
        { status: 400 }
      );
    }

    // Verify book ownership
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId: session.user.id,
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Use a shorter transaction with increased timeout for heavy operations
    const result = await prisma.$transaction(
      async (tx) => {
        // First, try to find existing outline
        const existingOutline = await tx.outline.findUnique({
          where: { bookId },
          include: { chapters: true },
        });

        let updatedOutline;

        if (existingOutline) {
          // Update existing outline - first delete all existing chapters, then recreate
          await tx.outlineChapter.deleteMany({
            where: { outlineId: existingOutline.id },
          });

          // Update outline suggestions only
          updatedOutline = await tx.outline.update({
            where: { id: existingOutline.id },
            data: {
              suggestions,
            },
          });

          // Create new outline chapters separately to avoid constraint conflicts
          for (let i = 0; i < chapters.length; i++) {
            await tx.outlineChapter.create({
              data: {
                title: chapters[i].title,
                description: chapters[i].description,
                keyPoints: chapters[i].keyPoints,
                order: i + 1,
                outlineId: existingOutline.id,
              },
            });
          }

          // Re-fetch the updated outline with chapters
          const refetchedOutline = await tx.outline.findUnique({
            where: { id: existingOutline.id },
            include: {
              chapters: {
                orderBy: { order: "asc" },
              },
            },
          });

          if (!refetchedOutline) {
            throw new Error("Failed to refetch updated outline");
          }

          updatedOutline = refetchedOutline;
        } else {
          // Create new outline if none exists
          updatedOutline = await tx.outline.create({
            data: {
              bookId,
              suggestions,
              chapters: {
                create: chapters.map((chapterData, index) => ({
                  title: chapterData.title,
                  description: chapterData.description,
                  keyPoints: chapterData.keyPoints,
                  order: index + 1,
                })),
              },
            },
            include: {
              chapters: {
                orderBy: { order: "asc" },
              },
            },
          });
        }

        // Optionally sync actual chapters. Skipped for outline-only operations like reordering.
        if (!skipChapterSync) {
          try {
            const outlineChapters = await tx.outlineChapter.findMany({
              where: { outlineId: updatedOutline.id },
              orderBy: { order: "asc" },
            });

            const existingChapters = await tx.chapter.findMany({
              where: { bookId },
              orderBy: { order: "asc" },
            });

            // Create a map of existing chapters by title for content preservation
            const chaptersByTitle = new Map();
            existingChapters.forEach((chapter) => {
              chaptersByTitle.set(chapter.title.toLowerCase().trim(), chapter);
            });

            const minOrder =
              existingChapters.length > 0 ? existingChapters[0].order : 1;
            const tempBase = minOrder - 1000000;

            // 1) Move all existing chapters to unique temporary orders
            for (let i = 0; i < existingChapters.length; i++) {
              await tx.chapter.update({
                where: { id: existingChapters[i].id },
                data: { order: tempBase - i },
              });
            }

            // 2) Process outline chapters and match with existing ones by title
            const usedChapterIds = new Set();
            for (let i = 0; i < outlineChapters.length; i++) {
              const outlineChapter = outlineChapters[i];
              const matchingChapter = chaptersByTitle.get(
                outlineChapter.title.toLowerCase().trim()
              );

              if (matchingChapter && !usedChapterIds.has(matchingChapter.id)) {
                // Update existing chapter with new position and title (preserve content)
                await tx.chapter.update({
                  where: { id: matchingChapter.id },
                  data: {
                    order: i + 1,
                    title: outlineChapter.title, // Update title in case of minor changes
                  },
                });
                usedChapterIds.add(matchingChapter.id);
              } else {
                // Create new chapter if no matching title found
                await tx.chapter.create({
                  data: {
                    title: outlineChapter.title,
                    content: "",
                    order: i + 1,
                    wordCount: 0,
                    bookId: bookId,
                  },
                });
              }
            }

            // 3) Delete chapters that are no longer in the outline
            for (const chapter of existingChapters) {
              if (!usedChapterIds.has(chapter.id)) {
                await tx.chapter.delete({ where: { id: chapter.id } });
              }
            }
          } catch (syncError) {
            console.error("Chapter sync after outline save failed:", syncError);
          }
        }

        // After potential chapter sync, update the book status based on chapter count
        try {
          if (!skipChapterSync) {
            const chaptersCount = await tx.chapter.count({ where: { bookId } });
            const maybeNewStatus = shouldUpdateBookStatus(
              { chaptersCount },
              book.status
            );
            if (maybeNewStatus) {
              await tx.book.update({
                where: { id: bookId },
                data: { status: maybeNewStatus },
              });
            }
          }
        } catch (statusError) {
          console.error(
            "Failed to update book status after outline sync:",
            statusError
          );
        }

        return { outline: updatedOutline };
      },
      {
        maxWait: 10000, // 10 seconds
        timeout: 15000, // 15 seconds
      }
    );

    return NextResponse.json({
      success: true,
      outline: result.outline,
    });
  } catch (error) {
    console.error("Error creating outline:", error);
    return NextResponse.json(
      { error: "Failed to create outline" },
      { status: 500 }
    );
  }
}

// PATCH method for updating individual chapter titles
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookId = params.id;
    const { chapterId, title, description, keyPoints } = await request.json();

    if (!chapterId || !title) {
      return NextResponse.json(
        { error: "Chapter ID and title are required" },
        { status: 400 }
      );
    }

    // Verify book ownership
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId: session.user.id,
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Update the outline chapter with all provided fields
    const updateData: any = {
      title: title.trim(),
    };

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (keyPoints !== undefined) {
      updateData.keyPoints = keyPoints;
    }

    const updatedChapter = await prisma.outlineChapter.update({
      where: {
        id: chapterId,
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      chapter: updatedChapter,
    });
  } catch (error) {
    console.error("Error updating chapter title:", error);
    return NextResponse.json(
      { error: "Failed to update chapter title" },
      { status: 500 }
    );
  }
}

// DELETE method for deleting outline
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookId = params.id;

    // Verify book ownership
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId: session.user.id,
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Delete existing outline if any
    const existingOutline = await prisma.outline.findUnique({
      where: { bookId },
    });

    if (existingOutline) {
      await prisma.outline.delete({
        where: { bookId },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Outline deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting outline:", error);
    return NextResponse.json(
      { error: "Failed to delete outline" },
      { status: 500 }
    );
  }
}

function generateInitialContent(chapterData: {
  title: string;
  description: string;
  keyPoints: string[];
}): string {
  // Generate initial HTML structure with outline content only
  const keyPointsList = chapterData.keyPoints
    .map((point) => `<li>${point}</li>`)
    .join("");

  return `<p><strong>Chapter Overview:</strong> ${chapterData.description}</p>

<h2>Key Topics to Cover:</h2>
<ul>
${keyPointsList}
</ul>`;
}
