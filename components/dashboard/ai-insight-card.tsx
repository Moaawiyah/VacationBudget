import { Sparkles } from "lucide-react";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getAIProvider } from "@/lib/ai/provider";
import { getTripInsights } from "@/lib/ai/insights/get-insights";
import type { SpendingInsight } from "@/lib/ai/insights/explain";
import { logger } from "@/lib/logger";
import { AskAiButton } from "@/components/copilot/ask-ai-button";

/**
 * "✨ AI Insight" — rendered inside a <Suspense fallback={null}> on the
 * dashboard, so the page never waits on the model. Renders nothing at all
 * when there's no meaningful signal, AI isn't configured, or anything
 * fails: an insight is an optional extra, never something the dashboard
 * depends on.
 */
export async function AiInsightCard({ tripId }: { tripId: string }) {
  const { sdk, user } = await requireUser();
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  let insights: SpendingInsight[];
  try {
    insights = await getTripInsights({ sdk, userId: user.id }, getAIProvider(), tripId, locale);
  } catch (error) {
    logger.warn("ai.insights failed", { error: (error as Error).message });
    return null;
  }
  if (insights.length === 0) return null;

  return (
    <section className="panel border-primary/30 flex flex-col gap-3 border">
      <p className="text-primary flex items-center gap-1.5 text-xs font-semibold tracking-[.18em] uppercase">
        <Sparkles aria-hidden className="size-3.5 shrink-0" />
        {dict.ai.insightTitle}
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {insights.map((insight) => (
          <li key={insight.signal + insight.text}>{insight.text}</li>
        ))}
      </ul>
      <AskAiButton tripId={tripId} variant="link" />
    </section>
  );
}
