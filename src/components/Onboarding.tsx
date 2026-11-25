import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Court } from "@/components/Court";
import { PlayerToken, ROLE_COLOR } from "@/components/PlayerToken";
import { BASE_SLOTS, ROTATION_1_LINEUP, isFrontRow } from "@/domain/rotation";
import { POSITIONS } from "@/domain/types";
import { hasOnboarded, setOnboarded } from "@/lib/storage";

export function Onboarding() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!hasOnboarded()) setOpen(true);
  }, []);

  const close = () => {
    setOnboarded();
    setOpen(false);
  };

  const steps = [
    { title: t("onboarding.step1Title"), body: t("onboarding.step1Body") },
    { title: t("onboarding.step2Title"), body: t("onboarding.step2Body") },
    { title: t("onboarding.step3Title"), body: t("onboarding.step3Body") },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/60 p-4 sm:items-center"
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="panel w-full max-w-md p-5"
          >
            <p className="text-sm font-bold text-muted-foreground">{step + 1} / 3</p>
            <h2 className="heading-impact mt-1 text-2xl text-card-foreground">
              {steps[step]!.title}
            </h2>

            <div className="mt-4">
              {step === 0 && (
                <Court>
                  {POSITIONS.map((p) => (
                    <div
                      key={p}
                      className="absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-court-line bg-ink/70 font-display text-lg font-extrabold text-court-line"
                      style={{
                        left: `${BASE_SLOTS[p].x * 100}%`,
                        top: `${BASE_SLOTS[p].y * 100}%`,
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </Court>
              )}
              {step === 1 && (
                <div className="grid grid-cols-2 gap-2">
                  {(["S", "OPP", "OH1", "OH2", "MB1", "MB2"] as const).map((role) => (
                    <div key={role} className="flex items-center gap-2 rounded-lg bg-secondary p-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-extrabold ${ROLE_COLOR[role]}`}
                      >
                        {role === "S" ? "S" : role.replace(/\d/, "")}
                      </span>
                      <span className="text-xs text-secondary-foreground">
                        {t(`roles.${role}`)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {step === 2 && (
                <Court>
                  {POSITIONS.map((p) => (
                    <PlayerToken
                      key={p}
                      pos={p}
                      role={ROTATION_1_LINEUP[p]}
                      coord={BASE_SLOTS[p]}
                      frontRow={isFrontRow(p)}
                    />
                  ))}
                </Court>
              )}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {steps[step]!.body}
            </p>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={close}
                className="tap-target rounded-lg px-3 text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                {t("onboarding.skip")}
              </button>
              <button
                onClick={() => (step === 2 ? close() : setStep(step + 1))}
                className="tap-target rounded-lg bg-primary px-5 font-display text-xl font-extrabold text-primary-foreground"
              >
                {step === 2 ? t("onboarding.start") : t("onboarding.next")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
