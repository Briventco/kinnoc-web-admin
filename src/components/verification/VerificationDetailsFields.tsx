import { VERIFICATION_CATEGORIES } from '../../types/verification';
import {
  type VerificationDetailsErrors,
  type VerificationDetailsValues,
  verificationCategoryLabel,
} from '../../utils/verification';
import { SelectField, TextField } from '../ui/FormField';

/** Category, organisation and position, shared by the grant and edit forms. */
export function VerificationDetailsFields({
  values,
  errors,
  disabled,
  onChange,
}: {
  values: VerificationDetailsValues;
  errors: VerificationDetailsErrors;
  disabled?: boolean;
  onChange: (values: VerificationDetailsValues) => void;
}) {
  return (
    <>
      <SelectField
        label="Category"
        required
        value={values.category}
        error={errors.category}
        disabled={disabled}
        onChange={(e) => onChange({ ...values, category: e.target.value as VerificationDetailsValues['category'] })}
      >
        <option value="">Choose a category</option>
        {VERIFICATION_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {verificationCategoryLabel(category)}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Organisation"
        required
        maxLength={150}
        value={values.organisation}
        error={errors.organisation}
        disabled={disabled}
        onChange={(e) => onChange({ ...values, organisation: e.target.value })}
      />
      <TextField
        label="Position"
        required
        maxLength={100}
        value={values.position}
        error={errors.position}
        disabled={disabled}
        onChange={(e) => onChange({ ...values, position: e.target.value })}
      />
    </>
  );
}
