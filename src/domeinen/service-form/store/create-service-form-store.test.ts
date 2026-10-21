import { describe, expect, it } from 'vitest';
import { createServiceFormStore } from './create-service-form-store';

const answer = { value: 'A', displayValue: 'A' };

describe('createServiceFormStore', () => {
  it('creates isolated form sessions', () => {
    const first = createServiceFormStore();
    const second = createServiceFormStore();
    first.getState().initialize({ dn_name: answer }, 'section-1');
    first.getState().setAnswer('dn_name', { value: 'B', displayValue: 'B' });

    expect(first.getState().answers.dn_name?.value).toBe('B');
    expect(second.getState().answers.dn_name).toBeUndefined();
  });

  it('opens every supplied section for the read-only finish summary', () => {
    const store = createServiceFormStore();
    store.getState().initialize({}, ['section-1', 'section-2']);

    expect(store.getState().expandedSections).toEqual({
      'section-1': true,
      'section-2': true,
    });
  });

  it('keeps at most one section open when toggling or expanding in the edit form', () => {
    const store = createServiceFormStore();
    store.getState().initialize({}, 'section-1');
    store.getState().expandSection('section-2');
    expect(store.getState().expandedSections).toEqual({ 'section-2': true });
    store.getState().toggleSection('section-2');
    expect(store.getState().expandedSections).toEqual({});
  });

  it('updates nested state immutably and resets transient state', () => {
    const store = createServiceFormStore();
    store.getState().initialize({ dn_name: answer }, 'section-1');
    const previousAnswers = store.getState().answers;
    store.getState().setAnswer('dn_name', { value: 'B', displayValue: 'B' });
    store.getState().touchField('dn_name');
    store.getState().toggleSection('section-2');

    expect(store.getState().answers).not.toBe(previousAnswers);
    expect(previousAnswers.dn_name?.value).toBe('A');
    expect(store.getState().expandedSections).toEqual({ 'section-2': true });

    store.getState().reset();
    expect(store.getState().answers).toEqual({ dn_name: answer });
    expect(store.getState().touched).toEqual({});
    expect(store.getState().requiredFieldOverrides).toEqual({});
  });

  it('updates multiple answers atomically and scopes required overrides', () => {
    const store = createServiceFormStore();
    store.getState().initialize({ dn_name: answer }, 'section-1');

    store.getState().setAnswers({
      dn_brand: { value: 'brand-id', displayValue: 'Nissan' },
      dn_type: { value: 'type-id', displayValue: 'Juke' },
    });
    store.getState().setFieldsRequired(['dn_type'], true);

    expect(store.getState().answers).toMatchObject({
      dn_brand: { value: 'brand-id', displayValue: 'Nissan' },
      dn_type: { value: 'type-id', displayValue: 'Juke' },
    });
    expect(store.getState().requiredFieldOverrides).toEqual({ dn_type: true });

    store.getState().setFieldsRequired(['dn_type'], false);
    expect(store.getState().requiredFieldOverrides).toEqual({});
  });

  it('does not notify subscribers when setFieldsRequired is a no-op', () => {
    const store = createServiceFormStore();
    store.getState().initialize({ dn_name: answer }, 'section-1');
    store.getState().setFieldsRequired(['dn_type'], true);

    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });
    store.getState().setFieldsRequired(['dn_type'], true);
    store.getState().setFieldsRequired(['dn_other'], false);
    unsubscribe();

    expect(notifications).toBe(0);
    expect(store.getState().requiredFieldOverrides).toEqual({ dn_type: true });
  });

  it('toggles signature hide/no-email state and resets it', () => {
    const store = createServiceFormStore();
    store.getState().initialize({ dn_name: answer }, 'section-1');

    store.getState().toggleHideSignature('dn_signature');
    expect(store.getState().hideSignature).toEqual({ dn_signature: true });
    store.getState().toggleHideSignature('dn_signature');
    expect(store.getState().hideSignature).toEqual({});

    store.getState().toggleNoEmailConfirmation('dn_signature');
    expect(store.getState().noEmailConfirmation).toEqual({ dn_signature: true });

    store.getState().toggleHideSignature('dn_signature');
    store.getState().reset();
    expect(store.getState().hideSignature).toEqual({});
    expect(store.getState().noEmailConfirmation).toEqual({});
  });

  it('clears field errors when signature toggles change', () => {
    const store = createServiceFormStore();
    store.getState().initialize({ signature_receiver: answer }, 'section-1');
    store.getState().setErrors({
      signature_receiver: {
        code: 'signature-email-required',
        message: 'E-mailadres bij de handtekening is verplicht.',
      },
    });

    store.getState().toggleNoEmailConfirmation('signature_receiver');
    expect(store.getState().errors.signature_receiver).toBeUndefined();

    store
      .getState()
      .setErrors({ signature_receiver: { code: 'required', message: 'Dit veld is verplicht.' } });
    store.getState().toggleHideSignature('signature_receiver');
    expect(store.getState().errors.signature_receiver).toBeUndefined();
  });

  it('derives acceptedTermsAndConditions from requiresTermsAcceptance and restores it on reset', () => {
    const store = createServiceFormStore();
    store.getState().initialize({ dn_name: answer }, 'section-1', true);

    expect(store.getState().termsAcceptanceRequired).toBe(true);
    expect(store.getState().acceptedTermsAndConditions).toBe(false);

    store.getState().setAcceptedTermsAndConditions(true);
    expect(store.getState().acceptedTermsAndConditions).toBe(true);

    store.getState().reset();
    expect(store.getState().termsAcceptanceRequired).toBe(true);
    expect(store.getState().acceptedTermsAndConditions).toBe(false);
  });

  it('defaults acceptedTermsAndConditions to true when terms acceptance is not required', () => {
    const store = createServiceFormStore();
    store.getState().initialize({ dn_name: answer }, 'section-1');

    expect(store.getState().termsAcceptanceRequired).toBe(false);
    expect(store.getState().acceptedTermsAndConditions).toBe(true);
  });

  it('restores persisted draft state on initialize', () => {
    const store = createServiceFormStore();
    store.getState().initialize({ dn_name: answer }, 'section-1', false, {
      answers: { dn_brand: { value: 'brand-id', displayValue: 'Nissan' } },
      hideSignature: {},
      noEmailConfirmation: {},
      acceptedTermsAndConditions: true,
      recommendedFieldId: 'field-2',
      expandedSections: { 'section-2': true },
      timestamp: Date.now(),
    });

    expect(store.getState().answers).toMatchObject({
      dn_name: answer,
      dn_brand: { value: 'brand-id', displayValue: 'Nissan' },
    });
    expect(store.getState().recommendedFieldId).toBe('field-2');
    expect(store.getState().expandedSections).toEqual({ 'section-2': true });
  });

  it('reinitializeToBackend replaces answers and clears transient session state', () => {
    const store = createServiceFormStore();
    const backendAnswer = { value: 'CRM', displayValue: 'CRM' };
    store.getState().initialize({ dn_name: answer }, 'section-1');
    store.getState().setAnswer('dn_name', { value: 'manual', displayValue: 'manual' });
    store.getState().setAnswer('dn_brand', { value: 'brand-id', displayValue: 'Nissan' });
    store.getState().touchField('dn_name');
    store.getState().toggleHideSignature('dn_signature');
    store.getState().setRecommendedFieldId('field-2');

    store.getState().reinitializeToBackend({ dn_name: backendAnswer }, 'section-1', true);

    expect(store.getState().answers).toEqual({ dn_name: backendAnswer });
    expect(store.getState().initialAnswers).toEqual({ dn_name: backendAnswer });
    expect(store.getState().answers.dn_brand).toBeUndefined();
    expect(store.getState().touched).toEqual({});
    expect(store.getState().hideSignature).toEqual({});
    expect(store.getState().recommendedFieldId).toBeNull();
    expect(store.getState().acceptedTermsAndConditions).toBe(false);
  });

  it('keeps initialAnswers isolated from in-session answer mutations', () => {
    const store = createServiceFormStore();
    store.getState().initialize({ dn_name: answer }, 'section-1');
    const sessionName = store.getState().answers.dn_name;
    if (sessionName) {
      sessionName.value = 'mutated';
    }

    expect(store.getState().initialAnswers.dn_name?.value).toBe('A');

    store.getState().reset();
    expect(store.getState().answers.dn_name?.value).toBe('A');
  });

  it('bumps uiResetEpoch on full reset', () => {
    const store = createServiceFormStore();
    store.getState().initialize({ dn_name: answer }, 'section-1');
    expect(store.getState().uiResetEpoch).toBe(0);

    store.getState().reset();
    expect(store.getState().uiResetEpoch).toBe(1);
    store.getState().reset();
    expect(store.getState().uiResetEpoch).toBe(2);
  });

  it('resetSection replaces answers for the given keys and clears their transient flags', () => {
    const store = createServiceFormStore();
    store.getState().initialize(
      {
        dn_name: answer,
        dn_notes: { value: 'CRM', displayValue: 'CRM' },
      },
      'section-1',
    );
    store.getState().setAnswer('dn_name', { value: 'B', displayValue: 'B' });
    store.getState().setAnswer('dn_notes', { value: 'typed', displayValue: 'typed' });
    store.getState().touchField('dn_notes');
    store.getState().setFieldError('dn_notes', { code: 'required', message: 'required' });
    store.getState().toggleHideSignature('dn_notes');
    store.getState().setFieldsRequired(['dn_notes'], true);

    store.getState().resetSection(
      {
        dn_name: { value: 'B', displayValue: 'B' },
        dn_notes: { value: 'CRM', displayValue: 'CRM' },
      },
      ['dn_notes'],
    );

    expect(store.getState().answers).toEqual({
      dn_name: { value: 'B', displayValue: 'B' },
      dn_notes: { value: 'CRM', displayValue: 'CRM' },
    });
    expect(store.getState().touched.dn_notes).toBeUndefined();
    expect(store.getState().errors.dn_notes).toBeUndefined();
    expect(store.getState().hideSignature.dn_notes).toBeUndefined();
    expect(store.getState().requiredFieldOverrides.dn_notes).toBeUndefined();
    expect(store.getState().uiResetEpoch).toBe(1);
    expect(store.getState().initialAnswers.dn_name?.value).toBe('A');
  });
});
