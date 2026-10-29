import { useLocation, useNavigate } from 'react-router';
import { Button } from './Button';
import { SuccessAlert } from './Alert';

/**
 * Shows `location.state.flash`, set by a page that navigated here after a
 * successful save (e.g. `navigate(to, { state: { flash: 'Event created.' } })`).
 */
export function FlashMessage() {
  const location = useLocation();
  const navigate = useNavigate();
  const flash = (location.state as { flash?: string } | null)?.flash;
  if (!flash) return null;
  return (
    <div className="mb-4">
      <SuccessAlert
        action={
          <Button
            variant="ghost"
            className="!px-2 !py-0.5 text-xs"
            onClick={() => navigate(location.pathname + location.search, { replace: true, state: null })}
          >
            Dismiss
          </Button>
        }
      >
        {flash}
      </SuccessAlert>
    </div>
  );
}
