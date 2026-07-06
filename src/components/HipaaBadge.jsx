import { ShieldCheck } from "lucide-react";

const HipaaBadge = ({ compact = false }) => {
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded border border-red-500/50 bg-zinc-950 text-center text-white shadow-sm shadow-red-950/30 ${
        compact ? "h-14 w-20" : "h-24 w-24"
      }`}
      aria-label="HIPAA"
    >
      <ShieldCheck
        className={`text-red-400 ${compact ? "mb-1 h-5 w-5" : "mb-2 h-8 w-8"}`}
        aria-hidden="true"
      />
      <span className={`font-bold leading-4 ${compact ? "text-sm" : "text-lg"}`}>
        HIPAA
      </span>
    </div>
  );
};

export default HipaaBadge;
