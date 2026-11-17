import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { Typography } from "#/ui/typography";

interface TracksEmptyStateProps {
  isError: boolean;
}

export function TracksEmptyState({ isError }: TracksEmptyStateProps) {
  const { t } = useTranslation("handprint");

  return (
    <div className="flex items-center justify-center h-full p-4">
      <Typography.Text className="text-muted">
        {isError
          ? t(I18nKey.COMMON$FETCH_ERROR)
          : t(I18nKey.CONVERSATION$NO_TRACKS)}
      </Typography.Text>
    </div>
  );
}
