import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import * as cartApi from "../lib/cart";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setCart({ items: [] }); return; }
    setLoading(true);
    try {
      setCart(await cartApi.fetchCart());
    } catch {
      setCart({ items: [] });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (productId, quantity = 1) => {
    const data = await cartApi.addToCart(productId, quantity);
    setCart(data);
    return data;
  }, []);

  const update = useCallback(async (productId, quantity) => {
    const data = await cartApi.updateCartItem(productId, quantity);
    setCart(data);
    return data;
  }, []);

  const remove = useCallback(async (productId) => {
    const data = await cartApi.removeCartItem(productId);
    setCart(data);
    return data;
  }, []);

  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const total = cart.items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);

  return (
    <CartContext.Provider value={{ cart, itemCount, total, loading, add, update, remove, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
