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
import GeneratedSitePage from "./pages/GeneratedSite.jsx";
import { AuthProvider } from "./components/AuthContext.jsx";
import { CartProvider } from "./components/CartContext.jsx";
import { WishlistProvider } from "./components/WishlistContext.jsx";
import GoogleTranslateWidget from "./components/GoogleTranslateWidget.jsx";

// The Google Translate widget rewrites text nodes directly in the DOM,
// which can conflict with React's own reconciliation (a well-known issue
// when combining the two — React tries to remove/reorder a node Google's
// script has already moved). This is the standard community workaround:
// make removeChild/insertBefore no-ops when the node isn't actually where
// React expects it, instead of throwing and crashing the app.
if (typeof Node === "function" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };
}

function MarketplaceRoute() {
  const navigate = useNavigate();
  return <MarketplacePage goTo={(page) => navigate(page === "home" ? "/" : `/${page}`)} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <BrowserRouter>
            <GoogleTranslateWidget />
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
              <Route path="/site/:slug" element={<GeneratedSitePage />} />
              <Route path="*" element={<App />} />
            </Routes>
          </BrowserRouter>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  </React.StrictMode>
);
