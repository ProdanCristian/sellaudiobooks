import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { countWordsInHTML } from "@/lib/text-utils";
import { shouldUpdateBookStatus } from "@/lib/book-status";

const prisma = new PrismaClient();

interface Params {
  id: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
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
        chapters: {
          orderBy: { order: "desc" },
          take: 1,
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, content, order } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Chapter title is required" },
        { status: 400 }
      );
    }

    // Use provided order or calculate next order
    const nextOrder =
      order || (book.chapters.length > 0 ? book.chapters[0].order + 1 : 1);
    const wordCount = content ? countWordsInHTML(content) : 0;

    // Use transaction to create chapter and potentially update book status
    const result = await prisma.$transaction(async (tx) => {
      const chapter = await tx.chapter.create({
        data: {
          title: title.trim(),
          content: content?.trim() || "",
          order: nextOrder,
          wordCount,
          bookId: id,
        },
      });

      // Check if we should update book status (when first chapter is created)
      const newChapterCount = book.chapters.length + 1;
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

      return chapter;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating chapter:", error);
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
    const { id } = await params;
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

    // Delete all chapters for this book
    const deletedChapters = await prisma.chapter.deleteMany({
      where: {
        bookId: id,
      },
    });

    // Update book status back to DRAFT since chapters are deleted
    await prisma.book.update({
      where: { id: id },
      data: { status: "DRAFT" },
    });

    return NextResponse.json({
      message: "All chapters deleted successfully",
      deletedCount: deletedChapters.count,
    });
  } catch (error) {
    console.error("Error deleting chapters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
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
      include: { chapters: true },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const body = await request.json();
    const { updates } = body as {
      updates: Array<{ id: string; order: number; title?: string }>;
    };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "updates array is required" },
        { status: 400 }
      );
    }

    // Validate that all chapters belong to this book
    const updateIds = new Set(updates.map((u) => u.id));
    const chaptersById: Record<string, { id: string; order: number }> = {};
    for (const ch of book.chapters) {
      chaptersById[ch.id] = { id: ch.id, order: ch.order };
    }
    for (const u of updates) {
      if (!chaptersById[u.id]) {
        return NextResponse.json(
          { error: `Chapter ${u.id} does not belong to book` },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Compute a base temporary order below any existing order
      const minChapter = await tx.chapter.findFirst({
        where: { bookId: id },
        orderBy: { order: "asc" },
      });
      const minOrder = minChapter ? minChapter.order : 1;
      const tempBase = minOrder - 1000000;

      // Move all updated chapters to unique temporary orders to avoid unique collisions
      for (let i = 0; i < updates.length; i++) {
        const u = updates[i];
        await tx.chapter.update({
          where: { id: u.id },
          data: { order: tempBase - i },
        });
      }

      // Apply final orders and optional titles
      const updatedChapters = [] as any[];
      for (const u of updates) {
        const updated = await tx.chapter.update({
          where: { id: u.id },
          data: {
            order: u.order,
            ...(u.title !== undefined && { title: u.title }),
          },
        });
        updatedChapters.push(updated);
      }

      return updatedChapters;
    });

    return NextResponse.json({ success: true, chapters: result });
  } catch (error) {
    console.error("Error batch updating chapters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
