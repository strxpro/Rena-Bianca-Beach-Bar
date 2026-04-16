"use client";

import { useI18n } from "@/i18n/I18nProvider";
import type { TranslationKeys } from "@/i18n/translations";

export function T({ k, ...props }: { k: keyof TranslationKeys } & React.HTMLAttributes<HTMLSpanElement>) {
  const { t } = useI18n();
  return <span {...props}>{t(k)}</span>;
}
