import Header from "./components/Header";
import SearchPanel from "./components/SearchPanel";
import OffersPanel from "./components/OffersPanel";
import useSearchUrlSync from "./useSearchUrlSync";

export default function App() {
  useSearchUrlSync();
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="container page-width">
        <h1 className="page-title">Подбор автозапчастей</h1>
        <SearchPanel />
        <OffersPanel />
        <footer>
          Данные предоставлены Favorit Parts{" "}
          <span>Цены и остатки актуальны на момент запроса</span>
        </footer>
      </main>
    </>
  );
}
