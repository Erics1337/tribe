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
