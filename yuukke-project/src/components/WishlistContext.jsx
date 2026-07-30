import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import * as wishlistApi from "../lib/wishlist";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); return; }
    try {
      setItems(await wishlistApi.fetchWishlist());
    } catch {
      setItems([]);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = useCallback(async (productId) => {
    const data = await wishlistApi.toggleWishlist(productId);
    setItems(data);
    return data;
  }, []);

  const has = useCallback((productId) => items.some((p) => p.id === productId), [items]);

  return (
    <WishlistContext.Provider value={{ items, toggle, has, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
