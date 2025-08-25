import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { countWordsInHTML } from "@/lib/text-utils";
import { shouldUpdateBookStatus } from "@/lib/book-status";

const prisma = new PrismaClient();

interface Params {
  id: string;
  chapterId: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id, chapterId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const book = await prisma.book.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const chapter = await prisma.chapter.findFirst({
      where: {
        id: chapterId,
        bookId: id,
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, content, order } = body;

    // Only compute and update wordCount if content is provided
    const shouldUpdateContent = content !== undefined;
    const computedWordCount = shouldUpdateContent
      ? countWordsInHTML(content)
      : undefined;

    // If order change is requested, perform a safe swap to preserve the unique (bookId, order)
    if (order !== undefined && order !== chapter.order) {
      const result = await prisma.$transaction(async (tx) => {
        // Find any conflicting chapter that already has the desired order
        const conflicting = await tx.chapter.findFirst({
          where: {
            bookId: id,
            order: order,
            NOT: { id: chapterId },
          },
        });

        // Choose a temporary order value that is guaranteed to be free
        let tempOrder: number | null = null;
        if (conflicting) {
          const minChapter = await tx.chapter.findFirst({
            where: { bookId: id },
            orderBy: { order: "asc" },
          });
          const minOrder = minChapter ? minChapter.order : 1;
          tempOrder = minOrder - 1000000; // large negative to avoid collisions

          // 1) Move the conflicting chapter to a temporary slot
          await tx.chapter.update({
            where: { id: conflicting.id },
            data: { order: tempOrder },
          });
        }

        // 2) Update the current chapter to the desired slot (and other fields)
        const updated = await tx.chapter.update({
          where: { id: chapterId },
          data: {
            ...(title !== undefined && { title: title.trim() }),
            ...(shouldUpdateContent && { content }),
            order: order,
            ...(shouldUpdateContent &&
              computedWordCount !== undefined && {
                wordCount: computedWordCount,
              }),
          },
        });

        // 3) If there was a conflict, put the conflicting chapter into the old order of the updated chapter
        if (conflicting && tempOrder !== null) {
          await tx.chapter.update({
            where: { id: conflicting.id },
            data: { order: chapter.order },
          });
        }

        return updated;
      });

      return NextResponse.json(result);
    }

    // Simple update when order did not change
    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(shouldUpdateContent && { content }),
        ...(shouldUpdateContent &&
          computedWordCount !== undefined && { wordCount: computedWordCount }),
      },
    });

    return NextResponse.json(updatedChapter);
  } catch (error) {
    console.error("Error updating chapter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id, chapterId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const book = await prisma.book.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
      include: {
        _count: {
          select: { chapters: true },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const chapter = await prisma.chapter.findFirst({
      where: {
        id: chapterId,
        bookId: id,
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    // Use transaction to delete chapter and potentially update book status
    await prisma.$transaction(async (tx) => {
      await tx.chapter.delete({
        where: { id: chapterId },
      });

      // Check if we should update book status (when going from 1 to 0 chapters)
      const newChapterCount = book._count.chapters - 1;
      const newStatus = shouldUpdateBookStatus(
        {
          chaptersCount: newChapterCount,
        },
        book.status
      );

      if (newStatus) {
        await tx.book.update({
          where: { id: id },
          data: { status: newStatus },
        });
      }
    });

    return NextResponse.json({ message: "Chapter deleted successfully" });
  } catch (error) {
    console.error("Error deleting chapter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
