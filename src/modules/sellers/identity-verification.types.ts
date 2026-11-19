export type IdentityDocument = {
  id: string;
  documentType:
    | "national_id"
    | "passport"
    | "business_license"
    | "bank_statement"
    | "other";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  createdAt: Date;
};
