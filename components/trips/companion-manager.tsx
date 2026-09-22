"use client";

import { useState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { companionDisplayName, type Companion } from "@/types/companion";
import { inviteCompanion, removeCompanion } from "@/app/trip/[id]/companions/actions";
import { cn } from "@/lib/utils";

export function CompanionManager({
  tripId,
  initial,
  isOwner,
}: {
  tripId: string;
  initial: Companion[];
  isOwner: boolean;
}) {
  const dict = useDictionary();
  const [companions, setCompanions] = useState(initial);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function invite() {
    setMessage(null);
    startTransition(async () => {
      const result = await inviteCompanion(tripId, username);
      if (result.error) setMessage(result.error);
      else {
        setMessage(dict.travel.invitationSent);
        setUsername("");
        window.location.reload();
      }
    });
  }
  function remove(userId: string) {
    startTransition(async () => {
      const result = await removeCompanion(tripId, userId);
      if (result.error) setMessage(result.error);
      else
        setCompanions((current) => current.filter((person) => person.userId !== userId));
    });
  }
  return (
    <div className="space-y-5">
      {isOwner ? (
        <div className="panel">
          <label htmlFor="companion-username" className="text-sm font-medium">
            {dict.travel.addCompanion}
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id="companion-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={dict.travel.companionUsername}
              autoCapitalize="none"
              spellCheck={false}
              className="border-border bg-card min-w-0 flex-1 rounded-xl border px-4"
            />
            <button
              type="button"
              disabled={pending || !username.trim()}
              onClick={invite}
              className="bg-primary text-primary-foreground flex min-h-11 items-center gap-2 rounded-xl px-4 disabled:opacity-50"
            >
              <UserPlus aria-hidden className="size-4" />
              {dict.travel.invite}
            </button>
          </div>
          {message && (
            <p role="status" className="text-muted-foreground mt-3 text-sm">
              {message}
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{dict.travel.ownerOnlyCompanions}</p>
      )}
      <ul className="space-y-3">
        {companions.map((person) => (
          <li
            key={person.userId}
            className={cn(
              "panel flex items-center gap-4",
              person.status === "pending" && "opacity-45",
            )}
          >
            <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-full font-semibold">
              {(person.firstName || person.username).slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{companionDisplayName(person)}</p>
              <p className="text-muted-foreground text-xs">
                @{person.username} ·{" "}
                {person.status === "owner"
                  ? dict.travel.owner
                  : person.status === "pending"
                    ? dict.travel.pending
                    : dict.travel.accepted}
              </p>
            </div>
            {isOwner && person.status !== "owner" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(person.userId)}
                aria-label={dict.travel.remove}
                className="text-danger hover:bg-danger/10 grid size-10 place-items-center rounded-full"
              >
                <X aria-hidden className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
