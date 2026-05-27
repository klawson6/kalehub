export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export function buildCursorPage<T>(
  rawItems: T[],
  limit: number,
  getCursor: (item: T) => string,
): CursorPage<T> {
  const hasMore = rawItems.length > limit;
  const items = hasMore ? rawItems.slice(0, limit) : rawItems;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem !== undefined ? getCursor(lastItem) : null;
  return { items, nextCursor };
}
