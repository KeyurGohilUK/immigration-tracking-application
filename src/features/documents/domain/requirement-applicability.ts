import { DOCUMENT_VAULT_SECTIONS } from "./document-vault";

export interface RequirementApplicabilityRecord {
  version: 1;
  profileId: string;
  notApplicableRequirementIds: string[];
  updatedAt: string;
}

export const CONDITIONAL_DOCUMENT_REQUIREMENT_IDS =
  DOCUMENT_VAULT_SECTIONS.flatMap(({ requirements }) =>
    requirements
      .filter(({ priority }) => priority === "conditional")
      .map(({ id }) => id),
  );

export function isConditionalDocumentRequirement(id: string): boolean {
  return CONDITIONAL_DOCUMENT_REQUIREMENT_IDS.includes(id);
}

export function isRequirementApplicabilityRecord(
  value: unknown,
  profileId?: string,
): value is RequirementApplicabilityRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<RequirementApplicabilityRecord>;
  return (
    record.version === 1 &&
    typeof record.profileId === "string" &&
    (profileId === undefined || record.profileId === profileId) &&
    Array.isArray(record.notApplicableRequirementIds) &&
    new Set(record.notApplicableRequirementIds).size ===
      record.notApplicableRequirementIds.length &&
    record.notApplicableRequirementIds.every(
      (id) => typeof id === "string" && isConditionalDocumentRequirement(id),
    ) &&
    typeof record.updatedAt === "string" &&
    !Number.isNaN(Date.parse(record.updatedAt))
  );
}

export function isRequirementApplicabilityCollection(
  value: unknown,
  profileId: string,
): value is RequirementApplicabilityRecord[] {
  return (
    Array.isArray(value) &&
    value.length <= 1 &&
    value.every((record) => isRequirementApplicabilityRecord(record, profileId))
  );
}
