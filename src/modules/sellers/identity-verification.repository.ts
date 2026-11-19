import { query } from "@/lib/db";
import type { IdentityDocument } from "./identity-verification.types";

export async function listSellerIdentityDocuments(
  sellerProfileId: string
): Promise<IdentityDocument[]> {
  const result = await query<{
    id: string;
    document_type: IdentityDocument["documentType"];
    original_name: string;
    mime_type: string;
    size_bytes: number;
    status: IdentityDocument["status"];
    rejection_reason: string | null;
    created_at: Date;
  }>(
    `
      SELECT id, document_type, original_name, mime_type, size_bytes,
             status, rejection_reason, created_at
      FROM seller_verification_documents
      WHERE seller_profile_id = $1
      ORDER BY created_at DESC
    `,
    [sellerProfileId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    documentType: row.document_type,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  }));
}
