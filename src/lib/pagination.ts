export function parsePagination(request: Request, maxPageSize = 100) {
  const params = new URL(request.url).searchParams;
  const pageValue = Number(params.get("page") ?? 1);
  const sizeValue = Number(params.get("pageSize") ?? 25);
  const pageSize = Number.isFinite(sizeValue) ? Math.min(maxPageSize, Math.max(1, Math.floor(sizeValue))) : 25;
  const requestedPage = Number.isFinite(pageValue) ? Math.max(1, Math.floor(pageValue)) : 1;
  return { requestedPage, pageSize };
}

export function paginationMeta(requestedPage: number, pageSize: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / pageSize));
  return { page: Math.min(requestedPage, totalPages), pageSize, totalItems, totalPages };
}
