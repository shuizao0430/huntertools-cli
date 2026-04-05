/**
 * CDP execution via chrome.debugger API.
 *
 * chrome.debugger only needs the "debugger" permission — no host_permissions.
 * It can attach to any http/https tab. Avoid chrome:// and chrome-extension://
 * tabs (resolveTabId in background.ts filters them).
 */

const attached = new Set<number>();
type CapturedNetworkEntry = {
  requestId: string;
  url: string;
  method?: string;
  type?: string;
  status?: number;
  mimeType?: string;
  body?: string;
  base64Encoded?: boolean;
  error?: string;
};

type NetworkCaptureState = {
  patterns: string[];
  entries: Map<string, CapturedNetworkEntry>;
};

const networkCaptures = new Map<number, NetworkCaptureState>();

function matchesNetworkPattern(url: string | undefined, patterns: string[]): boolean {
  const needle = String(url ?? '');
  return patterns.some((pattern) => needle.includes(pattern));
}

function getNetworkState(tabId: number): NetworkCaptureState | undefined {
  return networkCaptures.get(tabId);
}

/** Check if a URL can be attached via CDP — only allow http(s) and blank pages. */
function isDebuggableUrl(url?: string): boolean {
  if (!url) return true;  // empty/undefined = tab still loading, allow it
  return url.startsWith('http://') || url.startsWith('https://') || url === 'about:blank' || url.startsWith('data:');
}

