/**
 * Flag-mode question: shows the flag; the user types the country name.
 * The alt text deliberately omits the country so it cannot reveal the answer.
 */
export function FlagPrompt({ isoAlpha2 }: { isoAlpha2: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="text-xs uppercase tracking-widest text-text-muted">
        Which country?
      </span>
      <img
        src={`/flags/${isoAlpha2}.svg`}
        alt="Flag to identify"
        draggable={false}
        className="max-h-[280px] w-auto rounded-card border border-border shadow-sm"
      />
    </div>
  );
}
