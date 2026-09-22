import { heTravel } from "./travel";
import type { Dictionary } from "../../types";
import { heCore } from "./core";
import { heTrips } from "./trips";
import { heInsights } from "./insights";
import { heReceipts } from "./receipts";
import { heErrors } from "./errors";
import { heBalances } from "./balances";
import { heAi } from "./ai";

const he: Dictionary = {
  ...heCore,
  ...heTrips,
  ...heInsights,
  ...heReceipts,
  ...heTravel,
  ...heErrors,
  ...heBalances,
  ...heAi,
};

export default he;
