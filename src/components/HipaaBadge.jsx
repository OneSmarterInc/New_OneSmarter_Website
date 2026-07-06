import { ShieldCheck } from "lucide-react";

const HipaaBadge = ({ compact = false }) => {
  return (
    <div
      className={`relative flex shrink-0 flex-col items-center justify-center overflow-hidden rounded border border-slate-200 bg-white text-center text-slate-950 shadow-sm ${
        compact ? "h-14 w-20" : "h-24 w-24"
      }`}
      aria-label="HIPAA"
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-red-600" aria-hidden="true" />
      <ShieldCheck
        className={`text-slate-800 ${compact ? "mb-1 h-5 w-5" : "mb-2 h-8 w-8"}`}
        aria-hidden="true"
      />
      <span className={`font-bold leading-4 tracking-wide ${compact ? "text-sm" : "text-lg"}`}>
        HIPAA
      </span>
    </div>
  );
};

export default HipaaBadge;
