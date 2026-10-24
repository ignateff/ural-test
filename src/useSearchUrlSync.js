import { useEffect } from "react";
import { useSelector } from "react-redux";
import { writeSearchToUrl } from "./urlState";

// Хранит текущий подбор в адресе страницы: ссылка воспроизводит поиск,
// а перезагрузка не сбрасывает артикул и производителя. Замена адреса не
// создаёт записей в истории браузера и не перезагружает приложение.
export default function useSearchUrlSync() {
  const { number, brand, sort, order, filters } = useSelector((state) => state.search);
  useEffect(() => {
    writeSearchToUrl({ number, brand, sort, order, filters }, window.history, window.location);
  }, [number, brand, sort, order, filters]);
}
