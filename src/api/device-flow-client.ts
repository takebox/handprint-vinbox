import {
  pollForToken as sdkPollForToken,
  startDeviceFlow as sdkStartDeviceFlow,
} from "@handprint-ai/typescript-client/client/device-flow-client";
import type {
  DeviceAuthorizationResponse,
  DeviceTokenResponse,
  PollDeviceTokenOptions,
} from "@handprint-ai/typescript-client/client/device-flow-client";
import { AGENT_VINBOX_CLIENT_HEADERS } from "./client-source";

export {
  DeviceFlowError,
  isHandprintCloudHost,
} from "@handprint-ai/typescript-client/client/device-flow-client";

export function startDeviceFlow(
  host: string,
): Promise<DeviceAuthorizationResponse> {
  return sdkStartDeviceFlow(host, { headers: AGENT_VINBOX_CLIENT_HEADERS });
}

export function pollForToken(
  host: string,
  deviceCode: string,
  options: PollDeviceTokenOptions,
): Promise<DeviceTokenResponse> {
  return sdkPollForToken(host, deviceCode, {
    ...options,
    headers: AGENT_VINBOX_CLIENT_HEADERS,
  });
}

export type {
  DeviceAuthorizationResponse,
  DeviceTokenResponse,
  PollDeviceTokenOptions as PollOptions,
} from "@handprint-ai/typescript-client/client/device-flow-client";
