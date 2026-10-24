export default function Loader({ children }) {
  return (
    <p className="state" role="status">
      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
      {children}
    </p>
  );
}
