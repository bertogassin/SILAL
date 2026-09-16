import { t, type MessageKey } from "./i18n";
import { useSi } from "./store";

export function useT() {
  const locale = useSi((s) => s.locale);
  return (key: MessageKey) => t(locale, key);
}
