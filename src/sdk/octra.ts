import {
  OctraSDK,
  OctraError,
} from '@octwa/sdk';
import type {
  Connection,
  Capability,
  CapabilityRequest,
  InvocationRequest,
  InvocationResult,
} from '@octwa/sdk';

// Singleton SDK instance
let sdkInstance: OctraSDK | null = null;

export async function initSDK(): Promise<OctraSDK> {
  if (!sdkInstance) {
    sdkInstance = await OctraSDK.init({
      timeout: 5000,
      skipSignatureVerification: false,
    });
  }
  return sdkInstance;
}

export function getSDK(): OctraSDK | null {
  return sdkInstance;
}

export function isInstalled(): boolean {
  return sdkInstance?.isInstalled() ?? false;
}

export async function connect(circle: string): Promise<Connection> {
  const sdk = await initSDK();
  return sdk.connect({
    circle,
    appOrigin: window.location.origin,
  });
}

export async function disconnect(): Promise<void> {
  const sdk = getSDK();
  if (sdk) {
    await sdk.disconnect();
  }
}

export async function requestCapability(
  request: Omit<CapabilityRequest, 'circle'> & { circle?: string }
): Promise<Capability> {
  const sdk = getSDK();
  if (!sdk) {
    throw new OctraError('NOT_CONNECTED', 'SDK not initialized');
  }

  const state = sdk.getSessionState();
  const circle = request.circle ?? state.circle;

  if (!circle) {
    throw new OctraError('NOT_CONNECTED', 'No circle connected');
  }

  return sdk.requestCapability({
    ...request,
    circle,
  });
}

export async function invoke(request: InvocationRequest): Promise<InvocationResult> {
  const sdk = getSDK();
  if (!sdk) {
    throw new OctraError('NOT_CONNECTED', 'SDK not initialized');
  }
  return sdk.invoke(request);
}

// Helper to parse invoke result data
export function parseInvokeData<T>(data: unknown): T {
  if (data instanceof Uint8Array) {
    return JSON.parse(new TextDecoder().decode(data));
  }

  if (typeof data === 'object' && data !== null) {
    // Check if already parsed
    if (!('0' in data)) {
      return data as T;
    }

    // Object with numeric keys (serialized Uint8Array)
    const obj = data as Record<string, number>;
    const keys = Object.keys(obj).filter((k) => !isNaN(Number(k)));
    const length = keys.length;
    if (length > 0) {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        bytes[i] = obj[i.toString()];
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    }
  }

  throw new Error('Invalid data format');
}

export { OctraError };
