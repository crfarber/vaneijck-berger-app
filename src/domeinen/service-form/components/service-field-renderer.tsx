import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Keyboard, Linking, Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { PlaceSearchControl } from '@/domeinen/places/ui';
import { TextField } from '@/shared/ui/text-field';
import { colors, spacing } from '@/shared/ui/theme';
import {
  formatServiceFormFieldLabel,
  normalizeFieldInput,
  resolveFieldKind,
  type FieldKind,
} from '../domain/field-kind';
import {
  booleanSelectState,
  buildBooleanSelectAnswer,
  selectedOptionAnswer,
} from '../domain/select-options';
import {
  buildAddressPlaceAnswers,
  readAddressComponentMapping,
} from '../domain/address-place-selection';
import type {
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormError,
  ServiceFormField,
} from '../domain/types';
import { useServiceFormService } from '../hooks/service-form-context';
import { useServiceFormQuickOptions } from '../hooks/use-service-form-quick-options';
import { useServiceFormSelectOption } from '../hooks/use-service-form-select-option';
import { BooleanToggle } from './boolean-toggle';
import { FieldFrame, fieldStyles, useErrorText } from './field-frame';
import { SignatureInputField } from './signature-input-field';
import { SelectSheet } from './select-sheet';
import { t } from 'i18next';

export type FieldRendererProps = {
  field: ServiceFormField;
  answer: ServiceFormAnswer | undefined;
  error: ServiceFormError | undefined;
  /** The answer of `field.dependencies.required`, e.g. the brand for a vehicle type. */
  dependencyAnswer: ServiceFormAnswer | undefined;
  pleaseSelectLabel: string;
  onChange: (fieldKey: string, answer: ServiceFormAnswer) => void;
  /** Multi-key updates (address place select fills street/city/…). */
  onAnswersChange?: (answers: ServiceFormAnswers) => void;
  registerInputRef?: (fieldId: string, node: TextInput | null) => void;
  onFocus?: (field: ServiceFormField) => void;
  onBlur: (field: ServiceFormField) => void;
};

const KEYBOARD: Partial<Record<FieldKind, 'numeric' | 'decimal-pad' | 'phone-pad'>> = {
  number: 'numeric',
  decimal: 'decimal-pad',
  phone: 'phone-pad',
};

const EMPTY_DECIMALS = new Set(['00.00', '0.00']);

const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

function TextInputField({
  field,
  answer,
  error,
  onChange,
  registerInputRef,
  onFocus,
  onBlur,
}: FieldRendererProps) {
  const errorText = useErrorText(error);
  const kind = resolveFieldKind(field);
  const shown = text(answer?.displayValue);
  const value = kind === 'decimal' && EMPTY_DECIMALS.has(shown) ? '' : shown;

  return (
    <View style={styles.inputRow}>
      <TextField
        inputRef={(node) => registerInputRef?.(field.id, node)}
        containerStyle={styles.grow}
        label={formatServiceFormFieldLabel(field.label, field.optional)}
        value={value}
        placeholder={kind === 'decimal' ? '0.00' : undefined}
        keyboardType={KEYBOARD[kind] ?? 'default'}
        autoCapitalize={kind === 'text' || kind === 'textarea' ? 'sentences' : 'none'}
        multiline={kind === 'textarea'}
        editable={!field.readOnly}
        error={errorText}
        onChangeText={(typed) => {
          if (field.readOnly) {
            return;
          }
          const stored = normalizeFieldInput(kind, typed);
          onChange(field.key, {
            ...answer,
            value: stored,
            displayValue: stored,
            table: field.table,
          });
        }}
        onFocus={() => onFocus?.(field)}
        onBlur={() => onBlur(field)}
      />
      {kind === 'phone' && value !== '' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('serviceForm.call')}
          onPress={() => void Linking.openURL(`tel:${value}`).catch(() => undefined)}
          style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
        >
          <Ionicons name="call" size={20} color={colors.brandText} />
        </Pressable>
      ) : null}
    </View>
  );
}

