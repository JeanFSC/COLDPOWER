// Admin modules temporarily hidden from every UI entry point (navigation, recent items and
// direct URL). Their data and API routes stay intact; remove an entry to bring it back.
export const HIDDEN_ADMIN_MODULES = ["/admin/cms"] as const;

export function isHiddenAdminHref(href: string) {
  return HIDDEN_ADMIN_MODULES.some(
    (module) => href === module || href.startsWith(`${module}/`) || href.startsWith(`${module}?`),
  );
}
