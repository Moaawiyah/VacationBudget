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
  type LucideIcon,
} from "lucide-react";

/** Maps the `icon` string stored on a category row to its Lucide component. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  plane: Plane,
  hotel: Hotel,
  car: Car,
  fuel: Fuel,
  bus: Bus,
  "utensils-crossed": UtensilsCrossed,
  ticket: Ticket,
  "shopping-bag": ShoppingBag,
  "parking-circle": ParkingCircle,
  route: Route,
  "shield-check": ShieldCheck,
  coffee: Coffee,
  "more-horizontal": MoreHorizontal,
  tag: Tag,
};

export function getCategoryIcon(icon: string): LucideIcon {
  return CATEGORY_ICONS[icon] ?? Tag;
}

/** Icon assigned to every new custom category — no icon picker UI yet. */
export const CUSTOM_CATEGORY_ICON = "tag";
