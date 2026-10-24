export default function StatusAnnouncer({ children }) {
  return (
    <p className="visually-hidden" role="status">
      {children}
    </p>
  );
}
