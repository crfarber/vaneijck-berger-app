import {
  getDisplayMode,
  isDisabled,
  isTapSource,
  shouldNavigateOnTap,
  shouldShowForegroundBanner,
} from './plan';
import type { NotificationSource, ParsedNotification } from './types';

/** What to do with one message that has already been parsed. */
export type IncomingDecision = {
  /** Run the cache effects. A repeat is skipped, unless the user tapped it. */
  process: boolean;
  /** Show a banner. Only in the foreground, and only for tokens that ask for one. */
  showBanner: boolean;
  /** Open the allocations overview. Only after a tap, and only for tokens that navigate. */
  navigate: boolean;
};

export function decideIncoming(input: {
  notification: ParsedNotification;
  source: NotificationSource;
  /** The same id was already handled through another channel. */
  duplicate: boolean;
}): IncomingDecision {
  const mode = getDisplayMode(input.notification.token);
  if (isDisabled(mode)) {
    return { process: false, showBanner: false, navigate: false };
  }

  const tap = isTapSource(input.source);
  // A tap still counts when the message was already handled in the background: that is how the
  // user opens it. Any other repeat is ignored.
  if (input.duplicate && !tap) {
    return { process: false, showBanner: false, navigate: false };
  }

  return {
    process: true,
    showBanner: input.source === 'foreground' && shouldShowForegroundBanner(mode),
    navigate: tap && shouldNavigateOnTap(mode),
  };
}
