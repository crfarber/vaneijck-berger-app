import { describe, expect, it } from 'vitest';
import { bannerText, isLocalBanner, LOCAL_BANNER_KEY } from './banner';

const fallback = { title: 'Bericht', body: 'Je hebt een nieuwe melding' };

describe('bannerText', () => {
  it('keeps the title and body from the message', () => {
    expect(bannerText({ title: 'Nieuw incident', body: 'A2 Utrecht' }, fallback)).toEqual({
      title: 'Nieuw incident',
      body: 'A2 Utrecht',
    });
  });

  it('substitutes the fallback when the message has no title or body', () => {
    expect(bannerText({ title: '  ', body: '' }, fallback)).toEqual(fallback);
  });
});

describe('isLocalBanner', () => {
  it('recognises a banner this app scheduled itself', () => {
    expect(isLocalBanner({ [LOCAL_BANNER_KEY]: true, type: 'NewIncident' })).toBe(true);
    expect(isLocalBanner({ type: 'NewIncident' })).toBe(false);
    expect(isLocalBanner(null)).toBe(false);
  });
});
