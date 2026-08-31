import { describe, expect, it } from "vitest";
import { saveHouseholdMembers } from "../../features/household/data/household-member-repository";
import type { HouseholdMember } from "../../features/household/domain/household-member";
import { saveImmigrationPermissions } from "../../features/immigration/data/immigration-permission-repository";
import type { ImmigrationPermission } from "../../features/immigration/domain/immigration-permission";
import { saveTrips } from "../../features/travel/data/trip-repository";
import type { Trip } from "../../features/travel/domain/trip";

const key = {} as CryptoKey;
const timestamp = "2026-08-30T10:00:00.000Z";

describe("encrypted repository save boundaries", () => {
  it("rejects invalid household members before encryption", async () => {
    const member: HouseholdMember = {
      version: 1,
      id: "member-1",
      fullName: "Household member",
      dateOfBirth: "2000-01-01",
      immigrationRole: "not-set",
      createdAt: timestamp,
      updatedAt: "not-a-timestamp",
    };

    await expect(saveHouseholdMembers([member], key)).rejects.toThrow(
      "Household members are invalid",
    );
  });

  it("rejects mixed-profile permissions and overlapping trips before encryption", async () => {
    const permission: ImmigrationPermission = {
      version: 2,
      id: "permission-1",
      profileId: "member-1",
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
      profileId: "member-1",
      departureDate: "2024-01-01",
      returnDate: "2024-01-10",
      destination: "India",
      notes: "",
      exceptionalAbsence: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await expect(
      saveImmigrationPermissions("member-1", [permission], key),
    ).rejects.toThrow("Immigration permissions are invalid");
    await expect(
      saveTrips(
        "member-1",
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
