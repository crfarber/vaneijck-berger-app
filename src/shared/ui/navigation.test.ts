import { describe, expect, it } from 'vitest';
import { defaultStackHeaderOptions } from './navigation';
import { colors } from './theme';

describe('default stack header options', () => {
  it('uses a compact black back button on the brand header', () => {
    expect(defaultStackHeaderOptions).toMatchObject({
      headerStyle: { backgroundColor: colors.brand },
      headerBackButtonDisplayMode: 'minimal',
      headerTintColor: colors.brandText,
      headerTitleAlign: 'center',
    });
  });
});
