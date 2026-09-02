import {
  Plane,
  Hotel,
  Car,
  Fuel,
  Bus,
  UtensilsCrossed,
  Ticket,
  ShoppingBag,
  ParkingCircle,
  Route,
  ShieldCheck,
  Coffee,
  MoreHorizontal,
  Tag,
} from "lucide-react";

/**
 * Renders the Lucide icon for a category's `icon` string. Deliberately a
 * switch over statically-referenced components rather than a dynamic
 * `Record` lookup rendered as `<LookedUpComponent />` — the latter trips the
 * react-hooks/react-compiler "static components" lint rule, since it can't
 * prove a value resolved at runtime is a stable component reference.
 */
export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "plane":
      return <Plane className={className} />;
    case "hotel":
      return <Hotel className={className} />;
    case "car":
      return <Car className={className} />;
    case "fuel":
      return <Fuel className={className} />;
    case "bus":
      return <Bus className={className} />;
    case "utensils-crossed":
      return <UtensilsCrossed className={className} />;
    case "ticket":
      return <Ticket className={className} />;
    case "shopping-bag":
      return <ShoppingBag className={className} />;
    case "parking-circle":
      return <ParkingCircle className={className} />;
    case "route":
      return <Route className={className} />;
    case "shield-check":
      return <ShieldCheck className={className} />;
    case "coffee":
      return <Coffee className={className} />;
    case "more-horizontal":
      return <MoreHorizontal className={className} />;
    default:
      return <Tag className={className} />;
  }
}
