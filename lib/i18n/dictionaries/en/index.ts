import { enCore } from "./core";
import { enTrips } from "./trips";
import { enInsights } from "./insights";

// English is the source dictionary: its shape defines the Dictionary type
// (see ../../types.ts), so the other locales must match it key for key.
const en = { ...enCore, ...enTrips, ...enInsights };

export default en;
