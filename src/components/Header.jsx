export default function Header() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        К основному содержимому
      </a>
      <header className="topbar">
        <div className="container page-width d-flex justify-content-between align-items-center">
          <a
            className="wordmark"
            href={import.meta.env.BASE_URL}
            aria-label="Автоподбор — главная"
          >
            <span className="brand-icon" aria-hidden="true">
              а
            </span>
            автоподбор<span className="brand-dot">.</span>
          </a>
          <span className="supplier-label">Каталог Favorit Parts</span>
        </div>
      </header>
    </>
  );
}
