import type { AccountHubData } from "@/lib/account-hub";
import { logAccountLoadError } from "@/lib/account-errors";
import type { listPurchasedProductsForUser } from "@/lib/customer-history";
import type { AppRole } from "@/lib/roles";

type PurchasedProducts = Awaited<ReturnType<typeof listPurchasedProductsForUser>>;

export type AccountPageLoaders = {
  getAccountHubData: (userId: string, role: AppRole) => Promise<AccountHubData>;
  listPurchasedProductsForUser: (userId: string) => Promise<PurchasedProducts>;
};

export type AccountPageLoadResult =
  | { kind: "error" }
  | { kind: "ready"; data: AccountHubData; products: PurchasedProducts; repeatPurchaseFailed: boolean };

export async function loadAccountPageData(
  userId: string,
  role: AppRole,
  loaders: AccountPageLoaders,
): Promise<AccountPageLoadResult> {
  let data: AccountHubData;

  try {
    data = await loaders.getAccountHubData(userId, role);
  } catch (error) {
    logAccountLoadError("no se pudo cargar el hub de cuenta", error);
    return { kind: "error" };
  }

  try {
    const products = await loaders.listPurchasedProductsForUser(userId);
    return { kind: "ready", data, products, repeatPurchaseFailed: false };
  } catch (error) {
    logAccountLoadError("no se pudo cargar Volver a comprar", error);
    return { kind: "ready", data, products: [], repeatPurchaseFailed: true };
  }
}
