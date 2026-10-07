import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '@/shared/ui/theme';
import { toStructuredAddress, type StructuredAddress } from '../domain/structured-address';
import { usePlacesClient } from '../hooks/places-context';
import { AddressSearchSheet } from './address-search-sheet';

/**
 * Drop-in search control for any screen: search button + sheet + details → `StructuredAddress`.
 * Renders nothing when Places is not configured (no API key).
 */
export function PlaceSearchControl({
  onSelected,
  initialQuery,
  disabled = false,
}: {
  onSelected: (address: StructuredAddress) => void | Promise<void>;
  initialQuery: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const places = usePlacesClient();
  const [open, setOpen] = useState(false);

  if (!places || disabled) {
    return null;
  }

  const apply = async (placeId: string, description: string): Promise<void> => {
    try {
      const details = await places.details(placeId);
      if (!details) {
        Alert.alert(t('places.searchTitle'), t('places.searchFailed'));
        return;
      }
      await onSelected(toStructuredAddress(details, description));
    } catch {
      Alert.alert(t('places.searchTitle'), t('places.searchFailed'));
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('places.search')}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons name="search" size={22} color={colors.brandText} />
      </Pressable>
      {open ? (
        <AddressSearchSheet
          visible
          places={places}
          initialQuery={initialQuery}
          onClose={() => setOpen(false)}
          onChoose={(prediction) => {
            setOpen(false);
            void apply(prediction.placeId, prediction.description);
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
