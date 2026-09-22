import { arTravel } from "./travel";
import type { Dictionary } from "../../types";
import { arCore } from "./core";
import { arTrips } from "./trips";
import { arInsights } from "./insights";
import { arReceipts } from "./receipts";
import { arErrors } from "./errors";
import { arBalances } from "./balances";

const ar: Dictionary = {
  ...arCore,
  ...arTrips,
  ...arInsights,
  ...arReceipts,
  ...arTravel,
  ...arErrors,
  ...arBalances,
};

export default ar;
