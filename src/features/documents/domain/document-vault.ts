import type { DocumentCategory, DocumentMetadata } from "./document";

export const DOCUMENT_VAULT_SECTION_IDS = [
  "identity-immigration",
  "address-history",
  "employment",
  "salary-tax",
  "travel-absences",
  "life-english",
  "family-dependants",
  "final-application",
  "additional",
] as const;

export const DOCUMENT_REQUIREMENT_PRIORITIES = [
  "required",
  "recommended",
  "conditional",
  "later",
] as const;

export const DOCUMENT_VAULT_STATUSES = [
  "complete",
  "partial",
  "needs-attention",
  "to-do",
  "required-later",
] as const;

export type DocumentVaultSectionId =
  (typeof DOCUMENT_VAULT_SECTION_IDS)[number];
export type DocumentRequirementPriority =
  (typeof DOCUMENT_REQUIREMENT_PRIORITIES)[number];
export type DocumentVaultStatus = (typeof DOCUMENT_VAULT_STATUSES)[number];

export interface DocumentRequirementDefinition {
  id: string;
  label: string;
  guidance: string;
  categories: readonly DocumentCategory[];
  priority: DocumentRequirementPriority;
}

export interface DocumentVaultSectionDefinition {
  id: DocumentVaultSectionId;
  label: string;
  description: string;
  icon: string;
  attentionWhenIncomplete?: boolean;
  requirements: readonly DocumentRequirementDefinition[];
}

export interface DocumentRequirementProgress extends DocumentRequirementDefinition {
  documentCount: number;
  complete: boolean;
}

export interface DocumentVaultSectionProgress extends Omit<
  DocumentVaultSectionDefinition,
  "requirements"
> {
  status: DocumentVaultStatus;
  completedRequired: number;
  totalRequired: number;
  completedItems: number;
  totalItems: number;
  requirements: DocumentRequirementProgress[];
}

export interface DocumentVaultProgress {
  readinessPercent: number;
  completedRequired: number;
  totalRequired: number;
  completedSections: number;
  sections: DocumentVaultSectionProgress[];
}

export const DOCUMENT_VAULT_SECTIONS: readonly DocumentVaultSectionDefinition[] =
  [
    {
      id: "identity-immigration",
      label: "Identity & Immigration",
      description: "Identity and immigration-status evidence.",
      icon: "⌾",
      requirements: [
        {
          id: "passport",
          label: "Passport",
          guidance: "Keep a clear copy of the relevant passport.",
          categories: ["passport"],
          priority: "required",
        },
        {
          id: "immigration-status",
          label: "Immigration status evidence",
          guidance:
            "Store the status evidence you plan to rely on for the application.",
          categories: ["immigration-evidence"],
          priority: "required",
        },
      ],
    },
    {
      id: "address-history",
      label: "Address History",
      description: "Evidence supporting the applicant's recorded UK addresses.",
      icon: "⌂",
      requirements: [
        {
          id: "address-proof",
          label: "Address evidence",
          guidance:
            "Add evidence that supports the address periods recorded in UrbanFox.",
          categories: ["address-proof"],
          priority: "required",
        },
      ],
    },
    {
      id: "employment",
      label: "Employment",
      description: "Employment evidence relevant to the application.",
      icon: "▣",
      requirements: [
        {
          id: "employer-letter",
          label: "Employer letter",
          guidance: "Store the employer letter you intend to submit.",
          categories: ["employer-letter"],
          priority: "required",
        },
        {
          id: "employment-contract",
          label: "Employment contract",
          guidance: "Add the relevant contract if it supports your evidence.",
          categories: ["employment-contract"],
          priority: "recommended",
        },
      ],
    },
    {
      id: "salary-tax",
      label: "Salary & Tax",
      description: "Pay and tax evidence supporting employment history.",
      icon: "£",
      attentionWhenIncomplete: true,
      requirements: [
        {
          id: "payslip",
          label: "Payslip evidence",
          guidance: "Add the payslip evidence you plan to rely on.",
          categories: ["payslip"],
          priority: "required",
        },
        {
          id: "tax-document",
          label: "Tax evidence",
          guidance: "Add relevant P60, tax statement, or equivalent evidence.",
          categories: ["tax-document"],
          priority: "required",
        },
      ],
    },
    {
      id: "travel-absences",
      label: "Travel & Absences",
      description: "Supporting evidence for recorded travel where useful.",
      icon: "✈",
      requirements: [
        {
          id: "travel-evidence",
          label: "Travel supporting evidence",
          guidance:
            "Add supporting evidence where it helps explain or verify an absence.",
          categories: ["travel-evidence"],
          priority: "recommended",
        },
      ],
    },
    {
      id: "life-english",
      label: "Life in the UK & English",
      description: "Evidence for tests or exemptions where applicable.",
      icon: "◇",
      requirements: [
        {
          id: "life-in-uk",
          label: "Life in the UK evidence",
          guidance: "Add evidence if this applies to the applicant.",
          categories: ["life-in-uk"],
          priority: "conditional",
        },
        {
          id: "english-language",
          label: "English-language evidence",
          guidance: "Add evidence if this applies to the applicant.",
          categories: ["english-language"],
          priority: "conditional",
        },
      ],
    },
    {
      id: "family-dependants",
      label: "Family / Dependants",
      description: "Relationship or dependant evidence where relevant.",
      icon: "♟",
      requirements: [
        {
          id: "relationship-evidence",
          label: "Relationship evidence",
          guidance: "Add supporting relationship evidence where relevant.",
          categories: ["relationship-evidence"],
          priority: "conditional",
        },
      ],
    },
    {
      id: "final-application",
      label: "Final Application Documents",
      description: "Documents produced or finalised near submission.",
      icon: "▤",
      requirements: [
        {
          id: "application-form",
          label: "Final application form",
          guidance: "Add the final application document when it is available.",
          categories: ["application-form"],
          priority: "later",
        },
        {
          id: "declaration-consent",
          label: "Declarations and consent",
          guidance: "Add final declarations or consent documents when ready.",
          categories: ["declaration-consent"],
          priority: "later",
        },
      ],
    },
    {
      id: "additional",
      label: "Additional Documents",
      description: "Other supporting evidence you choose to include.",
      icon: "＋",
      requirements: [
        {
          id: "additional",
          label: "Additional supporting evidence",
          guidance: "Store any other evidence that supports the application.",
          categories: ["additional-document", "other"],
          priority: "recommended",
        },
      ],
    },
  ];

