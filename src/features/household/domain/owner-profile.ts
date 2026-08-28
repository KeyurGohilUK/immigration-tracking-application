export interface OwnerProfile {
  version: 1;
  id: "owner";
  fullName: string;
  dateOfBirth: string;
  createdAt: string;
  updatedAt: string;
}

export function validateOwnerInput(
  fullName: string,
  dateOfBirth: string,
): string | null {
  const name = fullName.trim();
  if (name.length < 1 || name.length > 100)
    return "Enter a name between 1 and 100 characters.";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
    Number.isNaN(Date.parse(`${dateOfBirth}T00:00:00Z`))
  )
    return "Enter a valid date of birth.";
  if (dateOfBirth > new Date().toISOString().slice(0, 10))
    return "Date of birth cannot be in the future.";
  return null;
}

export function isOwnerProfile(value: unknown): value is OwnerProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<OwnerProfile>;
  return (
    profile.version === 1 &&
    profile.id === "owner" &&
    typeof profile.fullName === "string" &&
    validateOwnerInput(profile.fullName, profile.dateOfBirth ?? "") === null &&
    typeof profile.createdAt === "string" &&
    typeof profile.updatedAt === "string"
  );
}
