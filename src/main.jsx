import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "bootstrap/dist/css/bootstrap.min.css";
import "./app/theme.css";
import "./app/styles.css";
import "./parts-search/styles.css";

import { store } from "./app/store";
import App from "./app/App";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
