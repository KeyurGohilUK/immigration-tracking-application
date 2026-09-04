import { describe, expect, it } from "vitest";
import { saveHouseholdMembers } from "../../features/household/data/household-member-repository";
import type { HouseholdMember } from "../../features/household/domain/household-member";
import { saveImmigrationPermissions } from "../../features/immigration/data/immigration-permission-repository";
import type { ImmigrationPermission } from "../../features/immigration/domain/immigration-permission";
import { saveTrips } from "../../features/travel/data/trip-repository";
import type { Trip } from "../../features/travel/domain/trip";
import { saveAddressHistory } from "../../features/documents/data/address-history-repository";
import type { AddressHistoryEntry } from "../../features/documents/domain/address-history";
import { saveLifeEnglishRecord } from "../../features/documents/data/life-english-repository";
import type { LifeEnglishRecord } from "../../features/documents/domain/life-english";
import {
  saveDocument,
  saveDocumentMetadataBatch,
} from "../../features/documents/data/document-repository";
import type { DocumentMetadata } from "../../features/documents/domain/document";

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
      profileId: "member-2",
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

  it("rejects address and Life/English records that belong to another profile", async () => {
    const address: AddressHistoryEntry = {
      version: 1,
      id: "address-1",
      profileId: "member-2",
      address: {
        flatBuilding: "",
        houseNumberName: "10",
        street: "Isolation Street",
        locality: "",
        townCity: "Bristol",
        county: "",
        postcode: "BS1 1AA",
      },
      startMonth: "2024-01",
      endMonth: "",
      isCurrent: true,
      notes: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const lifeEnglish: LifeEnglishRecord = {
      version: 1,
      profileId: "member-2",
      lifeInUkStatus: "not-recorded",
      lifeInUkPassedDate: "",
      lifeInUkReference: "",
      englishStatus: "not-recorded",
      englishEvidenceType: "",
      englishReference: "",
      notes: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await expect(
      saveAddressHistory("member-1", [address], key),
    ).rejects.toThrow("Address history is invalid");
    await expect(
      saveLifeEnglishRecord("member-1", lifeEnglish, key),
    ).rejects.toThrow("Life in the UK and English data is invalid");
  });

  it("rejects document writes and metadata changes scoped to another profile", async () => {
    const png = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const document: DocumentMetadata = {
      version: 1,
      id: "document-1",
      profileId: "member-2",
      displayName: "Other profile document",
      fileName: "other.png",
      mimeType: "image/png",
      size: png.byteLength,
      category: "additional-document",
      sortOrder: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await expect(saveDocument(document, png, key, "member-1")).rejects.toThrow(
      "different household profile",
    );
    await expect(
      saveDocumentMetadataBatch([document], key, "member-1"),
    ).rejects.toThrow("different household profile");
  });
});
