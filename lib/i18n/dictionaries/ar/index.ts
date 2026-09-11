import type { Dictionary } from "../../types";
import { arCore } from "./core";
import { arTrips } from "./trips";
import { arInsights } from "./insights";

const ar: Dictionary = { ...arCore, ...arTrips, ...arInsights };

export default ar;
