# Legacy catalog backup

These files were removed from `src/data` on 2026-08-11 after verifying that no runtime source imports them. They are retained only for rollback/reference while the database migration is stabilized.

| File | SHA-256 before removal |
| --- | --- |
| `products.ts` | `6A39481CB8A6212EEEE4A18086D2A0ADF06D9AE3DBCB4E147880D794CF5ED5E2` |
| `categories.ts` | `605F1638256FC866B07C373845F52EE24F83459B7624A1335259D6815212772D` |
| `catalog-pilot.ts` | `DA5D2D91947E2FBD20531FFA8C901DE8B3FF4C05188955E04FAC4FB8775FD8FA` |

## Legacy-to-import audit

The archived provisional dataset contains 1,359 `sku` values. The validated `IMPORT_PRODUCTOS` sheet contains 1,348 unique SKU values. The exact SKU intersection is **0**.

Therefore no legacy product URL was automatically mapped to an imported product. A fuzzy name-based redirect would risk showing the wrong technical part, so it is intentionally not created. Singular category aliases remain supported where the category mapping is unambiguous. If a legacy public URL has business value, map it manually only after validating the exact target SKU.

The public catalog must not import these files. The only public product source is the persistent database populated from `IMPORT_PRODUCTOS` in the validated workbook.
