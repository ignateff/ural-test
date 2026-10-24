import Header from "./Header";
import SearchPanel from "../parts-search/ui/search/SearchPanel";
import OffersPanel from "../parts-search/ui/offers/OffersPanel";
import useSearchUrlSync from "../parts-search/model/useSearchUrlSync";

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
          Данные предоставлены Favorit Parts <span>Цены и остатки актуальны на момент запроса</span>
        </footer>
      </main>
    </>
  );
}
