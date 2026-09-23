"use client";

import { useMemo, useState } from "react";
import { calculateSplit, type SplitMethod, type SplitResult } from "@/lib/finance/split";

export type SplitFieldsState = {
  enabled: boolean;
  paidBy: string;
  method: SplitMethod;
  participantIds: string[];
  exactAmounts: Record<string, number>;
  percentages: Record<string, number>;
};

function initialState(currentUserId: string): SplitFieldsState {
  return {
    enabled: false,
    paidBy: currentUserId,
    method: "equal",
    participantIds: [currentUserId],
    exactAmounts: {},
    percentages: {},
  };
}

/**
 * Owns the split UI's state and turns it into a SplitResult on every
 * change, using the same integer-minor-unit calculation the database's
 * invariants check — so "does this reconcile" is answered identically
 * here and at commit. Splitting off from ExpenseForm's react-hook-form
 * state because a dynamic per-participant amount list doesn't fit
 * register()'s flat-field model.
 */
export function useSplitFields(
  currentUserId: string,
  amount: number | undefined,
  currency: string,
  /** An existing expense's saved split (see split-state.ts); a new expense starts from "you paid, no split". */
  initial?: SplitFieldsState,
) {
  const [state, setState] = useState<SplitFieldsState>(() => initial ?? initialState(currentUserId));

  const result: SplitResult | null = useMemo(() => {
    if (!state.enabled || !amount || amount <= 0) return null;
    const ids = state.participantIds.length ? state.participantIds : [state.paidBy];
    if (state.method === "equal") {
      return calculateSplit(
        "equal",
        amount,
        currency,
        ids.map((userId) => ({ userId, method: "equal" })),
      );
    }
    if (state.method === "exact") {
      return calculateSplit(
        "exact",
        amount,
        currency,
        ids.map((userId) => ({ userId, method: "exact", amount: state.exactAmounts[userId] ?? 0 })),
      );
    }
    return calculateSplit(
      "percentage",
      amount,
      currency,
      ids.map((userId) => ({
        userId,
        method: "percentage",
        percent: state.percentages[userId] ?? 0,
      })),
    );
  }, [state, amount, currency]);

  function toggleParticipant(userId: string) {
    setState((s) => {
      const included = s.participantIds.includes(userId);
      const participantIds = included
        ? s.participantIds.filter((id) => id !== userId)
        : [...s.participantIds, userId];
      // Splitting alone doesn't make sense — turn the toggle off instead of
      // leaving an empty/single-person "split".
      if (participantIds.length < 2) {
        return { ...initialState(s.paidBy), paidBy: s.paidBy };
      }
      return { ...s, participantIds };
    });
  }

  return {
    state,
    result,
    setEnabled: (enabled: boolean) =>
      setState((s) => (enabled ? { ...s, enabled, participantIds: [s.paidBy] } : initialState(s.paidBy))),
    setPaidBy: (paidBy: string) => setState((s) => ({ ...s, paidBy })),
    setMethod: (method: SplitMethod) => setState((s) => ({ ...s, method })),
    toggleParticipant,
    setExactAmount: (userId: string, value: number) =>
      setState((s) => ({ ...s, exactAmounts: { ...s.exactAmounts, [userId]: value } })),
    setPercentage: (userId: string, value: number) =>
      setState((s) => ({ ...s, percentages: { ...s.percentages, [userId]: value } })),
    /** Adopts a fully-computed per-person split (receipt item assignment) as "exact". */
    applyComputedSplit: (paidBy: string, amounts: Record<string, number>) =>
      setState({
        enabled: true,
        paidBy,
        method: "exact",
        participantIds: Object.keys(amounts),
        exactAmounts: amounts,
        percentages: {},
      }),
  };
}

export type UseSplitFields = ReturnType<typeof useSplitFields>;
