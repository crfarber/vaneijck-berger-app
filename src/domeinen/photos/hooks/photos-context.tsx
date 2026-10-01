import { createContext, useContext, type ReactNode } from 'react';
import type { PhotoService } from '../index';

const PhotosContext = createContext<PhotoService | null>(null);

export function PhotosProvider({ value, children }: { value: PhotoService; children: ReactNode }) {
  return <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>;
}

export function usePhotoService(): PhotoService {
  const value = useContext(PhotosContext);
  if (value === null) {
    throw new Error('PhotosProvider is missing');
  }
  return value;
}
