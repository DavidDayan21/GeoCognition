import { forwardRef } from "react";
import { Input } from "../ui/Input";

export interface AnswerFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onDontKnow: () => void;
  disabled: boolean;
  placeholder: string;
}

/** Text entry + submit for one question, with an "I don't know" escape hatch. */
export const AnswerField = forwardRef<HTMLInputElement, AnswerFieldProps>(
  ({ value, onChange, onSubmit, onDontKnow, disabled, placeholder }, ref) => (
    <form
      className="flex w-full flex-col items-center gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Input
        ref={ref}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        className="text-center text-xl"
      />
      <button
        type="button"
        onClick={onDontKnow}
        disabled={disabled}
        className="rounded-input px-2 py-1 text-sm text-text-muted underline-offset-4 ease-calm transition-colors duration-150 hover:text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
      >
        I don&apos;t know
      </button>
    </form>
  ),
);
AnswerField.displayName = "AnswerField";
