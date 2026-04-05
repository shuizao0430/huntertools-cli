import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createChromeMock() {
  let onEventListener: ((source: { tabId?: number }, method: string, params?: unknown) => void) | null = null;
  const tabs = {
    get: vi.fn(async (_tabId: number) => ({
      id: 1,
      windowId: 1,
      url: 'https://x.com/home',
    })),
    onRemoved: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() },
  };

  const debuggerApi = {
    attach: vi.fn(async () => {}),
    detach: vi.fn(async () => {}),
    sendCommand: vi.fn(async (_target: unknown, method: string) => {
      if (method === 'Runtime.evaluate') return { result: { value: 'ok' } };
      if (method === 'Network.getResponseBody') return { body: '{"elements":[{"hitInfo":{"memberId":"abc123"}}]}', base64Encoded: false };
      return {};
    }),
    onDetach: { addListener: vi.fn() },
    onEvent: {
      addListener: vi.fn((fn: typeof onEventListener) => {
        onEventListener = fn;
      }),
    },
  };

  const scripting = {
    executeScript: vi.fn(async () => [{ result: { removed: 1 } }]),
  };

  return {
    chrome: {
      tabs,
      debugger: debuggerApi,
      scripting,
      runtime: { id: 'opencli-test' },
    },
    debuggerApi,
    scripting,
    emitDebuggerEvent: (method: string, params: unknown) => {
      onEventListener?.({ tabId: 1 }, method, params);
    },
  };
}

describe('cdp attach recovery', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not mutate the DOM before a successful attach', async () => {
    const { chrome, debuggerApi, scripting } = createChromeMock();
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./cdp');
    const result = await mod.evaluate(1, '1');

    expect(result).toBe('ok');
    expect(debuggerApi.attach).toHaveBeenCalledTimes(1);
    expect(scripting.executeScript).not.toHaveBeenCalled();
  });

  it('retries attach when a foreign extension temporarily blocks the debugger', async () => {
    const { chrome, debuggerApi, scripting } = createChromeMock();
    debuggerApi.attach
      .mockRejectedValueOnce(new Error('Cannot access a chrome-extension:// URL of different extension'))
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./cdp');
    const result = await mod.evaluate(1, '1');

    expect(result).toBe('ok');
    expect(scripting.executeScript).not.toHaveBeenCalled();
    expect(debuggerApi.attach).toHaveBeenCalledTimes(2);
  });

  it('captures matching network responses and returns bodies', async () => {
    const { chrome, emitDebuggerEvent } = createChromeMock();
    vi.stubGlobal('chrome', chrome);

    const mod = await import('./cdp');
    mod.registerListeners();
    await mod.__test__.startNetworkCapture(1, ['talentRecruiterSearchHits']);

    emitDebuggerEvent('Network.requestWillBeSent', {
      requestId: 'req-1',
      request: {
        url: 'https://www.linkedin.com/talent/search/api/talentRecruiterSearchHits',
        method: 'GET',
      },
      type: 'Fetch',
    });
    emitDebuggerEvent('Network.responseReceived', {
      requestId: 'req-1',
      type: 'Fetch',
      response: {
        url: 'https://www.linkedin.com/talent/search/api/talentRecruiterSearchHits',
        status: 200,
        mimeType: 'application/json',
      },
    });
    emitDebuggerEvent('Network.loadingFinished', {
      requestId: 'req-1',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mod.__test__.getCapturedNetwork(1)).toEqual([
      expect.objectContaining({
        requestId: 'req-1',
        status: 200,
        mimeType: 'application/json',
        body: '{"elements":[{"hitInfo":{"memberId":"abc123"}}]}',
      }),
    ]);
  });
});
