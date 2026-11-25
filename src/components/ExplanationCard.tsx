import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

interface ExplanationCardProps {
  tone?: "neutral" | "correct" | "wrong";
  /** short verdict, e.g. "Richtig" */
  verdict?: string;
  explanation: string;
  hint?: string;
  action?: React.ReactNode;
}

export function ExplanationCard({
  tone = "neutral",
  verdict,
  explanation,
  hint,
  action,
}: ExplanationCardProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl border p-4",
        tone === "neutral" && "border-border bg-card",
        tone === "correct" && "border-success/40 bg-success/10",
        tone === "wrong" && "border-destructive/40 bg-destructive/10",
      )}
      role="status"
    >
      {verdict && (
        <p
          className={cn(
            "heading-impact text-3xl",
            tone === "correct" && "text-success",
            tone === "wrong" && "text-destructive",
          )}
        >
          {verdict}
        </p>
      )}
      <p className="mt-1 text-sm leading-relaxed text-card-foreground">{explanation}</p>
      {hint && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-bold text-foreground">{t("common.hint")}: </span>
          {hint}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
