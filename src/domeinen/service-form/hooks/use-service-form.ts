import { useMemo } from 'react';
import { answersAfterParentChange } from '../domain/answer-updates';
import { evaluateServiceFormVisibility } from '../domain/conditions';
import {
  selectActiveServiceFormAnswers,
  selectNextIncompleteServiceFormField,
  selectServiceFormProgress,
  selectVisibleServiceFormSections,
} from '../domain/selectors';
import { validateServiceFormField, validateVisibleServiceForm } from '../domain/validation';
import type {
  NormalizedServiceForm,
  ServiceFormAnswer,
  ServiceFormAnswers,
  ServiceFormField,
} from '../domain/types';
import { useServiceFormStore, useServiceFormStoreApi } from '../store/service-form-store-provider';

/**
 * Orchestrates one mounted form: pulls session state from the Zustand store, derives visibility /
 * progress / next-task from the pure domain layer, and exposes the mutations the screen needs.
 * Ported from `hooks/useServicesForm.ts`.
 */
export function useServiceForm(form: NormalizedServiceForm, pleaseSelectLabel: string) {
  const store = useServiceFormStoreApi();
  const answers = useServiceFormStore((state) => state.answers);
  const setAnswers = useServiceFormStore((state) => state.setAnswers);
  const touchField = useServiceFormStore((state) => state.touchField);
  const setFieldError = useServiceFormStore((state) => state.setFieldError);
  const setErrors = useServiceFormStore((state) => state.setErrors);
  const errors = useServiceFormStore((state) => state.errors);
  const touched = useServiceFormStore((state) => state.touched);
  const requiredFieldOverrides = useServiceFormStore((state) => state.requiredFieldOverrides);
  const setFieldsRequired = useServiceFormStore((state) => state.setFieldsRequired);
  const hideSignature = useServiceFormStore((state) => state.hideSignature);
  const noEmailConfirmation = useServiceFormStore((state) => state.noEmailConfirmation);

  const fields = useMemo(() => form.sections.flatMap((section) => section.fields), [form.sections]);
  const visibility = useMemo(() => evaluateServiceFormVisibility(form, answers), [answers, form]);
  const visibleSections = useMemo(
    () => selectVisibleServiceFormSections(form, visibility),
    [form, visibility],
  );
  const progress = useMemo(
    () =>
      selectServiceFormProgress(fields, visibility.visibleFieldIds, answers, {
        requiredFieldOverrides,
        hideSignature,
        noEmailConfirmation,
      }),
    [
      answers,
      fields,
      hideSignature,
      noEmailConfirmation,
      requiredFieldOverrides,
      visibility.visibleFieldIds,
    ],
  );
  const nextIncompleteField = useMemo(
    () =>
      selectNextIncompleteServiceFormField(fields, visibility.visibleFieldIds, answers, {
        requiredFieldOverrides,
        hideSignature,
        noEmailConfirmation,
      }),
    [
      answers,
      fields,
      hideSignature,
      noEmailConfirmation,
      requiredFieldOverrides,
      visibility.visibleFieldIds,
    ],
  );

  const updateAnswers = (answerUpdates: ServiceFormAnswers): void => {
    setAnswers(answerUpdates);
    const nextAnswers = { ...store.getState().answers, ...answerUpdates };
    Object.keys(answerUpdates).forEach((fieldKey) => {
      if (!errors[fieldKey] && !touched[fieldKey]) {
        return;
      }
      const field = fields.find((candidate) => candidate.key === fieldKey);
      if (field) {
        setFieldError(
          fieldKey,
          validateServiceFormField(
            field,
            nextAnswers,
            requiredFieldOverrides,
            hideSignature,
            noEmailConfirmation,
          ),
        );
      }
    });
  };

  const updateAnswer = (fieldKey: string, answer: ServiceFormAnswer): void => {
    updateAnswers(answersAfterParentChange(fields, answers, fieldKey, answer, pleaseSelectLabel));
  };

  const blurField = (field: ServiceFormField): void => {
    touchField(field.key);
    setFieldError(
      field.key,
      validateServiceFormField(
        field,
        store.getState().answers,
        store.getState().requiredFieldOverrides,
        store.getState().hideSignature,
        store.getState().noEmailConfirmation,
      ),
    );
  };

  const validateForm = (): boolean => {
    const nextErrors = validateVisibleServiceForm(
      fields,
      visibility.visibleFieldIds,
      answers,
      requiredFieldOverrides,
      hideSignature,
      noEmailConfirmation,
    );
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const activeAnswers: ServiceFormAnswers = useMemo(
    () => selectActiveServiceFormAnswers(fields, visibility.visibleFieldIds, answers),
    [answers, fields, visibility.visibleFieldIds],
  );

  return {
    answers,
    activeAnswers,
    errors,
    requiredFieldOverrides,
    fields,
    visibility,
    visibleSections,
    progress,
    nextIncompleteField,
    updateAnswer,
    updateAnswers,
    setFieldsRequired,
    blurField,
    validateForm,
  };
}
