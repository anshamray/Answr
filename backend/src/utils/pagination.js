/**
 * Parse and clamp pagination query params to safe integers.
 *
 * @param {object} options
 * @param {string|number|undefined} options.page
 * @param {string|number|undefined} options.limit
 * @param {number} [options.defaultPage=1]
 * @param {number} [options.defaultLimit=20]
 * @param {number} [options.maxLimit=50]
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function parsePagination({
  page,
  limit,
  defaultPage = 1,
  defaultLimit = 20,
  maxLimit = 50
} = {}) {
  const parsedPage = Number.parseInt(String(page ?? ''), 10);
  const parsedLimit = Number.parseInt(String(limit ?? ''), 10);

  const safePage = Number.isFinite(parsedPage) && parsedPage > 0
    ? parsedPage
    : defaultPage;

  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, maxLimit)
    : defaultLimit;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit
  };
}

