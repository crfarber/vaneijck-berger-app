/** The React Native side of the location domain. Only routes and bootstrap import this file. */
export { createExpoLocationReader } from './platform/rn/expo-location-reader';
export { LocationProvider, useLocationClock, useLocationReader } from './hooks/location-context';
export type { LocationContextValue } from './hooks/location-context';
export { LocationStatusButton } from './components/location-status-button';