export const DOCUMENT_VAULT_STATUS_LABELS: Record<DocumentVaultStatus, string> =
  {
    complete: "Complete",
    partial: "Partial",
    "needs-attention": "Needs attention",
    "to-do": "To do",
    "required-later": "Required later",
  };

export interface DocumentVaultProgressOptions {
  addressHistoryComplete?: boolean;
  addressHistoryEntryCount?: number;
  addressHistoryHasCurrentAddress?: boolean;
  lifeInUkComplete?: boolean;
  englishRequirementComplete?: boolean;
}

export function calculateDocumentVaultProgress(
  documents: readonly DocumentMetadata[],
  options: DocumentVaultProgressOptions = {},
): DocumentVaultProgress {
  const sections = DOCUMENT_VAULT_SECTIONS.map((section) =>
    calculateSectionProgress(section, documents, options),
  );
  const totalRequired = sections.reduce(
    (total, section) => total + section.totalRequired,
    0,
  );
  const completedRequired = sections.reduce(
    (total, section) => total + section.completedRequired,
    0,
  );
  const readinessPercent =
    totalRequired === 0
      ? 0
      : Math.round((completedRequired / totalRequired) * 100);

  return {
    readinessPercent,
    completedRequired,
    totalRequired,
    completedSections: sections.filter(({ status }) => status === "complete")
      .length,
    sections,
  };
}

function calculateSectionProgress(
  section: DocumentVaultSectionDefinition,
  documents: readonly DocumentMetadata[],
  options: DocumentVaultProgressOptions,
): DocumentVaultSectionProgress {
  const requirements = section.requirements.map((requirement) => {
    const documentCount = documents.filter((document) =>
      requirement.categories.includes(document.category),
    ).length;
    let complete = documentCount > 0;
    if (section.id === "address-history" && requirement.id === "address-proof")
      complete = options.addressHistoryComplete === true && documentCount > 0;
    if (section.id === "life-english" && requirement.id === "life-in-uk")
      complete = options.lifeInUkComplete === true;
    if (section.id === "life-english" && requirement.id === "english-language")
      complete = options.englishRequirementComplete === true;
    return {
      ...requirement,
      documentCount,
      complete,
    };
  });

  const required = requirements.filter(
    ({ priority }) => priority === "required",
  );
  const completedRequired = required.filter(({ complete }) => complete).length;
  const completedItems = requirements.filter(({ complete }) => complete).length;
  const allLater =
    requirements.length > 0 &&
    requirements.every(({ priority }) => priority === "later");

  let status: DocumentVaultStatus;
  if (section.id === "address-history") {
    if (options.addressHistoryHasCurrentAddress === false)
      status = "needs-attention";
    else if (
      options.addressHistoryComplete === true &&
      requirements.every(({ complete }) => complete)
    )
      status = "complete";
    else if ((options.addressHistoryEntryCount ?? 0) > 0) status = "partial";
    else status = "to-do";
  } else if (allLater) status = "required-later";
  else if (
    (required.length > 0 && completedRequired === required.length) ||
    (required.length === 0 &&
      requirements.length > 0 &&
      requirements.every(({ complete }) => complete))
  )
    status = "complete";
  else if (section.attentionWhenIncomplete && required.length > 0)
    status = "needs-attention";
  else if (completedItems > 0) status = "partial";
  else status = "to-do";

  return {
    ...section,
    requirements,
    status,
    completedRequired,
    totalRequired: required.length,
    completedItems,
    totalItems: requirements.length,
  };
}

export function getDefaultCategoryForSection(
  sectionId: string,
): DocumentCategory | null {
  if (!DOCUMENT_VAULT_SECTION_IDS.includes(sectionId as DocumentVaultSectionId))
    return null;
  const section = DOCUMENT_VAULT_SECTIONS.find(({ id }) => id === sectionId);
  const requirement = section?.requirements.find(
    ({ categories }) => categories.length > 0,
  );
  return requirement?.categories[0] ?? null;
}
