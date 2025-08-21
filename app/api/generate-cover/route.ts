import { NextRequest, NextResponse } from "next/server";
import { uploadImageToR2, downloadImageAsBuffer, generateCoverFileName, deleteFileFromR2ByUrl } from "@/lib/r2";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function pollForResult(
  requestId: string,
  apiKey: string,
  maxAttempts = 60
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`Polling error: ${response.status}`);
        continue;
      }

      const result = await response.json();
      const data = result.data;
      const status = data.status;

      if (status === "completed") {
        const resultUrl = data.outputs[0];
        console.log("Task completed. URL:", resultUrl);
        return resultUrl;
      } else if (status === "failed") {
        console.error("Task failed:", data.error);
        return null;
      } else {
        console.log(
          `Task still processing. Status: ${status}, Attempt: ${attempt + 1}`
        );
      }

      // Wait 1 second before next poll
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Polling attempt ${attempt + 1} failed:`, error);
    }
  }

  console.error("Max polling attempts reached");
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { title, customPrompt, bookId } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Wavespeed API key not configured" },
        { status: 500 }
      );
    }

    // Submit the image generation task
    const submitResponse = await fetch(
      "https://api.wavespeed.ai/api/v3/google/imagen4",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Professional book cover design featuring the title "${title}" prominently displayed, high quality. ${
            customPrompt ? `Additional details: ${customPrompt}.` : ""
          } Do not include any other text or elements apart from the title.`,
          aspect_ratio: "3:4",
          num_images: 1,
          negative_prompt: "blurry, low quality, distorted text, book mockup, 3D book, physical book",
          enable_base64_output: false,
          seed: Math.floor(Math.random() * 1000000),
        }),
      }
    );

    if (!submitResponse.ok) {
      const errorData = await submitResponse.text();
      console.error(
        "Wavespeed API Submit Error:",
        submitResponse.status,
        errorData
      );
      return NextResponse.json(
        { error: "Failed to submit cover generation task" },
        { status: submitResponse.status }
      );
    }

    const submitData = await submitResponse.json();
    console.log("Wavespeed API Submit Response:", submitData);

    const requestId = submitData.data.id;
    console.log(`Task submitted successfully. Request ID: ${requestId}`);

    // Poll for the result
    const imageUrl = await pollForResult(requestId, apiKey);

    if (!imageUrl) {
      console.error("Failed to get image URL after polling");
      return NextResponse.json(
        { error: "Failed to generate cover image", fallbackUrl: "/cover.png" },
        { status: 500 }
      );
    }

    // Delete old cover from R2 if one exists
    if (bookId) {
      try {
        const existingBook = await prisma.book.findUnique({
          where: { id: bookId },
          select: { coverImage: true }
        });
        
        if (existingBook?.coverImage) {
          console.log("Deleting old cover from R2:", existingBook.coverImage);
          await deleteFileFromR2ByUrl('sellaudiobooks', existingBook.coverImage);
        }
      } catch (error) {
        console.warn("Failed to delete old cover, continuing with generation:", error);
      }
    }

    // Try to download the generated image and upload to R2
    try {
      console.log("Attempting to download generated image from:", imageUrl);
      const imageBuffer = await downloadImageAsBuffer(imageUrl);
      
      // Generate unique filename for R2
      const fileName = generateCoverFileName(bookId || 'unknown', title);
      
      // Upload to R2
      console.log("Attempting to upload image to R2 with filename:", fileName);
      const r2Url = await uploadImageToR2('sellaudiobooks', fileName, imageBuffer, 'image/png');
      
      console.log("Image successfully uploaded to R2:", r2Url);
      
      return NextResponse.json({ 
        imageUrl: r2Url,
        originalUrl: imageUrl,
        message: "Cover generated and uploaded to R2 successfully"
      });
      
    } catch (r2Error) {
      console.warn("R2 upload failed, falling back to original URL. Error:", r2Error);
      // If R2 upload fails, return the original temporary URL
      return NextResponse.json({ 
        imageUrl: imageUrl,
        fallbackUsed: true,
        message: "Cover generated successfully (using temporary URL - R2 upload failed)"
      });
    }
  } catch (error) {
    console.error("Error generating book cover:", error);
    return NextResponse.json(
      { error: "Failed to generate book cover", fallbackUrl: "/cover.png" },
      { status: 500 }
    );
  }
}
