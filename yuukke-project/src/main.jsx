import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import App from "./App.jsx";
import MarketplacePage from "./pages/Marketplace.jsx";
import ProductDetailPage from "./pages/ProductDetail.jsx";

function MarketplaceRoute() {
  const navigate = useNavigate();
  return <MarketplacePage goTo={(page) => navigate(page === "home" ? "/" : `/${page}`)} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/marketplace" element={<MarketplaceRoute />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
