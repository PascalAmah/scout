import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "../../../components/ui/Button";
import { LensMark } from "../../../components/ui/LensMark";
import { ApiRequestError } from "../../../lib/api-client";
import { useOnboardingStore } from "../../../stores/onboarding-store";
import { AuthBrandPanel } from "../../auth/components/AuthBrandPanel";
import { AuthSplit } from "../../auth/components/AuthSplit";
import { useCompleteOnboarding, useSession } from "../../auth/hooks";
import { PreferencesStep } from "../components/PreferencesStep";
import { ResumeStep } from "../components/ResumeStep";
import { RolesStep } from "../components/RolesStep";
import { StepIndicator } from "../components/StepIndicator";

const STEP_HEADINGS = [
  {
    title: "What are you looking for?",
    lede: "A short answer goes a long way.",
  },
  { title: "Add your resume", lede: "This is where matches get grounded." },
  {
    title: "Where do you want to work?",
    lede: "Almost done — then we'll build your workspace.",
  },
] as const;

const BRAND_POINTS = [
  {
    title: "Point at the work you want",
    text: "The roles you pick focus every match on what you actually do.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        className="h-[15px] w-[15px] stroke-[#7FCBA0]"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: "Grounded in your resume",
    text: "Scores come from your real experience — never invented.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        className="h-[15px] w-[15px] stroke-[#7FCBA0]"
        aria-hidden
      >
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </svg>
    ),
  },
  {
    title: "Set where you'll work",
    text: "Remote, hybrid, or on-site — applied everywhere consistently.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        className="h-[15px] w-[15px] stroke-[#7FCBA0]"
        aria-hidden
      >
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
] as const;

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useSession();
  const {
    step,
    roles,
    remote,
    locations,
    resumeName,
    setStep,
    setRoles,
    setRemote,
    addLocation,
    removeLocation,
    setResumeName,
    reset: resetOnboarding,
  } = useOnboardingStore();

  const [resumeUploading, setResumeUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = useCompleteOnboarding();

  // Already done (or returning later) — never force it again.
  useEffect(() => {
    if (!isLoading && user?.onboarding_completed_at) {
      void navigate({ to: "/dashboard" });
    }
  }, [isLoading, user?.onboarding_completed_at, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <span
          aria-hidden
          className="h-6 w-6 animate-spin rounded-full border-2 border-emerald border-t-transparent"
        />
      </div>
    );
  }

  function finish(skip = false) {
    setError(null);
    complete.mutate(
      { target_roles: roles, remote, locations },
      {
        onSuccess: () => {
          // Wizard is done — drop the draft so a later visit starts fresh.
          resetOnboarding();
          void navigate({ to: "/dashboard" });
        },
        onError: (err) => {
          if (skip) {
            // A skipped flow must never strand the user — fall back to dashboard.
            void navigate({ to: "/dashboard" });
            return;
          }
          setError(
            err instanceof ApiRequestError
              ? err.message
              : "Something went wrong. Try again.",
          );
        },
      },
    );
  }

  const heading = STEP_HEADINGS[step];

  return (
    <AuthSplit
      form={
        <>
          <div className="mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <LensMark size={26} />
              <span className="font-serif text-[19px] font-semibold text-charcoal">
                Scout
              </span>
            </div>
            <button
              type="button"
              onClick={() => finish(true)}
              disabled={resumeUploading}
              className="text-xs font-semibold text-muted-2 transition-colors hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40"
            >
              Skip for now
            </button>
          </div>

          <div className="rounded-[16px] border border-line bg-white p-8 shadow-sm">
            <div className="mb-7">
              <StepIndicator current={step} />
            </div>

            <h1 className="font-serif text-[26px] font-semibold leading-tight tracking-[-0.3px] text-charcoal">
              {heading.title}
            </h1>
            <p className="mb-6 mt-1.5 text-sm text-muted">{heading.lede}</p>

            {step === 0 ? (
              <RolesStep
                selected={roles}
                onToggle={(role) =>
                  setRoles(
                    roles.includes(role)
                      ? roles.filter((r) => r !== role)
                      : [...roles, role],
                  )
                }
              />
            ) : step === 1 ? (
              <ResumeStep
                onUploaded={(name) => setResumeName(name)}
                onUploadingChange={setResumeUploading}
              />
            ) : (
              <PreferencesStep
                remote={remote}
                onRemoteChange={setRemote}
                locations={locations}
                onAddLocation={addLocation}
                onRemoveLocation={removeLocation}
              />
            )}

            {error ? (
              <p
                className="mt-5 flex items-center gap-1.5 text-xs text-brick"
                role="alert"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  className="h-[13px] w-[13px] shrink-0 stroke-brick"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
                {error}
              </p>
            ) : null}

            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 0 ? (
                <Button
                  variant="ghost"
                  disabled={resumeUploading}
                  onClick={() => setStep(Math.max(0, step - 1))}
                >
                  Back
                </Button>
              ) : (
                <span />
              )}
              {step < 2 ? (
                <Button
                  variant="primary"
                  disabled={resumeUploading || (step === 0 && roles.length === 0)}
                  onClick={() => setStep(Math.min(2, step + 1))}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  variant="accent"
                  loading={complete.isPending}
                  onClick={() => finish(false)}
                >
                  {complete.isPending ? "Setting up…" : "Start using Scout"}
                </Button>
              )}
            </div>

            {resumeName ? (
              <p className="mt-5 text-center text-xs text-muted-2">
                Resume attached:{" "}
                <span className="font-medium text-charcoal">{resumeName}</span>
              </p>
            ) : null}
          </div>
        </>
      }
      brand={
        <AuthBrandPanel foot="© 2026 Scout · Built around you">
          <h2 className="font-serif text-[30px] font-semibold leading-[1.2] tracking-[-0.5px]">
            Three answers. A workspace built around you.
          </h2>
          <p className="mb-3 mt-3 text-[13px] leading-relaxed text-[#9AA6B2]">
            Scout turns what you're looking for, your resume, and where you want
            to work into a workspace that surfaces the right startups — not just
            any startups.
          </p>
          <div className="mb-3 space-y-2.5">
            {BRAND_POINTS.map((point) => (
              <div
                key={point.title}
                className="flex items-start gap-3.5 rounded-[14px] border border-[#232B36] bg-[#141A22] p-[12px]"
              >
                {point.icon}
                <div className="min-w-0">
                  <b className="mb-1 block text-[12.5px] text-white">
                    {point.title}
                  </b>
                  <p className="text-[11px] leading-relaxed text-[#8B96A4]">
                    {point.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-[22px]">
            <div>
              <p className="font-mono text-lg font-semibold text-white">3</p>
              <p className="text-[11.5px] text-[#8B96A4]">Answers</p>
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-white">30s</p>
              <p className="text-[11.5px] text-[#8B96A4]">Setup</p>
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-white">1</p>
              <p className="text-[11.5px] text-[#8B96A4]">Workspace</p>
            </div>
          </div>
        </AuthBrandPanel>
      }
    />
  );
}
