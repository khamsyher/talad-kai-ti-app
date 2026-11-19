import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await pool.query(
    `
      SELECT d.stored_path,
             d.original_name,
             d.mime_type,
             d.seller_profile_id,
             sp.user_id
      FROM seller_verification_documents d
      JOIN seller_profiles sp ON sp.id = d.seller_profile_id
      WHERE d.id = $1
      LIMIT 1
    `,
    [id]
  );
  const document = result.rows[0];
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (
    session.user.role !== "administrator" &&
    session.user.id !== document.user_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || ".private-uploads");
  const resolvedPath = path.resolve(document.stored_path);
  if (
    resolvedPath !== uploadDirectory &&
    !resolvedPath.startsWith(`${uploadDirectory}${path.sep}`)
  ) {
    return NextResponse.json({ error: "Invalid document path" }, { status: 500 });
  }

  try {
    const bytes = await fs.readFile(resolvedPath);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.mime_type,
        "Content-Disposition": `inline; filename="${String(document.original_name).replace(/["\\]/g, "_")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Document unavailable" }, { status: 404 });
  }
}
