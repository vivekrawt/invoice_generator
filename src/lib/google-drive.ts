import { google } from "googleapis";
import { Readable } from "stream";
import type { Invoice } from "@/types/database.types";

interface DriveConfig {
  isConfigured: boolean;
  clientEmail?: string;
  folderId?: string;
  folderUrl?: string;
}

export function getDriveConfig(): DriveConfig {
  let clientEmail = (
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    ""
  ).trim();
  let privateKey = (
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    ""
  ).trim();
  let folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || "").trim();

  // Strip surrounding quotes if user wrapped them in "..." or '...'
  if (
    (clientEmail.startsWith('"') && clientEmail.endsWith('"')) ||
    (clientEmail.startsWith("'") && clientEmail.endsWith("'"))
  ) {
    clientEmail = clientEmail.slice(1, -1).trim();
  }
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1).trim();
  }
  if (
    (folderId.startsWith('"') && folderId.endsWith('"')) ||
    (folderId.startsWith("'") && folderId.endsWith("'"))
  ) {
    folderId = folderId.slice(1, -1).trim();
  }

  // If the user pasted the entire Google Drive folder URL instead of just the folder ID:
  // e.g. https://drive.google.com/drive/folders/1abcXYZ_123...
  if (folderId.includes("/folders/")) {
    const match = folderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match?.[1]) {
      folderId = match[1];
    }
  }

  const isConfigured = Boolean(
    clientEmail.length > 0 && privateKey.length > 0 && folderId.length > 0
  );

  return {
    isConfigured,
    clientEmail: clientEmail || undefined,
    folderId: folderId || undefined,
    folderUrl: folderId
      ? `https://drive.google.com/drive/folders/${folderId}`
      : undefined,
  };
}

function getDriveClient() {
  const { isConfigured, clientEmail } = getDriveConfig();
  if (!isConfigured || !clientEmail) {
    throw new Error(
      "Google Drive service account credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID in environment variables."
    );
  }

  let privateKey = (
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    ""
  ).trim();

  // Strip surrounding quotes if present
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1).trim();
  }

  // Handle newline escapes in private key environment variables
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

/**
 * Searches for or creates a subfolder within the root folder (e.g. "FY 2024-25")
 */
async function getOrCreateYearFolder(
  drive: ReturnType<typeof google.drive>,
  parentFolderId: string,
  yearName: string
): Promise<string> {
  const cleanYear = yearName.trim();
  const folderName = cleanYear.startsWith("FY") ? cleanYear : `FY ${cleanYear}`;

  try {
    const query = `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await drive.files.list({
      q: query,
      fields: "files(id, name)",
      spaces: "drive",
    });

    const existing = searchRes.data.files?.[0];
    if (existing?.id) {
      return existing.id;
    }

    // Create subfolder
    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
      fields: "id, name",
    });

    if (!createRes.data.id) {
      throw new Error(`Could not create folder for ${folderName}`);
    }

    return createRes.data.id;
  } catch (err) {
    console.warn("Folder search/create fallback to root parent folder:", err);
    return parentFolderId;
  }
}

export interface UploadResult {
  fileId: string;
  webViewLink: string;
  fileName: string;
}

/**
 * Uploads an invoice PDF buffer to the corresponding financial year subfolder on Google Drive
 */
export async function uploadInvoicePdfToDrive(
  invoice: Invoice,
  pdfBuffer: Buffer
): Promise<UploadResult> {
  const config = getDriveConfig();
  if (!config.isConfigured || !config.folderId) {
    throw new Error(
      "Google Drive is not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID."
    );
  }

  const drive = getDriveClient();

  // Find or create Year subfolder
  const yearFolderId = await getOrCreateYearFolder(
    drive,
    config.folderId,
    invoice.financial_year || new Date().getFullYear().toString()
  );

  // Clean filename: e.g. "Invoice ABR-2024-25-001 - Customer Name.pdf"
  const sanitizedInvoiceNumber = invoice.invoice_number.replace(/[\/\\:]/g, "-");
  const sanitizedCustomer = (invoice.customer_snapshot?.customer_name || "Customer")
    .replace(/[\/\\:*?"<>|]/g, "")
    .trim();
  const fileName = `Invoice ${sanitizedInvoiceNumber} - ${sanitizedCustomer}.pdf`;

  // Check if file already exists in this folder to avoid duplicates
  const existingQuery = `'${yearFolderId}' in parents and name = '${fileName}' and trashed = false`;
  let existingFileId: string | null = null;
  try {
    const listRes = await drive.files.list({
      q: existingQuery,
      fields: "files(id, name, webViewLink)",
      spaces: "drive",
    });
    existingFileId = listRes.data.files?.[0]?.id || null;
  } catch (e) {
    console.warn("Drive existing file check notice:", e);
  }

  const media = {
    mimeType: "application/pdf",
    body: Readable.from(pdfBuffer),
  };

  let fileId = "";
  let webViewLink = "";

  if (existingFileId) {
    // Update existing file content
    const updateRes = await drive.files.update({
      fileId: existingFileId,
      media,
      fields: "id, name, webViewLink",
    });
    fileId = updateRes.data.id || existingFileId;
    webViewLink = updateRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  } else {
    // Create new file
    const createRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [yearFolderId],
        mimeType: "application/pdf",
      },
      media,
      fields: "id, name, webViewLink",
    });

    fileId = createRes.data.id || "";
    webViewLink = createRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    // Make file viewable with link
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    } catch (permErr) {
      console.warn("Public permission create notice (inherits folder permissions):", permErr);
    }
  }

  if (!fileId) {
    throw new Error("Failed to receive Google Drive file ID from upload response.");
  }

  return {
    fileId,
    webViewLink: webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    fileName,
  };
}
