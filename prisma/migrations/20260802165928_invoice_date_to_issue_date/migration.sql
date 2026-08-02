-- Rename Invoice.date -> issueDate (preserve data), and its indexes.
ALTER TABLE "Invoice" RENAME COLUMN "date" TO "issueDate";
ALTER INDEX "Invoice_date_idx" RENAME TO "Invoice_issueDate_idx";
ALTER INDEX "Invoice_status_date_idx" RENAME TO "Invoice_status_issueDate_idx";
