import { describe, expect, it } from "vitest";
import {
  calculateAverageDailySpend,
  calculateDailyBudget,
  calculateDaysUntilStart,
  calculateFlatDailyTarget,
  calculateRemainingBudget,
  calculateRemainingDays,
  calculateTripDays,
  calculateTripStatus,
} from "@/lib/calculations/trip";

const now = new Date("2026-10-05T15:30:00Z");

describe("trip calculations", () => {
  it("counts trip days inclusive of both ends", () => {
    expect(calculateTripDays("2026-10-01", "2026-10-10")).toBe(10);
    expect(calculateTripDays("2026-10-01", "2026-10-01")).toBe(1);
  });

  it("classifies the trip relative to now", () => {
    expect(calculateTripStatus("2026-10-06", "2026-10-10", now)).toBe("upcoming");
    expect(calculateTripStatus("2026-10-01", "2026-10-05", now)).toBe("active");
    expect(calculateTripStatus("2026-09-01", "2026-10-04", now)).toBe("completed");
  });

  it("counts remaining days including today, never below zero", () => {
    expect(calculateRemainingDays("2026-10-10", now)).toBe(6);
    expect(calculateRemainingDays("2026-10-05", now)).toBe(1);
    expect(calculateRemainingDays("2026-09-01", now)).toBe(0);
  });

  it("computes remaining and daily budgets, avoiding division by zero", () => {
    expect(calculateRemainingBudget(1000, 250)).toBe(750);
    expect(calculateRemainingBudget(100, 150)).toBe(-50);
    expect(calculateDailyBudget(600, 3)).toBe(200);
    expect(calculateDailyBudget(600, 0)).toBe(600);
  });

  it("counts days until the start, zero once started", () => {
    expect(calculateDaysUntilStart("2026-10-08", now)).toBe(3);
    expect(calculateDaysUntilStart("2026-10-01", now)).toBe(0);
  });

  it("spreads budget and spend over trip days", () => {
    expect(calculateFlatDailyTarget(1000, 10)).toBe(100);
    expect(calculateFlatDailyTarget(1000, 0)).toBe(1000);
    expect(calculateAverageDailySpend(450, 9)).toBe(50);
    expect(calculateAverageDailySpend(450, 0)).toBe(450);
  });

  it("defaults `now` to the current time", () => {
    expect(calculateTripStatus("2000-01-01", "2000-01-02")).toBe("completed");
    expect(calculateRemainingDays("2000-01-02")).toBe(0);
    expect(calculateDaysUntilStart("2000-01-01")).toBe(0);
  });
});
