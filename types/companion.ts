export type CompanionStatus = "pending" | "accepted";

export type Companion = {
  userId: string;
  username: string;
  firstName: string;
  surname: string;
  status: CompanionStatus | "owner";
};

export type TripInvitation = {
  tripId: string;
  tripName: string;
  inviterUsername: string;
  createdAt: string;
};

/** First+last name if either is set, otherwise the @username. */
export function companionDisplayName(
  person: Pick<Companion, "firstName" | "surname" | "username">,
): string {
  return [person.firstName, person.surname].filter(Boolean).join(" ") || `@${person.username}`;
}
