import type { Dictionary } from "../../types";
import { heCore } from "./core";
import { heTrips } from "./trips";
import { heInsights } from "./insights";

const he: Dictionary = { ...heCore, ...heTrips, ...heInsights };

export default he;
