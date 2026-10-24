export default function ErrorMessage({ message, retry }) {
  return (
    <div className="alert alert-danger">
      <p className="mb-2" role="alert">
        {message}
      </p>
      <button className="btn btn-sm btn-outline-danger" onClick={retry}>
        Повторить
      </button>
    </div>
  );
}
