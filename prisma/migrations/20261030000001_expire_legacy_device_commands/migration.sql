-- Follow-up transaction: all enum labels were committed by the preceding
-- migration. No historical rows are deleted; unfinished legacy dispatches are
-- made terminal so they cannot be actuated by a newly deployed device.
UPDATE "DeviceCommand"
SET "status" = 'EXPIRED',
    "processedAt" = COALESCE("processedAt", CURRENT_TIMESTAMP),
    "error" = COALESCE("error", 'Expired during reliable command lifecycle migration')
WHERE "status" IN ('PENDING', 'SENT');
