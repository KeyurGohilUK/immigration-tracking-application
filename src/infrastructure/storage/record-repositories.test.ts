import { describe, expect, it } from "vitest";
import { saveFamilyMembers } from "../../features/household/data/family-member-repository";
import { saveOwnerProfile } from "../../features/household/data/owner-profile-repository";
import type { FamilyMember } from "../../features/household/domain/family-member";
import type { OwnerProfile } from "../../features/household/domain/owner-profile";
import { saveImmigrationPermissions } from "../../features/immigration/data/immigration-permission-repository";
import type { ImmigrationPermission } from "../../features/immigration/domain/immigration-permission";
import { saveTrips } from "../../features/travel/data/trip-repository";
import type { Trip } from "../../features/travel/domain/trip";

const key = {} as CryptoKey;
const timestamp = "2026-08-30T10:00:00.000Z";

describe("encrypted repository save boundaries", () => {
  it("rejects invalid owner and family records before encryption", async () => {
    const owner: OwnerProfile = {
      version: 1,
      id: "owner",
      fullName: "Owner",
      dateOfBirth: "1990-01-01",
      createdAt: timestamp,
      updatedAt: "not-a-timestamp",
    };
    const member: FamilyMember = {
      version: 1,
      id: "family-1",
      fullName: "Family member",
      dateOfBirth: "2000-01-01",
      relationship: "other",
      immigrationRole: "not-set",
      createdAt: timestamp,
      updatedAt: "not-a-timestamp",
    };

    await expect(saveOwnerProfile(owner, key)).rejects.toThrow(
      "Owner profile is invalid",
    );
    await expect(saveFamilyMembers([member], key)).rejects.toThrow(
      "Family profiles are invalid",
    );
  });

  it("rejects mixed-profile permissions and overlapping trips before encryption", async () => {
    const permission: ImmigrationPermission = {
      version: 2,
      id: "permission-1",
      profileId: "family-1",
      route: "skilled-worker",
      otherRouteName: "",
      role: "main-applicant",
      grantDate: "2023-12-15",
      permissionStartDate: "2024-01-01",
      permissionExpiryDate: "2026-12-31",
      actualUkArrivalDate: "2024-01-15",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const trip: Trip = {
      version: 1,
      id: "trip-1",
      profileId: "owner",
      departureDate: "2024-01-01",
      returnDate: "2024-01-10",
      destination: "India",
      notes: "",
      exceptionalAbsence: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await expect(
      saveImmigrationPermissions("owner", [permission], key),
    ).rejects.toThrow("Immigration permissions are invalid");
    await expect(
      saveTrips(
        "owner",
        [
          trip,
          {
            ...trip,
            id: "trip-2",
            departureDate: "2024-01-05",
            returnDate: "2024-01-15",
          },
        ],
        key,
      ),
    ).rejects.toThrow("Trips are invalid");
  });
});
