import { ShieldCheck } from "lucide-react";

const HipaaBadge = ({ compact = false }) => {
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded border border-red-500/50 bg-zinc-950 text-center text-white shadow-sm shadow-red-950/30 ${
        compact ? "h-14 w-20" : "h-24 w-24"
      }`}
      aria-label="HIPAA Security Rule Assessed"
    >
      <ShieldCheck
        className={`text-red-400 ${compact ? "mb-0.5 h-4 w-4" : "mb-1 h-6 w-6"}`}
        aria-hidden="true"
      />
      <span className={`font-bold leading-4 ${compact ? "text-xs" : "text-sm"}`}>
        HIPAA
      </span>
      <span
        className={`font-semibold leading-4 text-red-100 ${
          compact ? "text-[9px]" : "text-[11px]"
        }`}
      >
        Security Rule
      </span>
      <span
        className={`font-semibold leading-4 text-red-100 ${
          compact ? "text-[9px]" : "text-[11px]"
        }`}
      >
        Assessed
      </span>
    </div>
  );
};

export default HipaaBadge;
