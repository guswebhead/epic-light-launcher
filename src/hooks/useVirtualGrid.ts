import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useMemo } from "react";

interface UseVirtualGridOptions {
  items: any[];
  columnsPerRow: number;
  itemHeight: number;
  gap?: number;
  overscan?: number;
}

/**
 * Custom hook for virtual scrolling in grid layouts
 * Handles row-based virtualization for efficient rendering of large grids
 *
 * @param items - Array of items to virtualize
 * @param columnsPerRow - Number of columns per row (2, 3, 4, 5, 6)
 * @param itemHeight - Height of each item including gap (e.g., 260px for GameCard + gap)
 * @param gap - Gap between items in pixels (default: 16)
 * @param overscan - Number of items to render outside viewport (default: 5)
 */
export function useVirtualGrid({
  items,
  columnsPerRow,
  itemHeight,
  gap = 16,
  overscan = 5,
}: UseVirtualGridOptions) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate row-based dimensions
  const rowCount = useMemo(
    () => Math.ceil(items.length / columnsPerRow),
    [items.length, columnsPerRow]
  );

  const rowHeight = itemHeight + gap;

  // Create virtualizer for rows (not individual items)
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  // Get virtual rows to render
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // Calculate padding to offset virtual items
  const paddingTop =
    virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  // Get visible items based on rows
  const visibleItems = useMemo(() => {
    const result = [];
    for (const virtualRow of virtualRows) {
      const startIndex = virtualRow.index * columnsPerRow;
      const endIndex = Math.min(
        startIndex + columnsPerRow,
        items.length
      );
      for (let i = startIndex; i < endIndex; i++) {
        result.push({ item: items[i], index: i });
      }
    }
    return result;
  }, [virtualRows, items, columnsPerRow]);

  return {
    parentRef,
    virtualRows,
    visibleItems,
    paddingTop,
    paddingBottom,
    totalSize,
    rowVirtualizer,
  };
}
