import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./reference-data-sync-screen.tsx', import.meta.url), 'utf8');

describe('reference data sync screen', () => {
  it('opens locally stored JSON beside the existing refresh action', () => {
    expect(source).toContain('name="eye-outline"');
    expect(source).toContain('setViewedTopic(topic.name);');
    expect(source).toContain('referenceData.getEntity(viewedTopic)');
    expect(source).toContain('referenceData.getEntityMeta(viewedTopic)');
    expect(source).toContain('JSON.stringify(entity, null, 2)');
    expect(source).toContain('onPress={() => refreshTopic(topic.name)}');
  });

  it('renders large JSON line by line so form definitions stay visible', () => {
    expect(source).toContain('<FlatList');
    expect(source).toContain("jsonState.content.split('\\n')");
    expect(source).toContain('style={styles.jsonLine}');
    expect(source).toContain('settings.referenceData.jsonLoading');
    expect(source).toContain('settings.referenceData.jsonMissing');
    expect(source).toContain('settings.referenceData.jsonError');
    expect(source).toContain('onClose={() => setViewedTopic(null)}');
    expect(source).toContain('if (!cancelled)');
  });

  it('shows when the file was fetched and when its content last changed', () => {
    expect(source).toContain('settings.referenceData.jsonFetchedAt');
    expect(source).toContain('settings.referenceData.jsonChangedAt');
    expect(source).toContain('settings.referenceData.jsonFetchedUnknown');
    expect(source).toContain('settings.referenceData.jsonChangedUnknown');
    expect(source).toContain('subtitle=');
  });
});
