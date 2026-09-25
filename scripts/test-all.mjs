import { spawnSync } from "node:child_process";
import path from "node:path";

const moduleBin = (name) => path.join(process.cwd(), "node_modules", name);
const run = (command, args) => {
  const testIndex = args.indexOf("--test");
  const normalizedArgs =
    testIndex >= 0 && !args.includes("--test-timeout=60000")
      ? [...args.slice(0, testIndex + 1), "--test-timeout=60000", ...args.slice(testIndex + 1)]
      : args;
  console.log(`\n> ${command} ${normalizedArgs.join(" ")}`);
  const result = spawnSync(command, normalizedArgs, { stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const node = process.execPath;
run(node, [
  "--experimental-test-isolation=none",
  "--test",
  "--test-timeout=60000",
  "scripts/tienda-public-contract.test.mjs",
  "scripts/cp026b-public-ui-contract.test.mjs",
  "scripts/cp026b-shell-contract.test.mjs",
  "scripts/hero-visual-contract.test.mjs",
  "scripts/public-empty-state-ui.test.mjs",
  "scripts/catalog-prefetch-performance.test.mjs",
  "scripts/brief19-legal-contract.test.mjs",
  "scripts/admin-home-quotes-consistency-contract.test.mjs",
]);
run(node, ["--experimental-test-isolation=none", "--test", "scripts/backup-database.test.mjs", "scripts/backup-full.test.mjs", "scripts/availability-contract.test.mjs", "scripts/admin-catalog-contract.test.mjs", "scripts/audit-contract.test.mjs", "scripts/quote-cp025.test.mjs", "scripts/catalog-imported-visibility.test.mjs", "scripts/admin-product-commercial-editing-contract.test.mjs", "scripts/cp028-rbac-contract.test.mjs", "scripts/cp028-auth-flow-contract.test.mjs", "scripts/cp028-user-safety-contract.test.mjs", "scripts/cp028-pricing-safety.test.mjs", "scripts/cp025-governance-contract.test.mjs", "scripts/rbac-admin-route-contract.test.mjs", "scripts/staff-invitation-route-contract.test.mjs", "scripts/media-route-contract.test.mjs", "scripts/product-editorial-contract.test.mjs", "scripts/cms-route-contract.test.mjs", "scripts/cp027-public-cms-contract.test.mjs", "scripts/cp027-block-b-contract.test.mjs", "scripts/pricing-route-contract.test.mjs", "scripts/inventory-minimum-contract.test.mjs", "scripts/cart-currency-contract.test.mjs", "scripts/crm-route-contract.test.mjs", "scripts/crm-service-contract.test.mjs", "scripts/sales-route-contract.test.mjs", "scripts/purchases-route-contract.test.mjs", "scripts/operations-route-contract.test.mjs", "scripts/security-production-contract.test.mjs", "scripts/company-settings-admin-contract.test.mjs", "scripts/company-settings-public-consumption.test.mjs", "scripts/editorial-taxonomy-contract.test.mjs", "scripts/taxonomy-admin-contract.test.mjs", "scripts/catalog-taxonomy-pricing-brief.test.mjs", "scripts/cp027-operations-ui-contract.test.mjs", "scripts/cp027-dashboard-completeness-contract.test.mjs", "scripts/cp027-payments-panel-contract.test.mjs", "scripts/cp027-transfer-lifecycle-contract.test.mjs", "scripts/cp027-notification-events-contract.test.mjs", "scripts/cp027-notification-event-coverage.test.mjs", "scripts/cp027-product-analytics-quantity.test.mjs", "scripts/reports-filters-contract.test.mjs", "scripts/customer-history-contract.test.mjs", "scripts/product-analytics-contract.test.mjs", "scripts/cp030-inventory-unknown.test.mjs"]);
run(node, ["--experimental-test-isolation=none", "--test", "scripts/admin-catalog-ui-empty-states.test.mjs", "scripts/admin-category-ui-contract.test.mjs", "scripts/admin-cms-ui-contract.test.mjs", "scripts/admin-customers-ui-contract.test.mjs", "scripts/admin-dashboard-deeplinks.test.mjs", "scripts/admin-inventory-ui-contract.test.mjs", "scripts/admin-notifications-ui-contract.test.mjs"]);
run(node, ["--experimental-test-isolation=none", "--test", "scripts/admin-orders-ui-contract.test.mjs", "scripts/admin-payments-ui-contract.test.mjs", "scripts/admin-pipeline-ui-contract.test.mjs", "scripts/admin-product-create-ui-contract.test.mjs", "scripts/admin-purchases-ui-empty-states.test.mjs", "scripts/admin-sales-ui-contract.test.mjs", "scripts/admin-settings-quotes-ui-contract.test.mjs"]);
run(node, ["--experimental-test-isolation=none", "--test", "scripts/admin-users-ui-contract.test.mjs", "scripts/admin-users-ui-errors.test.mjs", "scripts/auth-ui-contract.test.mjs", "scripts/cp029-admin-foundation-contract.test.mjs", "scripts/cp029-dashboard-data-contract.test.mjs", "scripts/cp033-inventory-ui-contract.test.mjs", "scripts/proxy-auth-return-url.test.mjs"]);
run(node, ["--experimental-test-isolation=none", "--test", "scripts/public-catalog-retry-ui.test.mjs", "scripts/public-language-contract.test.mjs", "scripts/quote-cart-ui-states.test.mjs"]);
run(node, [moduleBin("tsx/dist/cli.mjs"), "--test", "--experimental-test-isolation=none", "scripts/publication-governance.test.ts", "scripts/inventory-domain.test.ts", "scripts/stock-import.test.ts", "scripts/rbac-permissions.test.ts", "scripts/rbac-cp027.test.ts", "scripts/cp028-rbac-matrix.test.ts", "scripts/company-settings.test.ts", "scripts/staff-invitations.test.ts", "scripts/media-validation.test.ts", "scripts/cms-validation.test.ts", "scripts/pricing-validation.test.ts", "scripts/crm-validation.test.ts", "scripts/sales-validation.test.ts", "scripts/purchases-validation.test.ts", "scripts/operations-validation.test.ts", "scripts/public-rate-limit.test.ts", "scripts/dev-auth-bypass.test.ts", "scripts/goal-impecable-p0.test.ts", "scripts/cp030-transfer-workflow.test.ts", "scripts/cp033-inventory-contract.test.ts", "scripts/brief16-fixture.test.ts", "scripts/period-metrics.test.ts"]);
run(node, ["--experimental-test-isolation=none", "--test", "scripts/cp036-quotes.test.mjs", "scripts/cp036-canonical-contract.test.mjs", "scripts/cp037-clients-contract.test.mjs", "scripts/cp037-sales.test.mjs", "scripts/cp038-orders.test.mjs", "scripts/cp039-purchases.test.mjs"]);
run(node, [moduleBin("tsx/dist/cli.mjs"), "--test", "--experimental-test-isolation=none", "scripts/cp039-fulfillment-domain.test.ts", "scripts/cp040-payments.test.ts"]);
run(node, [moduleBin("tsx/dist/cli.mjs"), "--test", "--experimental-test-isolation=none", "scripts/cp042-reports.test.ts", "scripts/cp043-audit.test.ts", "scripts/cp044-reporting-schedules.test.ts", "scripts/cp044-users.test.ts", "scripts/cp045-settings.test.ts", "scripts/cp046-notifications.test.ts"]);
run(node, ["--experimental-test-isolation=none", "--test", "scripts/inventory-import.test.mjs", "scripts/catalog-schema.test.mjs", "scripts/catalog-migration.test.mjs", "scripts/cart-persistence.test.mjs", "scripts/catalog-products-api.test.mjs", "scripts/quote-persistence.test.mjs", "scripts/catalog-filter-contract.test.mjs", "scripts/client-catalog-state.test.mjs", "scripts/catalog-pagination.test.mjs", "scripts/catalog-search-contract.test.mjs", "scripts/quote-form-persistence.test.mjs", "scripts/catalog-unavailable-state.test.mjs", "scripts/catalog-api-unavailable.test.mjs", "scripts/catalog-public-unavailable.test.mjs", "scripts/database-migration-runner.test.mjs", "scripts/inventory-operations-contract.test.mjs"]);
run(node, ["--experimental-test-isolation=none", "--test", "scripts/cp034-customers-route.test.mjs", "scripts/admin-customers-ui-contract.test.mjs", "scripts/cp035-pipeline.test.mjs", "scripts/admin-pipeline-ui-contract.test.mjs"]);
run(node, [moduleBin("tsx/dist/cli.mjs"), "--test", "--experimental-test-isolation=none", "scripts/cp035-domain.test.ts", "scripts/cp048-promotions.test.ts", "scripts/cp049-operations.test.ts", "scripts/operations-comparison.test.ts", "scripts/brief10-domain.test.ts"]);
run(node, [moduleBin("tsx/dist/cli.mjs"), "--test", "--experimental-test-isolation=none", "scripts/inventory-import-db.test.ts", "scripts/import-options.test.ts", "scripts/rebuild-product-slugs.test.ts", "scripts/restore-local-from-backup.test.ts", "scripts/catalog-view-model.test.ts", "scripts/product-image.test.ts", "scripts/compatibility-safety.test.ts", "scripts/category-aliases.test.ts", "scripts/qa-inventory-full.test.ts", "scripts/qa-inventory-data.test.ts"]);
run(node, [moduleBin("tsx/dist/cli.mjs"), "--test", "--experimental-test-isolation=none", "scripts/brief17-r2-corrections.test.ts"]);
run(node, [moduleBin("tsx/dist/cli.mjs"), "--test", "--experimental-test-isolation=none", "scripts/catalog-search-runtime.test.ts"]);
const phaseFiles = ["phase3-home-structure.test.mjs", "phase4-catalog-structure.test.mjs", "phase5-quote-flow.test.mjs", "phase6-v1-readiness.test.mjs", "phase7-preproduction.test.mjs", "phase8-visual-readiness.test.mjs", "phase9a-predeploy-guards.test.mjs", "phase9a2-preview-readiness.test.mjs", "phase9a3-github-readiness.test.mjs", "phase10-cart-flow.test.mjs", "phase11-rbac.test.mjs", "phase12-production-readiness.test.mjs", "phase14-auth-config-guard.test.mjs", "phase15-catalog-contract.test.mjs", "phase16-navigation-design.test.mjs", "phase17-home-catalog-first.test.mjs", "phase18-catalog-facets.test.mjs", "phase19-product-detail.test.mjs", "phase20-quote-events.test.mjs", "phase21-editorial-admin.test.mjs", "phase22-seo-faq-media.test.mjs", "phase23-preview-embed.test.mjs", "phase24-real-catalog-pilot.test.mjs", "phase25-quote-session-autocomplete.test.mjs", "phase26-quote-profile-fields.test.mjs", "phase27-quote-workflow.test.mjs", "phase28-audit-log.test.mjs", "phase29-client-erp-modules.test.mjs", "phase30-profile-edit.test.mjs", "phase31-preview-host.test.mjs"];
for (const file of phaseFiles) run(node, [`scripts/${file}`]);
run(node, [moduleBin("typescript/bin/tsc"), "--noEmit"]);
run(node, [moduleBin("eslint/bin/eslint.js")]);
run(node, [moduleBin("next/dist/bin/next"), "build"]);
