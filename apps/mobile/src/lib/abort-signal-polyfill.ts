const abortSignalCtor = globalThis.AbortSignal as
  | (typeof AbortSignal & {
      timeout?: (milliseconds: number) => AbortSignal;
    })
  | undefined;

if (abortSignalCtor && typeof abortSignalCtor.timeout !== "function") {
  abortSignalCtor.timeout = (milliseconds: number) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      const error = new Error("The operation timed out.");
      error.name = "TimeoutError";
      controller.abort(error);
    }, milliseconds);

    controller.signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
      },
      { once: true },
    );

    return controller.signal;
  };
}

const abortSignalPrototype = abortSignalCtor?.prototype as
  | (AbortSignal & {
      throwIfAborted?: () => void;
      reason?: unknown;
    })
  | undefined;

if (abortSignalPrototype && typeof abortSignalPrototype.throwIfAborted !== "function") {
  abortSignalPrototype.throwIfAborted = function throwIfAborted() {
    if (this.aborted) {
      throw this.reason instanceof Error ? this.reason : new Error("The operation was aborted.");
    }
  };
}
