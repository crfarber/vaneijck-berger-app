import { authorize, refresh } from 'react-native-app-auth';
import { fetch as expoFetch } from 'expo/fetch';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import type { InternalAuth } from '@/domeinen/auth';
import { createInternalAuth } from '@/domeinen/auth/ui';
import { createExpoLocationReader } from '@/domeinen/location/ui';
import { createFirebasePushGateway } from '@/domeinen/notifications/ui';
import { createPhotoLocationReader } from '@/domeinen/photos';
import { createExpoPhotoFiles } from '@/domeinen/photos/ui';
import { createExpoDevicePermissions } from '@/domeinen/settings/ui';
import { createRnLogShare } from '@/domeinen/support/ui';
import { createDeviceKeyValueStore } from '@/shared/platform/rn/key-value-store';
import { createExpoHaptics } from '@/shared/platform/rn/expo-haptics';
import { createExpoMultipartUploadFiles } from '@/shared/platform/rn/expo-multipart-upload-files';
import { createDeviceSecretStore } from '@/shared/platform/rn/secure-store';
import { consoleSink } from '@/shared/platform/rn/console-sink';
import type { RuntimeConfig } from '@/shared/config/runtime-config';
import type { Language } from '@/shared/i18n/resources';
import { createContainer, type Container } from './container';
import { readRuntimeConfig } from './env';

/** Dutch when the phone is set to Dutch, English otherwise. */
function detectLanguage(): Language {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  return locale.startsWith('nl') ? 'nl' : 'en';
}

/** Null when this build has no Azure AD configuration (see `parseRuntimeConfig`). */
function buildInternalAuth(config: RuntimeConfig): InternalAuth | null {
  if (config.azureAd === null) {
    return null;
  }
  return createInternalAuth({ config: config.azureAd, client: { authorize, refresh } });
}

/** The container with the real device parts. Created once, when the app starts. */
export function createNativeContainer(): Container {
  const config = readRuntimeConfig();
  const secretStore = createDeviceSecretStore();
  const locationReader = createExpoLocationReader();
  return createContainer({
    config,
    secretStore,
    keyValueStore: createDeviceKeyValueStore(),
    language: detectLanguage(),
    internalAuth: buildInternalAuth(config),
    locationReader,
    photoLocationReader: createPhotoLocationReader(locationReader, __DEV__ && !Device.isDevice),
    devicePermissions: createExpoDevicePermissions(),
    logShare: createRnLogShare(),
    photoFiles: createExpoPhotoFiles(secretStore),
    multipartUploadFiles: createExpoMultipartUploadFiles(),
    pushGateway: createFirebasePushGateway(),
    notificationNavigation: {
      openAllocations() {
        router.navigate('/');
      },
    },
    haptics: createExpoHaptics(),
    logSink: consoleSink,
    fetch: expoFetch,
  });
}
