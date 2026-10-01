export { supportLogText } from './domain/export';
export type { LogShare } from './service/log-share';

export type SupportLog = {
  text(): string;
  share(): Promise<void>;
};
