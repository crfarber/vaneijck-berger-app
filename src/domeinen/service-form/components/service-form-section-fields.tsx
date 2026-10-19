import { type ReactElement } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { spacing } from '@/shared/ui/theme';
import { buildAddressEntrySectionRenderItems } from '../domain/address-entry';
import { groupSectionFields } from '../domain/field-kind';
import { findLicensePlateGroupInFields } from '../domain/license-plate-entry';
import { partitionFieldsAroundPersonNameGroups } from '../domain/person-name-entry';
import { partitionVehicleRegistrationFields } from '../domain/rdw-autofill';
import type {
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormErrors,
  ServiceFormField,
  ServiceFormSection,
} from '../domain/types';
import type { FetchRdwInfo } from '../hooks/service-form-context';
import { ReadonlyFieldSummary } from './readonly-field-summary';
import { ServiceFieldRenderer } from './service-field-renderer';
import { ServiceFormAddressGroup } from './service-form-address-group';
import { ServiceFormLicensePlateGroup } from './service-form-license-plate-group';
import { ServiceFormPersonNameGroup } from './service-form-person-name-group';
import { ServiceFormVehicleRegistrationGroup } from './service-form-vehicle-registration-group';

/**
 * Renders one section's fields (license plate, vehicle, person-name, address, or plain fields).
 * Shared by the editable form and the read-only finish screen.
 */
