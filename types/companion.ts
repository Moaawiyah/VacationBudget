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
