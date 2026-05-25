import { describe, it, expect } from 'vitest'
import { buildCursorPage } from './pagination.js'

const items = ['a', 'b', 'c', 'd', 'e']
const getCursor = (s: string) => s

describe('buildCursorPage', () => {
  it('returns all items and null cursor when count <= limit', () => {
    const result = buildCursorPage(items.slice(0, 3), 5, getCursor)
    expect(result.items).toEqual(['a', 'b', 'c'])
    expect(result.nextCursor).toBeNull()
  })

  it('returns all items and null cursor when count equals limit', () => {
    const result = buildCursorPage(items.slice(0, 5), 5, getCursor)
    expect(result.items).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(result.nextCursor).toBeNull()
  })

  it('slices to limit and sets nextCursor to last kept item when count > limit', () => {
    // caller passes limit+1 rows; we slice to limit and cursor the last kept item
    const result = buildCursorPage(items, 4, getCursor)
    expect(result.items).toEqual(['a', 'b', 'c', 'd'])
    expect(result.nextCursor).toBe('d')
  })

  it('handles limit of 1 with more items', () => {
    const result = buildCursorPage(['x', 'y'], 1, getCursor)
    expect(result.items).toEqual(['x'])
    expect(result.nextCursor).toBe('x')
  })

  it('handles empty input', () => {
    const result = buildCursorPage([], 10, getCursor)
    expect(result.items).toEqual([])
    expect(result.nextCursor).toBeNull()
  })

  it('uses getCursor return value as the cursor string', () => {
    const objs = [{ id: '1', ts: 'a' }, { id: '2', ts: 'b' }, { id: '3', ts: 'c' }]
    const result = buildCursorPage(objs, 2, (o) => o.ts)
    expect(result.nextCursor).toBe('b')
    expect(result.items).toHaveLength(2)
  })
})