export function ServiceFormSectionFields({
  section,
  answers,
  errors,
  readOnly,
  pleaseSelectLabel,
  uiResetEpoch,
  fetchRdwInfo,
  updateAnswer,
  updateAnswers,
  setFieldsRequired,
  onFocus,
  onBlur,
  registerFieldRef,
  registerInputRef,
  onFieldLayout,
}: {
  section: ServiceFormSection;
  answers: ServiceFormAnswers;
  errors: ServiceFormErrors;
  readOnly: boolean;
  pleaseSelectLabel: string;
  uiResetEpoch: number;
  fetchRdwInfo: FetchRdwInfo | undefined;
  updateAnswer: (fieldKey: string, answer: ServiceFormAnswer) => void;
  updateAnswers: (answerUpdates: ServiceFormAnswers) => void;
  setFieldsRequired: (fieldKeys: string[], required: boolean) => void;
  onFocus: (field: ServiceFormField) => void;
  onBlur: (field: ServiceFormField) => void;
  registerFieldRef: (fieldId: string, node: View | null) => void;
  registerInputRef: (fieldId: string, node: TextInput | null) => void;
  onFieldLayout: (fieldId: string) => void;
}): ReactElement {
  const licensePlateGroup = findLicensePlateGroupInFields(section.fields);
  const licensePlateFieldKeys = licensePlateGroup
    ? new Set(licensePlateGroup.orderedFields.map((field) => field.key))
    : null;
  const fieldsWithoutLicensePlate = licensePlateFieldKeys
    ? section.fields.filter((field) => !licensePlateFieldKeys.has(field.key))
    : section.fields;
  const { vehicleFields, otherFields } = licensePlateGroup
    ? { vehicleFields: [] as typeof section.fields, otherFields: fieldsWithoutLicensePlate }
    : partitionVehicleRegistrationFields(fieldsWithoutLicensePlate);
  const personNameBlocks = partitionFieldsAroundPersonNameGroups(otherFields);

  const renderFieldGroups = (fields: typeof section.fields) => {
    const fieldGroups = readOnly
      ? groupSectionFields(fields, { readonly: true })
      : buildAddressEntrySectionRenderItems(fields);
    return fieldGroups.map((group) => (
      <View
        key={
          group.kind === 'readonly'
            ? `readonly:${group.fields.map((field) => field.id).join(':')}`
            : group.kind === 'address-entry'
              ? `address:${group.group.anchor.id}:${uiResetEpoch}`
              : `field:${group.field.id}`
        }
        style={styles.fieldSpacing}
      >
        {group.kind === 'readonly' ? (
          <ReadonlyFieldSummary fields={group.fields} answers={answers} />
        ) : group.kind === 'address-entry' ? (
          <ServiceFormAddressGroup
            group={group.group}
            answers={answers}
            errors={errors}
            pleaseSelectLabel={pleaseSelectLabel}
            readOnly={readOnly}
            updateAnswer={updateAnswer}
            updateAnswers={updateAnswers}
            onFocus={onFocus}
            onBlur={onBlur}
            registerFieldRef={registerFieldRef}
            registerInputRef={registerInputRef}
            onFieldLayout={onFieldLayout}
          />
        ) : (
          <View
            collapsable={false}
            ref={(node) => registerFieldRef(group.field.id, node)}
            onLayout={() => onFieldLayout(group.field.id)}
          >
            <ServiceFieldRenderer
              field={group.field}
              answer={answers[group.field.key]}
              error={errors[group.field.key]}
              dependencyAnswer={
                group.field.dependencies?.required
                  ? answers[group.field.dependencies.required]
                  : undefined
              }
              pleaseSelectLabel={pleaseSelectLabel}
              onChange={updateAnswer}
              onAnswersChange={updateAnswers}
              registerInputRef={registerInputRef}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </View>
        )}
      </View>
    ));
  };

  return (
    <>
      {licensePlateGroup ? (
        <View
          key={`license-plate:${licensePlateGroup.anchor.id}:${uiResetEpoch}`}
          style={styles.fieldSpacing}
        >
          <ServiceFormLicensePlateGroup
            group={licensePlateGroup}
            answers={answers}
            errors={errors}
            pleaseSelectLabel={pleaseSelectLabel}
            readOnly={readOnly}
            fetchRdwInfo={fetchRdwInfo}
            updateAnswer={updateAnswer}
            updateAnswers={updateAnswers}
            setFieldsRequired={setFieldsRequired}
            onFocus={onFocus}
            onBlur={onBlur}
            registerFieldRef={registerFieldRef}
            registerInputRef={registerInputRef}
            onFieldLayout={onFieldLayout}
          />
        </View>
      ) : null}
      {vehicleFields.length > 0 ? (
        <View key="vehicle-registration" style={styles.fieldSpacing}>
          <ServiceFormVehicleRegistrationGroup
            fields={vehicleFields}
            answers={answers}
            errors={errors}
            pleaseSelectLabel={pleaseSelectLabel}
            readOnly={readOnly}
            fetchRdwInfo={fetchRdwInfo}
            updateAnswer={updateAnswer}
            updateAnswers={updateAnswers}
            setFieldsRequired={setFieldsRequired}
            onFocus={onFocus}
            onBlur={onBlur}
            registerFieldRef={registerFieldRef}
            registerInputRef={registerInputRef}
            onFieldLayout={onFieldLayout}
          />
        </View>
      ) : null}
      {personNameBlocks.map((block, blockIndex) =>
        block.kind === 'person-name' ? (
          <View
            key={`person-name:${block.group.anchor.id}:${uiResetEpoch}`}
            style={styles.fieldSpacing}
          >
            <ServiceFormPersonNameGroup
              group={block.group}
              answers={answers}
              errors={errors}
              pleaseSelectLabel={pleaseSelectLabel}
              readOnly={readOnly}
              updateAnswer={updateAnswer}
              updateAnswers={updateAnswers}
              onFocus={onFocus}
              onBlur={onBlur}
              registerFieldRef={registerFieldRef}
              registerInputRef={registerInputRef}
              onFieldLayout={onFieldLayout}
            />
          </View>
        ) : (
          <View key={`fields:${blockIndex}:${block.fields.map((field) => field.id).join(':')}`}>
            {renderFieldGroups(block.fields)}
          </View>
        ),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fieldSpacing: { marginBottom: spacing.sm },
});
