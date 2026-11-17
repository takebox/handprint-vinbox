import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SecretsService } from "#/api/secrets-service";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { I18nKey } from "#/i18n/declaration";
import i18n from "#/i18n";
import { useCreateSecret } from "#/hooks/mutation/use-create-secret";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { retrieveAxiosErrorMessage } from "#/utils/retrieve-axios-error-message";

const HANDPRINT_URL_SECRET_NAME = "HANDPRINT_URL";

/**
 * Provides an operation that ensures the active backend has an HANDPRINT_URL
 * secret without overwriting an existing value.
 */
export function useResponderUrlSecret() {
  const activeBackend = useActiveBackend();
  const queryClient = useQueryClient();
  const { mutateAsync: createSecret } = useCreateSecret();

  return useCallback(async (): Promise<boolean> => {
    let secrets;
    try {
      secrets = await queryClient.fetchQuery({
        queryKey: ["secrets", activeBackend.backend.id, activeBackend.orgId],
        queryFn: SecretsService.getSecretsOrThrow,
        staleTime: 0,
        retry: false,
        meta: { disableToast: true },
      });
    } catch (error) {
      const message = retrieveAxiosErrorMessage(error);
      displayErrorToast(message || i18n.t(I18nKey.ERROR$GENERIC));
      return false;
    }

    if (secrets.some((secret) => secret.name === HANDPRINT_URL_SECRET_NAME)) {
      return true;
    }

    try {
      await createSecret({
        name: HANDPRINT_URL_SECRET_NAME,
        value: window.location.origin,
      });
    } catch {
      // The shared mutation cache displays the error toast.
      return false;
    }

    await queryClient.invalidateQueries({ queryKey: ["secrets"] });
    return true;
  }, [
    activeBackend.backend.id,
    activeBackend.orgId,
    createSecret,
    queryClient,
  ]);
}
