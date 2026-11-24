import { google } from "googleapis";
import { Readable } from "stream";
import type { Invoice } from "@/types/database.types";

export interface DriveConfig {
  isConfigured: boolean;
  mode: "webhook" | "service_account" | "none";
  webhookUrl?: string;
  clientEmail?: string;
  folderId?: string;
  folderUrl?: string;
}

export function getDriveConfig(): DriveConfig {
  let webhookUrl = (
    process.env.GOOGLE_DRIVE_WEBHOOK_URL ||
    process.env.GOOGLE_SCRIPT_WEBHOOK_URL ||
    ""
  ).trim();

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

  // Strip surrounding quotes
  if (
    (webhookUrl.startsWith('"') && webhookUrl.endsWith('"')) ||
    (webhookUrl.startsWith("'") && webhookUrl.endsWith("'"))
  ) {
    webhookUrl = webhookUrl.slice(1, -1).trim();
  }
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

  if (folderId.includes("/folders/")) {
    const match = folderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match?.[1]) {
      folderId = match[1];
    }
  }

  const isWebhookConfigured = webhookUrl.startsWith("http");
  const isServiceAccountConfigured = Boolean(
    clientEmail.length > 0 && privateKey.length > 0 && folderId.length > 0
  );

  return {
    isConfigured: isWebhookConfigured || isServiceAccountConfigured,
    mode: isWebhookConfigured ? "webhook" : isServiceAccountConfigured ? "service_account" : "none",
    webhookUrl: isWebhookConfigured ? webhookUrl : undefined,
    clientEmail: clientEmail || undefined,
    folderId: folderId || undefined,
    folderUrl: folderId
      ? `https://drive.google.com/drive/folders/${folderId}`
      : undefined,
  };
}

function getDriveClient() {
  const { clientEmail } = getDriveConfig();
  let privateKey = (
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    ""
  ).trim();

  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1).trim();
  }

  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const impersonateUser = (
    process.env.GOOGLE_DRIVE_IMPERSONATE_USER ||
    process.env.GOOGLE_DRIVE_USER_EMAIL ||
    ""
  ).trim();

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
    subject: impersonateUser || undefined,
  });

  return google.drive({ version: "v3", auth });
}

/**
 * Uploads a file via Google Apps Script Webhook (runs as personal Gmail user, 15GB free quota).
 */
export async function uploadFileViaDriveWebhook({
  webhookUrl,
  fileName,
  fileBase64,
  folderType,
  subfolderName,
}: {
  webhookUrl: string;
  fileName: string;
  fileBase64: string;
  folderType: "invoices" | "rate-charts";
  subfolderName?: string;
}): Promise<UploadResult> {
  const cleanUrl = webhookUrl.trim();
  if (!cleanUrl.startsWith("http")) {
    throw new Error("Invalid Google Apps Script Webhook URL.");
  }

  const res = await fetch(cleanUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      fileName,
      fileBase64,
      folderType,
      subfolderName: subfolderName || "",
    }),
    redirect: "follow",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Apps Script returned status ${res.status}: ${errorText.slice(0, 150)}`);
  }

  const text = await res.text();
  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Google Apps Script returned unexpected response: ${text.slice(0, 150)}`);
  }

  if (!result.success) {
    throw new Error(result.error || "Google Apps Script upload failed.");
  }

  return {
    fileId: result.fileId || "",
    webViewLink: result.webViewLink || (result.fileId ? `https://drive.google.com/file/d/${result.fileId}/view` : ""),
    fileName,
  };
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
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const existing = searchRes.data.files?.[0];
    if (existing?.id) {
      return existing.id;
    }

    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
      fields: "id, name",
      supportsAllDrives: true,
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
 * Universal PDF upload dispatcher (prefers Google Apps Script Webhook, falls back to Service Account)
 */
export async function uploadPdfToDrive({
  fileName,
  pdfBuffer,
  folderType,
  subfolderName,
  customWebhookUrl,
}: {
  fileName: string;
  pdfBuffer: Buffer;
  folderType: "invoices" | "rate-charts";
  subfolderName?: string;
  customWebhookUrl?: string;
}): Promise<UploadResult> {
  const config = getDriveConfig();
  const effectiveWebhook = customWebhookUrl?.trim() || config.webhookUrl;

  if (effectiveWebhook) {
    return await uploadFileViaDriveWebhook({
      webhookUrl: effectiveWebhook,
      fileName,
      fileBase64: pdfBuffer.toString("base64"),
      folderType,
      subfolderName,
    });
  }

  // Fallback to Google Service Account
  if (!config.folderId) {
    throw new Error(
      "Google Drive is not configured. Please paste your Google Apps Script Webhook URL in Settings or set GOOGLE_DRIVE_WEBHOOK_URL in Vercel."
    );
  }

  const drive = getDriveClient();
  let targetFolderId = config.folderId;

  if (subfolderName) {
    targetFolderId = await getOrCreateYearFolder(drive, config.folderId, subfolderName);
  }

  const existingQuery = `'${targetFolderId}' in parents and name = '${fileName}' and trashed = false`;
  let existingFileId: string | null = null;
  try {
    const listRes = await drive.files.list({
      q: existingQuery,
      fields: "files(id, name, webViewLink)",
      spaces: "drive",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
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
    const updateRes = await drive.files.update({
      fileId: existingFileId,
      media,
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });
    fileId = updateRes.data.id || existingFileId;
    webViewLink = updateRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  } else {
    const createRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [targetFolderId],
        mimeType: "application/pdf",
      },
      media,
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });

    fileId = createRes.data.id || "";
    webViewLink = createRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
        supportsAllDrives: true,
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

/**
 * Uploads an invoice PDF buffer
 */
export async function uploadInvoicePdfToDrive(
  invoice: Invoice,
  pdfBuffer: Buffer,
  customWebhookUrl?: string
): Promise<UploadResult> {
  const sanitizedInvoiceNumber = invoice.invoice_number.replace(/[\/\\:]/g, "-");
  const sanitizedCustomer = (invoice.customer_snapshot?.customer_name || "Customer")
    .replace(/[\/\\:*?"<>|]/g, "")
    .trim();
  const fileName = `Invoice ${sanitizedInvoiceNumber} - ${sanitizedCustomer}.pdf`;

  return await uploadPdfToDrive({
    fileName,
    pdfBuffer,
    folderType: "invoices",
    subfolderName: invoice.financial_year || new Date().getFullYear().toString(),
    customWebhookUrl,
  });
}

/**
 * Uploads a Rate Chart PDF buffer
 */
export async function uploadRateChartPdfToDrive({
  orgName,
  pdfBuffer,
  customWebhookUrl,
}: {
  orgName?: string;
  pdfBuffer: Buffer;
  customWebhookUrl?: string;
}): Promise<UploadResult> {
  const safeOrg = orgName?.trim()
    ? ` - ${orgName.trim().replace(/[\/\\:*?"<>|]/g, "")}`
    : "";
  const fileName = `Abira enterprise rate chart${safeOrg}.pdf`;

  return await uploadPdfToDrive({
    fileName,
    pdfBuffer,
    folderType: "rate-charts",
    customWebhookUrl,
  });
}
