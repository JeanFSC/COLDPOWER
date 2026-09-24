"use client";

import { useId, useState } from "react";
import type { Product } from "@/types/product";
import { HomeProductCard } from "@/components/home/HomeProductCard";

type Tab = { id: string; label: string; products: Product[] };

export function HomeProductTabs({ products }: { products: Product[] }) {
  const [activeId, setActiveId] = useState("best-sellers");
  const base = products.slice(0, 6);
  const newProducts = products.slice(6, 12);
  const saleProducts = products.filter((product) => product.onSale).slice(0, 6);
  const tabs: Tab[] = [
    { id: "best-sellers", label: "Más vendidos", products: base },
    { id: "new-arrivals", label: "Nuevos ingresos", products: newProducts },
    { id: "on-sale", label: "En oferta", products: saleProducts },
    { id: "recommended", label: "Recomendados", products: base },
  ];
  const tabListId = useId();
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const panelId = `${tabListId}-${activeTab.id}-panel`;

  return (
    <>
      <div className="home-section-heading home-product-section-heading">
        <div>
          <h2 className="home-section-title">Referencias para empezar</h2>
          <p className="home-section-subtitle">Productos más buscados para tus proyectos</p>
        </div>
        <div className="home-product-tabs home-product-tabs-heading" role="tablist" aria-label="Selección de productos">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`${tabListId}-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={tab.id === activeId}
              aria-controls={`${tabListId}-${tab.id}-panel`}
              className={tab.id === activeId ? "is-active" : ""}
              onClick={() => setActiveId(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={`${tabListId}-${activeTab.id}`} className="home-product-panel">
        {activeTab.products.length > 0 ? (
          <div className="home-product-grid">
            {activeTab.products.map((product, index) => (
              <HomeProductCard key={product.id} product={product} priority={index < 2} />
            ))}
          </div>
        ) : (
          <div className="home-empty-products">No hay promociones publicadas para mostrar en este momento.</div>
        )}
      </div>
    </>
  );
}
