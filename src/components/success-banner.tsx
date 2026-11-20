// Green success banner (02-design.md §4 "Success banner"): text comes only
// from this fixed list of ?msg= keys — never from anything the user typed
// (design §2 rule 10). An unknown or forged key renders nothing at all.
const BANNERS: Record<string, string> = {
  "request-submitted": "Request submitted — it is now waiting for your signer.",
  "request-sent": "Request sent to HR.",
  "request-signed": "Request signed.",
  "request-rejected": "Request rejected — the reason was recorded.",
  "request-approved": "Request approved.",
  "request-rejected-hr": "Request rejected — the reason was recorded.",
  "request-withdrawn": "Request withdrawn.",
};

// Exported pure so the ledger check can assert the whitelist without React.
export function bannerText(msg: string | undefined): string | null {
  if (!msg) return null;
  return BANNERS[msg] ?? null;
}

export function SuccessBanner({ msg }: { msg?: string }) {
  const text = bannerText(msg);
  if (!text) return null;
  return (
    <p
      role="status"
      className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800"
    >
      {text}
    </p>
  );
}
