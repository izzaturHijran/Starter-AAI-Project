"use client";

import { useRef, useState, type ReactNode } from "react";

// Styled confirmation modal (FR-07, 02-design.md §4): dimmed lavender
// overlay, centred white card rounded 24 px with soft shadow, full-width
// pill buttons — muted CANCEL and deep-purple CONFIRM (red for reject
// confirms). The action only runs from CONFIRM; Cancel changes nothing.
// It submits to the server action, which repeats every check anyway
// (design §2 rule 10, §6).

const pill =
  "w-full rounded-full px-6 py-2.5 text-xs font-semibold uppercase tracking-wide shadow transition";
const cancelClass = `${pill} bg-slate-100 text-slate-500 hover:bg-slate-200`;
const confirmPrimary = `${pill} bg-[#4a0aae] text-white hover:bg-[#3a0890]`;
const confirmDanger = `${pill} bg-red-600 text-white hover:bg-red-700`;
const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-[#5146c6] focus:outline-none";

function Overlay({
  question,
  onClose,
  children,
}: {
  question: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#5146c6]/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={question}
        className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Pill button that opens the modal; CONFIRM submits the modal's own form to
 * the server action. Hidden fields pass through `children`; `remark` renders
 * the required remark box used by the two rejects.
 */
export function ConfirmModal({
  action,
  trigger,
  triggerClassName,
  question,
  confirmLabel = "Confirm",
  tone = "primary",
  remark,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  trigger: string;
  triggerClassName: string;
  question: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  remark?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {trigger}
      </button>
      {open && (
        <Overlay question={question} onClose={() => setOpen(false)}>
          <form action={action}>
            {children}
            <p className="text-sm font-semibold text-slate-900">{question}</p>
            {remark && (
              <label className="mt-4 block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  {remark}
                </span>
                <textarea
                  name="remark"
                  rows={3}
                  required
                  maxLength={200}
                  className={fieldClass}
                />
              </label>
            )}
            <div className="mt-6 space-y-2">
              <button type="button" className={cancelClass} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className={tone === "danger" ? confirmDanger : confirmPrimary}
              >
                {confirmLabel}
              </button>
            </div>
          </form>
        </Overlay>
      )}
    </>
  );
}

/**
 * Same modal for actions that belong to a surrounding form (the new-request
 * form): the trigger lives inside the form, CONFIRM submits that form —
 * native validation included — instead of a modal-owned form.
 */
export function ConfirmSubmit({
  trigger,
  triggerClassName,
  question,
  confirmLabel = "Confirm",
}: {
  trigger: string;
  triggerClassName: string;
  question: string;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {trigger}
      </button>
      {open && (
        <Overlay question={question} onClose={() => setOpen(false)}>
          <p className="text-sm font-semibold text-slate-900">{question}</p>
          <div className="mt-6 space-y-2">
            <button type="button" className={cancelClass} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={confirmPrimary}
              onClick={() => {
                triggerRef.current?.closest("form")?.requestSubmit();
                setOpen(false);
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </Overlay>
      )}
    </>
  );
}
