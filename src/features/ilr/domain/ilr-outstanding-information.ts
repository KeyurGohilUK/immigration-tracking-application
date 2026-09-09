import type { AbsenceCheckResult } from "../../calculation/domain/absence-calculation";
import type { QualifyingPeriodResult } from "../../calculation/domain/qualifying-period-calculation";
import type { DocumentVaultProgress } from "../../documents/domain/document-vault";
import {
  isEnglishRequirementComplete,
  isLifeInUkComplete,
  type LifeEnglishRecord,
} from "../../documents/domain/life-english";

export interface IlrOutstandingItem {
  id: string;
  label: string;
  detail: string;
  severity: "todo" | "review";
}

export function getIlrOutstandingInformation(
  period: QualifyingPeriodResult,
  absence: AbsenceCheckResult,
  lifeEnglish: LifeEnglishRecord | null,
  documentVault: DocumentVaultProgress | null,
): IlrOutstandingItem[] {
  const items: IlrOutstandingItem[] = [];

  if (period.status === "incomplete" || period.status === "unsupported") {
    items.push({
      id: "permission-history",
      label: "Permission history",
      detail:
        period.issues.includes("no-permission-history")
          ? "Add immigration permission history so the qualifying period can be calculated."
          : "Review the recorded permission history because the qualifying period is not fully calculated.",
      severity: "review",
    });
  } else if (period.status === "manual-review") {
    items.push({
      id: "permission-review",
      label: "Qualifying period",
      detail:
        "Review the recorded permission history because the calculation contains an issue that needs checking.",
      severity: "review",
    });
  }

  if (
    absence.status === "incomplete" ||
    absence.status === "unsupported" ||
    absence.status === "manual-review" ||
    absence.status === "potentially-over-limit"
  ) {
    items.push({
      id: "absence-review",
      label: "Travel & absences",
      detail:
        absence.status === "potentially-over-limit"
          ? "Recorded absences may exceed the applicable limit and need review."
          : absence.issues.includes("open-trip")
            ? "Complete the return date for the open trip so absence totals can be finalised."
            : absence.issues.includes("potentially-permitted")
              ? "Review the exceptional or potentially permitted absence and supporting evidence."
              : "Review travel and permission records so the absence check can be completed.",
      severity: "review",
    });
  }

  if (!isEnglishRequirementComplete(lifeEnglish)) {
    items.push({
      id: "english-language",
      label: "English language",
      detail: "Record how the English-language requirement is met or exempt.",
      severity: "todo",
    });
  }

  if (!isLifeInUkComplete(lifeEnglish)) {
    items.push({
      id: "life-in-uk",
      label: "Life in the UK",
      detail: "Record the Life in the UK result or applicable exemption.",
      severity: "todo",
    });
  }

  if (documentVault === null) {
    items.push({
      id: "document-vault-unavailable",
      label: "Document Vault",
      detail: "Document readiness is unavailable. Reopen the Vault and check the local data.",
      severity: "review",
    });
  } else if (documentVault.readinessPercent < 100) {
    const missing = Math.max(
      0,
      documentVault.totalRequired - documentVault.completedRequired,
    );
    items.push({
      id: "document-vault",
      label: "Document Vault",
      detail:
        missing === 1
          ? "1 applicable required item is still outstanding."
          : `${missing} applicable required items are still outstanding.`,
      severity: "todo",
    });
  }

  return items;
}
