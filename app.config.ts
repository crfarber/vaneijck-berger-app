import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * One codebase, three variants (internal, acceptance, production).
 * The variant comes from APP_VARIANT, set per build profile in eas.json. That means no native
 * flavors, no react-native-config and no custom plugin.
 *
 * Note: the bundle identifiers are taken over from the old app. Before a production release,
 * confirm whether the new app replaces the existing store listing (see docs/decisions/0009).
 */
/**
 * Custom URL scheme for the Azure AD sign-in redirect, registered in every environment's App
 * Registration (docs/decisions/0012). Independent of the variant scheme above: it identifies the
 * redirect, not the app, and is the same string the old app used, in every environment
 * (EXPO_PUBLIC_AZURE_AD_REDIRECT_URL must keep matching it).
 */
const AZURE_AD_REDIRECT_URL = 'com.vaneijck.auth://login/';

type Variant = 'internal' | 'acceptance' | 'production';

const VARIANTS: Record<Variant, { name: string; id: string; scheme: string }> = {
  internal: { name: 'Van Eijck Intern', id: 'com.vrscloud.internal', scheme: 'vaneijck-internal' },
  acceptance: {
    name: 'Van Eijck Acceptatie',
    id: 'com.vrscloud.acceptance',
    scheme: 'vaneijck-acceptance',
  },
  production: { name: 'Van Eijck', id: 'com.vrscloud', scheme: 'vaneijck' },
};

function resolveVariant(value: string | undefined): Variant {
  return value === 'acceptance' || value === 'production' ? value : 'internal';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant(process.env.APP_VARIANT);
  const { name, id, scheme } = VARIANTS[variant];

  return {
    ...config,
    name,
    slug: 'vaneijck-berger-app',
    version: '2.0.0',
    orientation: 'portrait',
    // One sharp source for every variant. A per-APP_VARIANT icon waits until there are
    // square 1024 sources for internal (red) and acceptance (orange).
    icon: './assets/ios/1024.png',
    scheme,
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: id,
      supportsTablet: false,
      // Gitignored; copy from legacy/ios for local builds (docs/decisions/0009).
      googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        UIBackgroundModes: ['remote-notification'],
      },
      entitlements: {
        'aps-environment': variant === 'production' ? 'production' : 'development',
      },
    },
    android: {
      package: id,
      // Gitignored; copy from legacy/android for local builds (docs/decisions/0009).
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        backgroundColor: '#FEC900',
        foregroundImage: './assets/ios/1024.png',
      },
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-sqlite',
      '@react-native-community/datetimepicker',
      [
        'expo-camera',
        {
          cameraPermission:
            'Van Eijck Berger gebruikt de camera om foto’s van auto`s te maken en trucks te scannen.',
          // Photos and QR scanning do not need a microphone prompt or Info.plist key.
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      [
        'expo-image-picker',
        {
          // Used as a simulator fallback when the device has no camera
          // (`PhotoCamera` opens the library when `Device.isDevice` is false).
          photosPermission:
            'Van Eijck Berger gebruikt je fotobibliotheek om een testfoto te kiezen op de simulator.',
        },
      ],
      [
        'expo-location',
        {
          // Foreground, point-in-time reads only, for the 500 m accept check
          // (services/domain/target-location.ts) — no background mode, no Android foreground service.
          locationWhenInUsePermission:
            'Van Eijck Berger gebruikt je locatie om te checken of je bij de dienst in de buurt bent.',
        },
      ],
      // Registers the native URL scheme for the Azure AD sign-in redirect (docs/decisions/0012).
      ['react-native-app-auth', { redirectUrls: [AZURE_AD_REDIRECT_URL] }],
      // Xcode 27 builds crash on iOS 27 unless the app adopts the UIScene life cycle, which SDK 57
      // only does on request. SDK 58 has it in the template: remove this then (docs/decisions/0011).
      // Must run AFTER react-native-app-auth: its own AppDelegate patch only recognizes the
      // pristine template class line, and each plugin's mod runs in the opposite of this array's
      // order (verified empirically against expo-build-properties@57.0.21 / SDK 57.0.24).
      // Notifee's AAR is not on Maven Central; Gradle must see the local libs folder
      // (path relative to android/build.gradle).
      [
        'expo-build-properties',
        {
          ios: {
            enableSceneSupport: true,
            // Required by React Native Firebase / FirebaseCoreInternal (Swift pods).
            useFrameworks: 'static',
          },
          android: {
            extraMavenRepos: ['../../node_modules/@notifee/react-native/android/libs'],
          },
        },
      ],
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      [
        'expo-splash-screen',
        {
          // Native splash is brand yellow only. Photo + overlays live in SplashScreenView.
          // Android 12's splash theme always references @drawable/splashscreen_logo. Without
          // a file, resource linking fails. This drawable is the same yellow, so no logo shows.
          backgroundColor: '#FEC900',
          android: {
            drawable: {
              icon: './assets/android/splashscreen_logo.xml',
            },
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      variant,
      // Linked by `eas init`. Not a secret. Kept for EAS project linkage; push uses FCM tokens.
      // EXPO_PUBLIC_EAS_PROJECT_ID can override locally; EAS Build uses this value when unset.
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? 'ddbab1b3-aa0d-445e-b003-8943841f8b5',
      },
    },
  };
};
