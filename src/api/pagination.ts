import type { Page } from '../types/api';

export interface ItemCount {
  count: number;
  /** False when there were more items than we were willing to page through. */
  exact: boolean;
}

/**
 * The API has no totals, so counts come from paging through a list (50 per
 * page) up to `maxPages`. Beyond that the count is a lower bound ("200+").
 */
export async function countPages<T>(
  fetchPage: (cursor: string | undefined) => Promise<Page<T>>,
  maxPages = 4,
): Promise<ItemCount> {
  let count = 0;
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const result = await fetchPage(cursor);
    count += result.items.length;
    if (!result.nextCursor) return { count, exact: true };
    cursor = result.nextCursor;
  }
  return { count, exact: false };
}
