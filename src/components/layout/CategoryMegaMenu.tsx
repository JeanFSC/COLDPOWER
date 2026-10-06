"use client";

import {
  AirVent,
  Cable,
  ChevronDown,
  ChevronRight,
  Fan,
  Gauge,
  Layers3,
  Menu,
  PackageOpen,
  Snowflake,
  Wind,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogCategory, CatalogFamily, CatalogProductType } from "@/lib/catalog-repository";

type CategoryMegaMenuProps = {
  categories: CatalogCategory[];
  families: CatalogFamily[];
  productTypes: CatalogProductType[];
};

const iconByCategory: Array<[RegExp, LucideIcon]> = [
  [/refrig|fr[ií]o|congel|evapor|condens/i, Snowflake],
  [/aire|climat|ventil|motor/i, Wind],
  [/control|termost|sensor|electr/i, Gauge],
  [/herram|instal|servicio/i, Wrench],
  [/cable|accesor|conex/i, Cable],
  [/repuesto|componente|parte/i, PackageOpen],
  [/lavador|cocina|electrodom/i, AirVent],
  [/ventilador/i, Fan],
];

function getCategoryIcon(name: string) {
  return iconByCategory.find(([pattern]) => pattern.test(name))?.[1] ?? Layers3;
}

export function CategoryMegaMenu({ categories, families, productTypes }: CategoryMegaMenuProps) {
  const availableCategories = useMemo(
    () => categories,
    [categories],
  );
  const initialCategory = useMemo(
    () => availableCategories.reduce<CatalogCategory | undefined>((mostPopulated, category) => {
      const familyCount = families.filter((family) => family.categoryId === category.id).length;
      const mostPopulatedFamilyCount = mostPopulated
        ? families.filter((family) => family.categoryId === mostPopulated.id).length
        : -1;
      return familyCount > mostPopulatedFamilyCount ? category : mostPopulated;
    }, undefined),
    [availableCategories, families],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(initialCategory?.id ?? "");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const activeCategory = availableCategories.find((category) => category.id === activeCategoryId) ?? availableCategories[0];
  const activeFamilies = activeCategory
    ? families.filter((family) => family.categoryId === activeCategory.id)
    : [];

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("[data-category-trigger]")?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isOpen]);

  function openMenu() {
    setActiveCategoryId(initialCategory?.id ?? "");
    setIsOpen(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="home-all-categories"
        aria-expanded={isOpen}
        aria-controls="category-mega-menu"
        onClick={() => (isOpen ? closeMenu() : openMenu())}
      >
        <Menu aria-hidden="true" />
        <span>Todas las categorías</span>
        <ChevronDown aria-hidden="true" className={isOpen ? "category-menu-chevron-open" : undefined} />
      </button>

      {isOpen ? (
        <div className="category-menu-layer">
          <button
            type="button"
            aria-label="Cerrar menú de categorías"
            className="category-menu-backdrop"
            onClick={closeMenu}
          />
          <section
            ref={panelRef}
            id="category-mega-menu"
            className="category-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Todas las categorías"
          >
            <div className="category-menu-mobile-heading">
              <span>Explora el catálogo</span>
              <button type="button" className="category-menu-close" onClick={closeMenu} aria-label="Cerrar menú">
                <X aria-hidden="true" />
              </button>
            </div>

            <nav className="category-menu-sidebar" aria-label="Categorías del catálogo">
              <div className="category-menu-sidebar-heading">Líneas de producto</div>
              {availableCategories.map((category) => {
                const Icon = getCategoryIcon(category.name);
                const isActive = category.id === activeCategory?.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    data-category-trigger={isActive ? "true" : undefined}
                    className={`category-menu-category${isActive ? " is-active" : ""}`}
                    aria-current={isActive ? "true" : undefined}
                    aria-controls="category-family-groups"
                    onClick={() => setActiveCategoryId(category.id)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{category.name}</span>
                    <ChevronRight aria-hidden="true" className="category-menu-category-arrow" />
                  </button>
                );
              })}
              <Link href="/catalogo" className="category-menu-catalog-link" onClick={closeMenu}>
                Explorar catálogo completo
              </Link>
            </nav>

            <div className="category-menu-content">
              <header className="category-menu-heading">
                <div>
                  <span className="category-menu-eyebrow">Catálogo técnico</span>
                  <h2>{activeCategory?.name ?? "Categorías"}</h2>
                </div>
                <div className="category-menu-heading-actions">
                  {activeCategory ? (
                    <Link href={`/categoria/${activeCategory.slug}`} className="category-menu-view-all" onClick={closeMenu}>
                      Ver toda la categoría <ChevronRight aria-hidden="true" />
                    </Link>
                  ) : null}
                  <button type="button" className="category-menu-close category-menu-desktop-close" onClick={closeMenu} aria-label="Cerrar menú">
                    <X aria-hidden="true" />
                  </button>
                </div>
              </header>

              {activeCategory ? (
                activeFamilies.length > 0 ? (
                  <div id="category-family-groups" className="category-menu-families">
                    {activeFamilies.map((family) => {
                      const familyProductTypes = productTypes.filter((productType) => productType.familyId === family.id);
                      return (
                        <section key={family.id} className="category-menu-family-group" aria-labelledby={`category-family-${family.id}`}>
                          <header className="category-menu-family-heading">
                            <h3 id={`category-family-${family.id}`}>{family.name}</h3>
                          </header>
                          <Link
                            href={`/catalogo?familia=${encodeURIComponent(family.slug)}`}
                            className="category-menu-view-family"
                            onClick={closeMenu}
                          >
                            Ver todo
                          </Link>
                          {familyProductTypes.length > 0 ? (
                            <ul className="category-menu-product-types">
                              {familyProductTypes.map((productType) => (
                                <li key={`${productType.familyId}-${productType.name}`}>
                                  <Link
                                    href={`/catalogo?tipo=${encodeURIComponent(productType.name)}`}
                                    className="category-menu-product-type"
                                    onClick={closeMenu}
                                  >
                                    {productType.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="category-menu-no-product-types">Sin tipos registrados</p>
                          )}
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div id="category-family-groups" className="category-menu-empty">
                    <p>Esta línea todavía no tiene familias.</p>
                    <Link href={`/categoria/${activeCategory.slug}`} onClick={closeMenu}>Ver productos de {activeCategory.name}</Link>
                  </div>
                )
              ) : (
                <div id="category-family-groups" className="category-menu-empty">
                  <p>No hay categorías disponibles para mostrar.</p>
                  <Link href="/catalogo" onClick={closeMenu}>Explorar catálogo completo</Link>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
