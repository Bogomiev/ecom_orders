export function LoadingDots({ label = "Выполняется" }: { label?: string }) {
  return (
    <>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="loading-dots">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </span>
    </>
  );
}