function SelectInputField({
  field,
  answer,
  error,
  dependencyAnswer,
  pleaseSelectLabel,
  onChange,
  onFocus,
  onBlur,
}: FieldRendererProps) {
  const { t: translate } = useTranslation();
  const select = useServiceFormSelectOption({
    field,
    dependencyValue: dependencyAnswer?.value,
    onSelect: (chosen) => {
      onChange(field.key, chosen);
      onBlur(field);
    },
  });
  const { quickOptions } = useServiceFormQuickOptions({
    field,
    dependencyValue: dependencyAnswer?.value,
    selectedValue: answer?.value,
  });
  const shown = text(answer?.displayValue);
  const empty = shown === '' || shown === pleaseSelectLabel;
  const showQuickPicks = !field.readOnly && quickOptions.length > 0;

  const openSheet = (): void => {
    if (field.readOnly) {
      return;
    }
    if (!field.autocomplete) {
      Keyboard.dismiss();
    }
    onFocus?.(field);
    void select.open();
  };

  return (
    <FieldFrame label={field.label} optional={field.optional} error={error}>
      {showQuickPicks ? (
        <View style={styles.quickPicks}>
          {quickOptions.map((option) => {
            const selected = option.value === answer?.value;
            return (
              <Pressable
                key={`${option.label}-${String(option.value)}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  onFocus?.(field);
                  onChange(field.key, selectedOptionAnswer(option, field.table));
                  onBlur(field);
                }}
                style={({ pressed }) => [
                  styles.quickPickChip,
                  selected && styles.quickPickChipSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[styles.quickPickLabel, selected && styles.quickPickLabelSelected]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translate('serviceForm.select.moreOptions')}
            onPress={openSheet}
            style={({ pressed }) => [
              styles.quickPickChip,
              styles.quickPickMore,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.quickPickMoreLabel} numberOfLines={1}>
              {translate('serviceForm.select.moreOptions')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={formatServiceFormFieldLabel(field.label, field.optional)}
          accessibilityValue={{ text: empty ? pleaseSelectLabel : shown }}
          disabled={field.readOnly}
          onPress={openSheet}
          style={({ pressed }) => [
            fieldStyles.box,
            styles.selectBox,
            field.readOnly && fieldStyles.readonlyBox,
            error && fieldStyles.boxError,
            pressed && !field.readOnly && styles.pressed,
          ]}
        >
          <Text style={[styles.grow, empty ? fieldStyles.placeholder : fieldStyles.value]}>
            {empty ? pleaseSelectLabel : shown}
          </Text>
          {field.readOnly ? null : (
            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          )}
        </Pressable>
      )}
      {field.readOnly ? null : (
        <SelectSheet
          title={field.label}
          options={select.options}
          searchable={field.autocomplete}
          selectedValue={answer?.value}
          onChoose={select.choose}
          onClose={select.close}
        />
      )}
    </FieldFrame>
  );
}

function BooleanInputField({
  field,
  answer,
  error,
  onChange,
  onFocus,
  onBlur,
}: FieldRendererProps) {
  const { t } = useTranslation();
  const service = useServiceFormService();
  const labels = {
    yes: t('serviceForm.yes'),
    no: t('serviceForm.no'),
    clear: t('serviceForm.clear'),
  };

  const handleChange = async (next: boolean | null): Promise<void> => {
    onFocus?.(field);
    const rows = field.table ? await service.loadTable(field.table) : [];
    onChange(
      field.key,
      buildBooleanSelectAnswer(rows, next, {
        yesLabel: labels.yes,
        noLabel: labels.no,
        table: field.table,
      }),
    );
    onBlur(field);
  };

  return (
    <FieldFrame label={field.label} optional={field.optional} error={error}>
      <BooleanToggle
        value={booleanSelectState(answer)}
        optional={field.optional}
        labels={labels}
        hasError={error !== undefined}
        onChange={(next) => void handleChange(next)}
      />
    </FieldFrame>
  );
}

/**
 * The CRM fills date fields; the old app and the pilot only show them
 * (docs/functioneel/open-vragen.md, vraag 27).
 */
function DateDisplayField({ field, answer, error }: FieldRendererProps) {
  const shown = text(answer?.displayValue);
  return (
    <FieldFrame label={field.label} optional={field.optional} error={error}>
      <View style={[fieldStyles.box, fieldStyles.readonlyBox]}>
        <Text style={shown ? fieldStyles.value : fieldStyles.placeholder}>{shown || '–'}</Text>
      </View>
    </FieldFrame>
  );
}

function AddressInputField({
  field,
  answer,
  error,
  onChange,
  onAnswersChange,
  registerInputRef,
  onFocus,
  onBlur,
}: FieldRendererProps) {
  const service = useServiceFormService();
  const errorText = useErrorText(error);
  const shown = text(answer?.displayValue);
  const mapping = readAddressComponentMapping(field.raw as Record<string, unknown>);

  return (
    <View style={styles.inputRow}>
      <TextField
        inputRef={(node) => registerInputRef?.(field.id, node)}
        containerStyle={styles.grow}
        label={formatServiceFormFieldLabel(field.label, field.optional)}
        value={shown}
        onChangeText={(next) =>
          onChange(field.key, {
            ...(answer ?? { value: '', displayValue: '' }),
            value: next,
            displayValue: next,
          })
        }
        onFocus={() => onFocus?.(field)}
        onBlur={() => onBlur(field)}
        error={errorText}
        editable={!field.readOnly}
      />
      {mapping && !field.readOnly ? (
        <PlaceSearchControl
          initialQuery={shown}
          onSelected={async (address) => {
            if (!onAnswersChange) {
              return;
            }
            const countries = await service.loadTable('dn_country');
            onAnswersChange(buildAddressPlaceAnswers(field.key, address, mapping, countries));
            onBlur(field);
          }}
        />
      ) : null}
    </View>
  );
}

function UnsupportedField({ field }: FieldRendererProps) {
  const { t } = useTranslation();
  return (
    <FieldFrame label={field.label} optional={field.optional}>
      <View style={styles.unsupported}>
        <Text style={styles.unsupportedText}>
          {t('serviceForm.unsupportedField', { type: field.type })}
        </Text>
      </View>
    </FieldFrame>
  );
}

/** One editable field, in the input its schema type asks for. */
export function ServiceFieldRenderer(props: FieldRendererProps) {
  switch (resolveFieldKind(props.field)) {
    case 'text':
    case 'textarea':
    case 'number':
    case 'decimal':
    case 'phone':
      return <TextInputField {...props} />;
    case 'select':
      return <SelectInputField {...props} />;
    case 'boolean-select':
      return <BooleanInputField {...props} />;
    case 'date':
      return <DateDisplayField {...props} />;
    case 'address':
      return <AddressInputField {...props} />;
    case 'signature':
      return <SignatureInputField {...props} />;
    case 'unsupported':
      return <UnsupportedField {...props} />;
  }
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  selectBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quickPicks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickPickChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    maxWidth: '100%',
  },
  quickPickChipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  quickPickLabel: {
    color: colors.text,
    fontSize: 14,
  },
  quickPickLabelSelected: {
    color: colors.brandText,
  },
  quickPickMore: {
    borderStyle: 'dashed',
  },
  quickPickMoreLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  unsupported: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.warning,
    borderRadius: 10,
    padding: spacing.md,
  },
  unsupportedText: { color: colors.textMuted, fontSize: 14 },
});