export async function ensureAttached(tabId: number, aggressiveRetry: boolean = false): Promise<void> {
  // Verify the tab URL is debuggable before attempting attach
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isDebuggableUrl(tab.url)) {
      // Invalidate cache if previously attached
      attached.delete(tabId);
      throw new Error(`Cannot debug tab ${tabId}: URL is ${tab.url ?? 'unknown'}`);
    }
  } catch (e) {
    // Re-throw our own error, catch only chrome.tabs.get failures
    if (e instanceof Error && e.message.startsWith('Cannot debug tab')) throw e;
    attached.delete(tabId);
    throw new Error(`Tab ${tabId} no longer exists`);
  }

  if (attached.has(tabId)) {
    // Verify the debugger is still actually attached by sending a harmless command
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
        expression: '1', returnByValue: true,
      });
      return; // Still attached and working
    } catch {
      // Stale cache entry — need to re-attach
      attached.delete(tabId);
    }
  }

  // Retry attach up to 3 times — other extensions (1Password, Playwright MCP Bridge)
  // can temporarily interfere with chrome.debugger. A short delay usually resolves it.
  // Normal commands: 2 retries, 500ms delay (fast fail for non-operate use)
  // Operate commands: 5 retries, 1500ms delay (aggressive, tolerates extension interference)
  const MAX_ATTACH_RETRIES = aggressiveRetry ? 5 : 2;
  const RETRY_DELAY_MS = aggressiveRetry ? 1500 : 500;
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_ATTACH_RETRIES; attempt++) {
    try {
      // Force detach first to clear any stale state from other extensions
      try { await chrome.debugger.detach({ tabId }); } catch { /* ignore */ }
      await chrome.debugger.attach({ tabId }, '1.3');
      lastError = '';
      break; // Success
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
      if (attempt < MAX_ATTACH_RETRIES) {
        console.warn(`[opencli] attach attempt ${attempt}/${MAX_ATTACH_RETRIES} failed: ${lastError}, retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        // Re-verify tab URL before retrying (it may have changed)
        try {
          const tab = await chrome.tabs.get(tabId);
          if (!isDebuggableUrl(tab.url)) {
            lastError = `Tab URL changed to ${tab.url} during retry`;
            break; // Don't retry if URL became un-debuggable
          }
        } catch {
          lastError = `Tab ${tabId} no longer exists`;
          break;
        }
      }
    }
  }

  if (lastError) {
    const hint = lastError.includes('chrome-extension://')
      ? '. Tip: another Chrome extension may be interfering — try disabling other extensions'
      : '';
    throw new Error(`attach failed: ${lastError}${hint}`);
  }
  attached.add(tabId);

  try {
    await chrome.debugger.sendCommand({ tabId }, 'Runtime.enable');
  } catch {
    // Some pages may not need explicit enable
  }
}

export async function evaluate(tabId: number, expression: string, aggressiveRetry: boolean = false): Promise<unknown> {
  // Retry the entire evaluate (attach + command).
  // Normal: 2 retries. Operate: 3 retries (tolerates extension interference).
  const MAX_EVAL_RETRIES = aggressiveRetry ? 3 : 2;
  for (let attempt = 1; attempt <= MAX_EVAL_RETRIES; attempt++) {
    try {
      await ensureAttached(tabId, aggressiveRetry);

      const result = await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      }) as {
        result?: { type: string; value?: unknown; description?: string; subtype?: string };
        exceptionDetails?: { exception?: { description?: string }; text?: string };
      };

      if (result.exceptionDetails) {
        const errMsg = result.exceptionDetails.exception?.description
          || result.exceptionDetails.text
          || 'Eval error';
        throw new Error(errMsg);
      }

      return result.result?.value;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Only retry on attach/debugger errors, not on JS eval errors
      const isAttachError = msg.includes('attach failed') || msg.includes('Debugger is not attached')
        || msg.includes('chrome-extension://') || msg.includes('Target closed');
      if (isAttachError && attempt < MAX_EVAL_RETRIES) {
        attached.delete(tabId); // Force re-attach on next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw e;
    }
  }
  throw new Error('evaluate: max retries exhausted');
}

export const evaluateAsync = evaluate;

/**
 * Capture a screenshot via CDP Page.captureScreenshot.
 * Returns base64-encoded image data.
 */
export async function screenshot(
  tabId: number,
  options: { format?: 'png' | 'jpeg'; quality?: number; fullPage?: boolean } = {},
): Promise<string> {
  await ensureAttached(tabId);

  const format = options.format ?? 'png';

  // For full-page screenshots, get the full page dimensions first
  if (options.fullPage) {
    // Get full page metrics
    const metrics = await chrome.debugger.sendCommand({ tabId }, 'Page.getLayoutMetrics') as {
      contentSize?: { width: number; height: number };
      cssContentSize?: { width: number; height: number };
    };
    const size = metrics.cssContentSize || metrics.contentSize;
    if (size) {
      // Set device metrics to full page size
      await chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', {
        mobile: false,
        width: Math.ceil(size.width),
        height: Math.ceil(size.height),
        deviceScaleFactor: 1,
      });
    }
  }

  try {
    const params: Record<string, unknown> = { format };
    if (format === 'jpeg' && options.quality !== undefined) {
      params.quality = Math.max(0, Math.min(100, options.quality));
    }

    const result = await chrome.debugger.sendCommand({ tabId }, 'Page.captureScreenshot', params) as {
      data: string; // base64-encoded
    };

    return result.data;
  } finally {
    // Reset device metrics if we changed them for full-page
    if (options.fullPage) {
      await chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride').catch(() => {});
    }
  }
}

/**
 * Set local file paths on a file input element via CDP DOM.setFileInputFiles.
 * This bypasses the need to send large base64 payloads through the message channel —
 * Chrome reads the files directly from the local filesystem.
 *
 * @param tabId - Target tab ID
 * @param files - Array of absolute local file paths
 * @param selector - CSS selector to find the file input (optional, defaults to first file input)
 */
export async function setFileInputFiles(
  tabId: number,
  files: string[],
  selector?: string,
): Promise<void> {
  await ensureAttached(tabId);

  // Enable DOM domain (required for DOM.querySelector and DOM.setFileInputFiles)
  await chrome.debugger.sendCommand({ tabId }, 'DOM.enable');

  // Get the document root
  const doc = await chrome.debugger.sendCommand({ tabId }, 'DOM.getDocument') as {
    root: { nodeId: number };
  };

  // Find the file input element
  const query = selector || 'input[type="file"]';
  const result = await chrome.debugger.sendCommand({ tabId }, 'DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: query,
  }) as { nodeId: number };

  if (!result.nodeId) {
    throw new Error(`No element found matching selector: ${query}`);
  }

  // Set files directly via CDP — Chrome reads from local filesystem
  await chrome.debugger.sendCommand({ tabId }, 'DOM.setFileInputFiles', {
    files,
    nodeId: result.nodeId,
  });
}

export async function detach(tabId: number): Promise<void> {
  if (!attached.has(tabId)) return;
  attached.delete(tabId);
  networkCaptures.delete(tabId);
  try { await chrome.debugger.detach({ tabId }); } catch { /* ignore */ }
}

export async function startNetworkCapture(tabId: number, patterns: string[]): Promise<void> {
  await ensureAttached(tabId);
  await chrome.debugger.sendCommand({ tabId }, 'Network.enable');
  networkCaptures.set(tabId, {
    patterns: patterns.filter(Boolean),
    entries: new Map(),
  });
}

export function getCapturedNetwork(
  tabId: number,
  options: { clear?: boolean } = {},
): CapturedNetworkEntry[] {
  const state = getNetworkState(tabId);
  if (!state) return [];
  const entries = [...state.entries.values()];
  if (options.clear) state.entries.clear();
  return entries;
}

async function handleNetworkEvent(
  source: chrome.debugger.Debuggee,
  method: string,
  params?: Record<string, unknown>,
): Promise<void> {
  const tabId = source.tabId;
  if (!tabId) return;
  const state = getNetworkState(tabId);
  if (!state) return;

  if (method === 'Network.requestWillBeSent') {
    const requestId = String(params?.requestId ?? '');
    const request = params?.request as { url?: string; method?: string } | undefined;
    if (!requestId || !matchesNetworkPattern(request?.url, state.patterns)) return;
    state.entries.set(requestId, {
      requestId,
      url: request?.url ?? '',
      method: request?.method,
      type: typeof params?.type === 'string' ? params.type : undefined,
    });
    return;
  }

  if (method === 'Network.responseReceived') {
    const requestId = String(params?.requestId ?? '');
    const response = params?.response as { url?: string; status?: number; mimeType?: string } | undefined;
    const existing = state.entries.get(requestId);
    if (!existing) {
      if (!matchesNetworkPattern(response?.url, state.patterns)) return;
      state.entries.set(requestId, {
        requestId,
        url: response?.url ?? '',
        status: response?.status,
        mimeType: response?.mimeType,
        type: typeof params?.type === 'string' ? params.type : undefined,
      });
      return;
    }
    existing.url = response?.url ?? existing.url;
    existing.status = response?.status ?? existing.status;
    existing.mimeType = response?.mimeType ?? existing.mimeType;
    existing.type = typeof params?.type === 'string' ? params.type : existing.type;
    return;
  }

  if (method === 'Network.loadingFinished') {
    const requestId = String(params?.requestId ?? '');
    const existing = state.entries.get(requestId);
    if (!existing || existing.body !== undefined || existing.error) return;
    try {
      const bodyResult = await chrome.debugger.sendCommand({ tabId }, 'Network.getResponseBody', {
        requestId,
      }) as { body?: string; base64Encoded?: boolean };
      existing.body = bodyResult.body ?? '';
      existing.base64Encoded = !!bodyResult.base64Encoded;
    } catch (error) {
      existing.error = error instanceof Error ? error.message : String(error);
    }
  }
}

export function registerListeners(): void {
  chrome.tabs.onRemoved.addListener((tabId) => {
    attached.delete(tabId);
    networkCaptures.delete(tabId);
  });
  chrome.debugger.onDetach.addListener((source) => {
    if (source.tabId) {
      attached.delete(source.tabId);
      networkCaptures.delete(source.tabId);
    }
  });
  chrome.debugger.onEvent.addListener((source, method, params) => {
    void handleNetworkEvent(source, method, params as Record<string, unknown> | undefined);
  });
  // Invalidate attached cache when tab URL changes to non-debuggable
  chrome.tabs.onUpdated.addListener(async (tabId, info) => {
    if (info.url && !isDebuggableUrl(info.url)) {
      await detach(tabId);
    }
  });
}

export const __test__ = {
  startNetworkCapture,
  getCapturedNetwork,
  handleNetworkEvent,
};
