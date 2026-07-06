import { ShieldCheck } from "lucide-react";

const HipaaBadge = ({ compact = false }) => {
  const shieldSize = compact ? "h-8 w-8" : "h-12 w-12";
  const iconSize = compact ? "h-4 w-4" : "h-6 w-6";

  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded border border-slate-200 bg-white text-center text-slate-950 shadow-sm ${
        compact ? "h-14 w-20" : "h-24 w-24"
      }`}
      aria-label="HIPAA"
    >
      <div
        className={`mb-1 flex items-center justify-center bg-red-600 p-[2px] ${shieldSize}`}
        style={{ clipPath: "polygon(50% 0, 92% 16%, 84% 74%, 50% 100%, 16% 74%, 8% 16%)" }}
        aria-hidden="true"
      >
        <div
          className="flex h-full w-full items-center justify-center bg-slate-950"
          style={{ clipPath: "polygon(50% 0, 92% 16%, 84% 74%, 50% 100%, 16% 74%, 8% 16%)" }}
        >
          <ShieldCheck className={`text-white ${iconSize}`} strokeWidth={2.4} />
        </div>
      </div>
      <span className={`font-bold leading-4 tracking-wide text-slate-900 ${compact ? "text-sm" : "text-lg"}`}>
        HIPAA
      </span>
    </div>
  );
};

export default HipaaBadge;
