import { arTravel } from "./travel";
import type { Dictionary } from "../../types";
import { arCore } from "./core";
import { arTrips } from "./trips";
import { arInsights } from "./insights";
import { arReceipts } from "./receipts";
import { arErrors } from "./errors";
import { arBalances } from "./balances";
import { arAi } from "./ai";

const ar: Dictionary = {
  ...arCore,
  ...arTrips,
  ...arInsights,
  ...arReceipts,
  ...arTravel,
  ...arErrors,
  ...arBalances,
  ...arAi,
};

export default ar;
