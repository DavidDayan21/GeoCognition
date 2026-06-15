import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut, Pause } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  cardSwap,
  cardSwapReduced,
  DURATION,
  EASE_CALM,
  pageVariants,
} from "../../lib/animations";
import { formatPercent } from "../../lib/format";
import { selectAccuracy, usePracticeStore } from "../../store/practice-store";
import { useToastStore } from "../../store/toast-store";
import type { QuestionMode } from "../../types/domain";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { AnswerField } from "./AnswerField";
import { CapitalPrompt } from "./CapitalPrompt";
import { FeedbackLayer } from "./FeedbackLayer";
import { FlagPrompt } from "./FlagPrompt";

/** Delay before auto-advancing after an exact (quality 5) answer, in ms. */
const AUTO_ADVANCE_MS = 650;

function ModeBadge({ mode }: { mode: QuestionMode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium uppercase tracking-wide text-text-muted">
      {mode === "capital" ? "Capital" : "Flag"}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-base font-semibold tabular-nums text-text">
        {value}
      </span>
      <span className="text-xs text-text-muted">{label}</span>
    </span>
  );
}

/** The infinite practice loop: question, answer, feedback, repeat. */
export function PracticeView() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const beganRef = useRef(false);
  const [draft, setDraft] = useState("");
  const [paused, setPaused] = useState(false);

  const status = usePracticeStore((s) => s.status);
  const question = usePracticeStore((s) => s.question);
  const result = usePracticeStore((s) => s.result);
  const lastInput = usePracticeStore((s) => s.lastInput);
  const answered = usePracticeStore((s) => s.answered);
  const streak = usePracticeStore((s) => s.streak);
  const errorMessage = usePracticeStore((s) => s.errorMessage);
  const accuracy = usePracticeStore(selectAccuracy);
  const begin = usePracticeStore((s) => s.begin);
  const submit = usePracticeStore((s) => s.submit);
  const advance = usePracticeStore((s) => s.advance);
  const showToast = useToastStore((s) => s.show);

  // Start a fresh run once on mount. `begin` resets its own state, so no
  // cleanup is needed (and a cleanup reset would race React Strict Mode's
  // double-invoked effects).
  useEffect(() => {
    if (beganRef.current) return;
    beganRef.current = true;
    void begin();
  }, [begin]);

  // Surface backend failures as a toast.
  useEffect(() => {
    if (status === "error" && errorMessage) showToast(errorMessage, "error");
  }, [status, errorMessage, showToast]);

  // Clear the draft and refocus the input for each new question.
  useEffect(() => {
    if (status === "asking") {
      setDraft("");
      inputRef.current?.focus();
    }
  }, [status, question?.question_index]);

  const handleSubmit = useCallback(() => {
    if (status === "asking") void submit(draft);
  }, [status, submit, draft]);

  const handleDontKnow = useCallback(() => {
    if (status === "asking") void submit("");
  }, [status, submit]);

  const handleAdvance = useCallback(() => {
    if (status === "revealed") void advance();
  }, [status, advance]);

  // Auto-advance after an exact answer.
  useEffect(() => {
    if (status !== "revealed" || result?.quality !== 5) return;
    const timer = window.setTimeout(() => void advance(), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [status, result?.quality, advance]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "q") {
        event.preventDefault();
        navigate("/");
        return;
      }
      if (event.key === "Escape" && !paused) {
        setPaused(true);
        return;
      }
      if (event.key === "Enter" && status === "revealed" && !paused) {
        event.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, paused, status, handleAdvance]);

  const goHome = () => navigate("/");
  const inputDisabled = status !== "asking";
  const swap = reduce ? cardSwapReduced : cardSwap;

  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="relative flex min-h-screen flex-col bg-bg"
    >
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex min-w-[120px] items-center">
          {question && <ModeBadge mode={question.mode} />}
        </div>
        <div className="flex items-center gap-6">
          <Stat label="answered" value={String(answered)} />
          <Stat
            label="accuracy"
            value={answered === 0 ? "—" : formatPercent(accuracy)}
          />
          <Stat label="streak" value={String(streak)} />
        </div>
        <div className="flex min-w-[120px] items-center justify-end gap-1">
          <Button
            variant="ghost"
            aria-label="Pause"
            onClick={() => setPaused(true)}
          >
            <Pause size={18} aria-hidden />
          </Button>
          <Button variant="ghost" aria-label="Exit to home" onClick={goHome}>
            <LogOut size={18} aria-hidden />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        {status === "error" ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-text-muted">
              {errorMessage ?? "Couldn't load the next question."}
            </p>
            <Button onClick={() => void begin()}>Try again</Button>
          </div>
        ) : !question ? (
          <div
            className="h-4 w-32 animate-pulse rounded-full bg-surface-2"
            role="status"
            aria-label="Loading question"
          />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={question.question_index}
              variants={swap}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: DURATION.base, ease: EASE_CALM }}
              className="w-full max-w-xl"
            >
              <Card className="flex flex-col items-center gap-10 px-8 py-14">
                {question.mode === "capital" && question.country_name && (
                  <CapitalPrompt countryName={question.country_name} />
                )}
                {question.mode === "flag" && question.iso_alpha2 && (
                  <FlagPrompt isoAlpha2={question.iso_alpha2} />
                )}
                <div className="flex min-h-[7rem] w-full items-center justify-center">
                  <AnimatePresence mode="wait" initial={false}>
                    {status === "revealed" && result ? (
                      <motion.div
                        key="feedback"
                        className="w-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: DURATION.fast,
                          ease: EASE_CALM,
                        }}
                      >
                        <FeedbackLayer result={result} userInput={lastInput} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="answer"
                        className="w-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: DURATION.fast,
                          ease: EASE_CALM,
                        }}
                      >
                        <AnswerField
                          ref={inputRef}
                          value={draft}
                          onChange={setDraft}
                          onSubmit={handleSubmit}
                          onDontKnow={handleDontKnow}
                          disabled={inputDisabled}
                          placeholder={
                            question.mode === "capital"
                              ? "Type the capital…"
                              : "Type the country…"
                          }
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <Modal open={paused} onClose={() => setPaused(false)} title="Paused">
        <p className="mb-6 text-sm text-text-muted">
          Take your time — your progress is saved after every answer.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => setPaused(false)}>Resume</Button>
          <Button variant="secondary" onClick={goHome}>
            Exit to home
          </Button>
        </div>
      </Modal>
    </motion.main>
  );
}
