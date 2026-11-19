import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const maxIdentityDocumentBytes = 10 * 1024 * 1024;

export function getIdentityUploadDirectory() {
  return path.resolve(process.env.UPLOAD_DIR || ".private-uploads");
}

export function validateIdentityDocument(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Only JPG, PNG, WebP, and PDF files are allowed.");
  }
  if (file.size <= 0 || file.size > maxIdentityDocumentBytes) {
    throw new Error("Identity document must be between 1 byte and 10 MB.");
  }
}

export async function validateIdentityDocumentBytes(file: File) {
  validateIdentityDocument(file);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const isPdf =
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d;
  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  const matchesDeclaredType =
    (file.type === "application/pdf" && isPdf) ||
    (file.type === "image/jpeg" && isJpeg) ||
    (file.type === "image/png" && isPng) ||
    (file.type === "image/webp" && isWebp);

  if (!matchesDeclaredType) {
    throw new Error("File content does not match its declared format.");
  }

  return bytes;
}

export async function savePrivateIdentityDocument(
  sellerProfileId: string,
  originalName: string,
  file: File
) {
  const bytes = await validateIdentityDocumentBytes(file);
  const directory = path.join(getIdentityUploadDirectory(), sellerProfileId);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });

  const extension =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp";
  const storedName = `${randomUUID()}.${extension}`;
  const storedPath = path.join(directory, storedName);
  await fs.writeFile(storedPath, bytes, { mode: 0o600 });

  return {
    storedPath,
    originalName: path.basename(originalName).slice(0, 255),
  };
}

export async function deletePrivateIdentityDocument(storedPath: string) {
  await fs.unlink(storedPath).catch(() => undefined);
}
