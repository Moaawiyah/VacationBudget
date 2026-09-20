import type { Dictionary } from "../../types";
import { heCore } from "./core";
import { heTrips } from "./trips";
import { heInsights } from "./insights";
import { heReceipts } from "./receipts";

const he: Dictionary = { ...heCore, ...heTrips, ...heInsights, ...heReceipts };

export default he;
