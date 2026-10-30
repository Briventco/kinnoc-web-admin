import { useState } from 'react';

/**
 * Previous/Next paging over the API's cursors. The API has no page numbers,
 * so "Previous" replays cursors already seen. History resets whenever
 * `resetKey` (e.g. the serialized filters) changes.
 */
export function useCursorPaging(resetKey: string) {
  const [paging, setPaging] = useState<{ key: string; cursors: (string | undefined)[] }>({
    key: resetKey,
    cursors: [undefined],
  });
  const cursors = paging.key === resetKey ? paging.cursors : [undefined];

  return {
    cursor: cursors[cursors.length - 1],
    page: cursors.length,
    hasPrevious: cursors.length > 1,
    previous: () => setPaging({ key: resetKey, cursors: cursors.slice(0, -1) }),
    next: (nextCursor: string) => setPaging({ key: resetKey, cursors: [...cursors, nextCursor] }),
  };
}
