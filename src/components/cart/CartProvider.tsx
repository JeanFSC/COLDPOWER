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

export type CartSyncStatus = "loading" | "ready" | "error";
export const cartSyncErrorMessage = "El carrito no pudo sincronizarse con tu sesión. Tus referencias locales siguen disponibles.";

type CartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  syncStatus: CartSyncStatus;
  retrySync: () => void;
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
  const [isSessionHydrated, setIsSessionHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CartSyncStatus>("loading");
  const [syncAttempt, setSyncAttempt] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    window.queueMicrotask(() => {
      if (cancelled) return;
      const localItems = parseStoredCart(window.localStorage.getItem(cartStorageKey));
      setItems(localItems);
      setIsHydrated(true);
      setIsSessionHydrated(false);
      setSyncStatus("loading");

      void fetch("/api/cotizacion/cart", { credentials: "include" })
        .then((response) => {
          if (!response.ok) throw new Error("cart sync unavailable");
          return response.json();
        })
        .then((result: { items?: CartItem[] } | null) => {
          if (cancelled) return;
          if (!result?.items?.length || localItems.length > 0) return;
          setItems(parseStoredCart(JSON.stringify(result.items)));
          setSyncStatus("ready");
        })
        .then(() => {
          if (!cancelled) setSyncStatus("ready");
        })
        .catch(() => {
          if (!cancelled) setSyncStatus("error");
        })
        .finally(() => {
          if (!cancelled) setIsSessionHydrated(true);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [syncAttempt]);

  useEffect(() => {
    if (!isHydrated || !isSessionHydrated || typeof window === "undefined") return;

    let cancelled = false;
    window.localStorage.setItem(cartStorageKey, serializeCart(items));
    window.queueMicrotask(() => {
      if (cancelled) return;
      setSyncStatus("loading");
      void fetch("/api/cotizacion/cart", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("cart persistence unavailable");
          if (!cancelled) setSyncStatus("ready");
        })
        .catch(() => {
          if (!cancelled) setSyncStatus("error");
        });
    });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, isSessionHydrated, items]);

  const retrySync = useCallback(() => {
    setIsSessionHydrated(false);
    setSyncStatus("loading");
    setSyncAttempt((current) => current + 1);
  }, []);

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
      syncStatus,
      retrySync,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [addItem, clearCart, items, removeItem, retrySync, syncStatus, updateQuantity],
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
