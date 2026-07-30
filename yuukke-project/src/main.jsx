import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import App from "./App.jsx";
import MarketplacePage from "./pages/Marketplace.jsx";
import ProductDetailPage from "./pages/ProductDetail.jsx";
import CartPage from "./pages/Cart.jsx";
import CheckoutPage from "./pages/Checkout.jsx";
import OrdersPage from "./pages/Orders.jsx";
import WishlistPage from "./pages/Wishlist.jsx";
import AboutPage from "./pages/About.jsx";
import BecomeMentorPage from "./pages/BecomeMentor.jsx";
import BusinessExchangePage from "./pages/BusinessExchange.jsx";
import { AuthProvider } from "./components/AuthContext.jsx";
import { CartProvider } from "./components/CartContext.jsx";
import { WishlistProvider } from "./components/WishlistContext.jsx";
import { I18nProvider } from "./components/I18nContext.jsx";

function MarketplaceRoute() {
  const navigate = useNavigate();
  return <MarketplacePage goTo={(page) => navigate(page === "home" ? "/" : `/${page}`)} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/marketplace" element={<MarketplaceRoute />} />
                <Route path="/product/:id" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/about-us" element={<AboutPage />} />
                <Route path="/become-mentor" element={<BecomeMentorPage />} />
                <Route path="/business-exchange" element={<BusinessExchangePage />} />
                <Route path="*" element={<App />} />
              </Routes>
            </BrowserRouter>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </I18nProvider>
  </React.StrictMode>
);
