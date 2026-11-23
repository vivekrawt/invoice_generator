import { NextResponse } from "next/server";
import { getDriveConfig } from "@/lib/google-drive";

export async function GET() {
  try {
    const config = getDriveConfig();
    return NextResponse.json({
      configured: config.isConfigured,
      clientEmail: config.clientEmail || null,
      folderId: config.folderId || null,
      folderUrl: config.folderUrl || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: false,
        error: error instanceof Error ? error.message : "Error checking Drive status",
      },
      { status: 500 }
    );
  }
}
