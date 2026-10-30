import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { useCursorPaging } from '../../hooks/useCursorPaging';
import { Button } from './Button';

/** Previous/Next controls for a cursor-paged list. Hidden when there is only one page. */
export function Pagination({
  paging,
  nextCursor,
}: {
  paging: ReturnType<typeof useCursorPaging>;
  nextCursor: string | null;
}) {
  if (!paging.hasPrevious && !nextCursor) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="secondary" disabled={!paging.hasPrevious} onClick={paging.previous}>
        <ChevronLeft className="size-4" aria-hidden />
        Previous
      </Button>
      <span className="text-sm text-slate-500">Page {paging.page}</span>
      <Button variant="secondary" disabled={!nextCursor} onClick={() => nextCursor && paging.next(nextCursor)}>
        Next
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
