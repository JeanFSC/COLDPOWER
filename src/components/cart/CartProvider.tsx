"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addCartItem,
  getCartTotalQuantity,
  parseStoredCart,
  removeCartItem,
  serializeCart,
  updateCartItemQuantity,
  type CartItem,
} from "@/lib/cart";

type CartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  addItem: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const cartStorageKey = "coldpower-cart";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.queueMicrotask(() => {
      setItems(parseStoredCart(window.localStorage.getItem(cartStorageKey)));
      setIsHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(cartStorageKey, serializeCart(items));
  }, [isHydrated, items]);

  const addItem = useCallback((productId: string, quantity = 1) => {
    setItems((current) => addCartItem(current, productId, quantity));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) => updateCartItemQuantity(current, productId, quantity));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => removeCartItem(current, productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo(
    () => ({
      items,
      totalQuantity: getCartTotalQuantity(items),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [addItem, clearCart, items, removeItem, updateQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
