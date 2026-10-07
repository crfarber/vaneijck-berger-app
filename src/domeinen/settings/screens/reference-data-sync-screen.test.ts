import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./reference-data-sync-screen.tsx', import.meta.url), 'utf8');

describe('reference data sync screen', () => {
  it('opens locally stored JSON beside the existing refresh action', () => {
    expect(source).toContain('name="eye-outline"');
    expect(source).toContain('setViewedTopic(topic.name);');
    expect(source).toContain('referenceData.getEntity(viewedTopic)');
    expect(source).toContain('JSON.stringify(entity, null, 2)');
    expect(source).toContain('onPress={() => refreshTopic(topic.name)}');
  });

  it('keeps JSON selectable and scrollable and handles loading, missing data and read errors', () => {
    expect(source).toContain('<ScrollView');
    expect(source).toContain('<Text selectable style={styles.json}');
    expect(source).toContain('settings.referenceData.jsonLoading');
    expect(source).toContain('settings.referenceData.jsonMissing');
    expect(source).toContain('settings.referenceData.jsonError');
    expect(source).toContain('onClose={() => setViewedTopic(null)}');
    expect(source).toContain('if (!cancelled)');
  });
});
