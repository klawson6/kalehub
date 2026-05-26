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
  const nextCursor = hasMore ? getCursor(items[items.length - 1]!) : null;
  return { items, nextCursor };
}
