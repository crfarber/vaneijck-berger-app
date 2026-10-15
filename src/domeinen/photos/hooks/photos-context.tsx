import { createContext, useContext, type ReactNode } from 'react';
import type { Logger } from '@/shared/logging/logger';
import type { PhotoService } from '../index';

const PhotosContext = createContext<PhotoService | null>(null);
const PhotosLoggerContext = createContext<Logger | undefined>(undefined);

export function PhotosProvider({
  value,
  logger,
  children,
}: {
  value: PhotoService;
  logger?: Logger;
  children: ReactNode;
}) {
  return (
    <PhotosLoggerContext.Provider value={logger}>
      <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>
    </PhotosLoggerContext.Provider>
  );
}

export function usePhotoLogger(): Logger | undefined {
  return useContext(PhotosLoggerContext);
}

export function usePhotoService(): PhotoService {
  const value = useContext(PhotosContext);
  if (value === null) {
    throw new Error('PhotosProvider is missing');
  }
  return value;
}
