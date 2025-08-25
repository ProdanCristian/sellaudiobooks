import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ChapterData {
  title: string;
  description: string;
  keyPoints: string[];
}

interface OutlineRequest {
  chapters: ChapterData[];
  suggestions?: string[];
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
    const { chapters, suggestions = [] }: OutlineRequest = await request.json();

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
          // Update existing outline - just update suggestions and recreate chapters
          // Delete existing outline chapters first
          await tx.outlineChapter.deleteMany({
            where: { outlineId: existingOutline.id },
          });

          // Update outline suggestions
          updatedOutline = await tx.outline.update({
            where: { id: existingOutline.id },
            data: {
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

        // Canonical server-side sync: make Chapter order/titles exactly match Outline (no content changes)
        try {
          const outlineChapters = await tx.outlineChapter.findMany({
            where: { outlineId: updatedOutline.id },
            orderBy: { order: "asc" },
          });

          const existingChapters = await tx.chapter.findMany({
            where: { bookId },
            orderBy: { order: "asc" },
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

          // 2) Reuse as many chapters as possible in order, update title and final order
          const reuseCount = Math.min(
            outlineChapters.length,
            existingChapters.length
          );
          for (let i = 0; i < reuseCount; i++) {
            await tx.chapter.update({
              where: { id: existingChapters[i].id },
              data: {
                order: i + 1,
                title: outlineChapters[i].title,
              },
            });
          }

          // 3) Create missing chapters if outline has more
          for (let i = reuseCount; i < outlineChapters.length; i++) {
            await tx.chapter.create({
              data: {
                title: outlineChapters[i].title,
                content: "",
                order: i + 1,
                wordCount: 0,
                bookId: bookId,
              },
            });
          }

          // 4) Delete extra chapters if existing had more
          for (
            let i = outlineChapters.length;
            i < existingChapters.length;
            i++
          ) {
            await tx.chapter.delete({ where: { id: existingChapters[i].id } });
          }
        } catch (syncError) {
          console.error("Chapter sync after outline save failed:", syncError);
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

function generateInitialContent(chapterData: ChapterData): string {
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
