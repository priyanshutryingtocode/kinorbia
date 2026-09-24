export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`kin-skeleton ${className}`} />;
}
