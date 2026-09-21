import { enTravel } from "./travel";
import { enCore } from "./core";
import { enTrips } from "./trips";
import { enInsights } from "./insights";
import { enReceipts } from "./receipts";

// English is the source dictionary: its shape defines the Dictionary type
// (see ../../types.ts), so the other locales must match it key for key.
const en = { ...enCore, ...enTrips, ...enInsights, ...enReceipts, ...enTravel };

export default en;
