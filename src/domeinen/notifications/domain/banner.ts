import type { ParsedNotification } from './types';

/** Marks a banner this app scheduled itself, so receiving it does not schedule another one. */
export const LOCAL_BANNER_KEY = '__localBanner';

export function isLocalBanner(data: Readonly<Record<string, unknown>> | null | undefined): boolean {
  return data?.[LOCAL_BANNER_KEY] === true;
}

/**
 * The title and body to show. The old app substituted a fixed sentence when the payload had
 * neither; the sentence itself comes from i18n, passed in here.
 */
export function bannerText(
  notification: Pick<ParsedNotification, 'title' | 'body'>,
  fallback: { title: string; body: string },
): { title: string; body: string } {
  const title = notification.title.trim();
  const body = notification.body.trim();
  return {
    title: title === '' ? fallback.title : title,
    body: body === '' ? fallback.body : body,
  };
}
