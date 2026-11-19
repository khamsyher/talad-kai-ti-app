"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import {
  deletePrivateIdentityDocument,
  savePrivateIdentityDocument,
} from "@/lib/storage";
import { findSellerByUserId } from "./seller.repository";

const documentTypeSchema = z.enum([
  "national_id",
  "passport",
  "business_license",
  "bank_statement",
  "other",
]);

export async function uploadIdentityDocumentAction(
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "seller" && session.user.role !== "administrator") {
    redirect("/");
  }

  const seller = await findSellerByUserId(session.user.id);
  if (!seller) redirect("/seller");

  const documentType = documentTypeSchema.safeParse(formData.get("documentType"));
  const file = formData.get("document");
  if (!documentType.success || !(file instanceof File)) return;

  let storedPath: string | null = null;
  try {
    const saved = await savePrivateIdentityDocument(
      seller.id,
      file.name,
      file
    );
    storedPath = saved.storedPath;

    await pool.query(
      `
        INSERT INTO seller_verification_documents (
          seller_profile_id,
          uploaded_by,
          document_type,
          original_name,
          stored_path,
          mime_type,
          size_bytes,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      `,
      [
        seller.id,
        session.user.id,
        documentType.data,
        saved.originalName,
        storedPath,
        file.type,
        file.size,
      ]
    );

    await pool.query(
      `
        UPDATE seller_profiles
        SET identity_status = 'pending',
            identity_rejection_reason = NULL,
            identity_verified_at = NULL,
            updated_at = NOW()
        WHERE id = $1
      `,
      [seller.id]
    );
  } catch (error) {
    if (storedPath) {
      await deletePrivateIdentityDocument(storedPath);
    }
    throw error;
  }

  revalidatePath("/seller");
}
