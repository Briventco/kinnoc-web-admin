import { type FormEvent, useState } from 'react';
import { Search } from 'lucide-react';
import { EVENT_CATEGORIES, EVENT_STATUSES } from '../../types/event';
import { categoryLabel } from '../../utils/format';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/FormField';

/** The filters the admin list supports (GET /admin/events). Empty strings mean "any". */
export interface EventFilterValues {
  q: string;
  status: string;
  category: string;
  city: string;
  from: string;
  to: string;
}

interface EventFiltersProps {
  values: EventFilterValues;
  onChange: (values: EventFilterValues) => void;
  disabled?: boolean;
}

export function EventFilters({ values, onChange, disabled }: EventFiltersProps) {
  // Text fields apply on submit; selects and dates apply immediately.
  const [q, setQ] = useState(values.q);
  const [city, setCity] = useState(values.city);
  const [qError, setQError] = useState<string>();

  function submit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query.length === 1 || query.length > 100) {
      setQError('Search needs 2–100 characters.');
      return;
    }
    setQError(undefined);
    onChange({ ...values, q: query, city: city.trim() });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
      <div className="sm:col-span-2">
        <TextField
          label="Search"
          type="search"
          placeholder="Title, organizer, venue, city or tag"
          value={q}
          error={qError}
          onChange={(e) => setQ(e.target.value)}
          disabled={disabled}
        />
      </div>
      <SelectField
        label="Status"
        value={values.status}
        onChange={(e) => onChange({ ...values, status: e.target.value })}
        disabled={disabled}
      >
        <option value="">Any status</option>
        {EVENT_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Category"
        value={values.category}
        onChange={(e) => onChange({ ...values, category: e.target.value })}
        disabled={disabled}
      >
        <option value="">Any category</option>
        {EVENT_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {categoryLabel(category)}
          </option>
        ))}
      </SelectField>
      <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} disabled={disabled} />
      <div className="flex items-end">
        <Button type="submit" variant="secondary" className="w-full" disabled={disabled}>
          <Search className="size-4" aria-hidden />
          Search
        </Button>
      </div>
      <TextField
        label="Starting from"
        type="date"
        value={values.from}
        onChange={(e) => onChange({ ...values, from: e.target.value })}
        disabled={disabled}
      />
      <TextField
        label="Starting before"
        type="date"
        value={values.to}
        onChange={(e) => onChange({ ...values, to: e.target.value })}
        disabled={disabled}
      />
    </form>
  );
}
