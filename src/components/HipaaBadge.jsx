import hipaaBadge from "../assets/Hippa-transparent.png";

const HipaaBadge = ({ compact = false, className }) => {
  return (
    <img
      src={hipaaBadge}
      alt="HIPAA"
      className={
        className ||
        `shrink-0 object-contain ${compact ? "h-14 w-24" : "h-24 w-44"}`
      }
    />
  );
};

export default HipaaBadge;
