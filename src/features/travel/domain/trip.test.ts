import { describe, expect, it } from "vitest";
import {
  findOverlappingTrip,
  isTripCollection,
  validateTripInput,
  type Trip,
} from "./trip";

const validInput = {
  departureDate: "2024-01-01",
  returnDate: "2024-01-10",
  destination: "India",
  notes: "Family visit",
  exceptionalAbsence: false,
} as const;

const trip: Trip = {
  version: 1,
  id: "trip-test-id",
  profileId: "owner",
  ...validInput,
  createdAt: "2026-08-29T10:00:00.000Z",
  updatedAt: "2026-08-29T10:00:00.000Z",
};

describe("trip validation", () => {
  it("accepts completed and open trips", () => {
    expect(validateTripInput(validInput)).toBeNull();
    expect(validateTripInput({ ...validInput, returnDate: "" })).toBeNull();
  });

  it("rejects reversed dates and future departures", () => {
    expect(validateTripInput({ ...validInput, returnDate: "2023-12-31" })).toBe(
      "UK return cannot be before departure.",
    );
    expect(
      validateTripInput({ ...validInput, departureDate: "2999-01-01" }),
    ).toBe("UK departure cannot be in the future.");
  });

  it("detects overlapping completed and open trips", () => {
    expect(
      findOverlappingTrip({ ...validInput, departureDate: "2024-01-05" }, [
        trip,
      ]),
    ).toEqual(trip);
    expect(
      findOverlappingTrip(
        {
          ...validInput,
          departureDate: "2024-01-10",
          returnDate: "2024-01-15",
        },
        [trip],
      ),
    ).toBeNull();
    expect(
      findOverlappingTrip({ ...validInput, returnDate: "" }, [
        { ...trip, departureDate: "2024-02-01", returnDate: "" },
      ]),
    ).not.toBeNull();
  });

  it("ignores the record currently being edited", () => {
    expect(findOverlappingTrip(validInput, [trip], trip.id)).toBeNull();
  });

  it("rejects duplicate identifiers and mixed profiles", () => {
    expect(isTripCollection([trip], "owner")).toBe(true);
    expect(isTripCollection([trip, trip], "owner")).toBe(false);
    expect(isTripCollection([trip], "another-profile")).toBe(false);
    expect(
      isTripCollection(
        [
          trip,
          {
            ...trip,
            id: "trip-overlap",
            departureDate: "2024-01-05",
            returnDate: "2024-01-12",
          },
        ],
        "owner",
      ),
    ).toBe(false);
    expect(
      isTripCollection([{ ...trip, destination: " India " }], "owner"),
    ).toBe(false);
  });
});
