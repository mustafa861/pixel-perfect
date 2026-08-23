/**
 * Sandboxed Python execution.
 * Runs in a Web Worker with Pyodide (WASM). Spec sandbox rules:
 * 5s timeout, no network access from user code, no host filesystem.
 * The worker is terminated when the timeout elapses.
 */

export type RunResult = {
  stdout: string;
  stderr: string;
  success: boolean;
  errorType: string | null;
  timedOut: boolean;
};

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

const WORKER_SOURCE = `
let pyodideReady = null;

async function boot() {
  if (!pyodideReady) {
    importScripts("${PYODIDE_CDN}pyodide.js");
    pyodideReady = loadPyodide({ indexURL: "${PYODIDE_CDN}" });
  }
  return pyodideReady;
}

self.onmessage = async (event) => {
  const code = event.data.code;
  let out = "";
  let err = "";
  try {
    const pyodide = await boot();
    pyodide.setStdout({ batched: (s) => { out += s + "\\n"; } });
    pyodide.setStderr({ batched: (s) => { err += s + "\\n"; } });
    await pyodide.runPythonAsync(code);
    self.postMessage({ stdout: out, stderr: err, success: true, errorType: null });
  } catch (e) {
    const message = String(e && e.message ? e.message : e);
    const match = message.match(/([A-Za-z_]*Error|KeyboardInterrupt)(?=:)/g);
    self.postMessage({
      stdout: out,
      stderr: err + message,
      success: false,
      errorType: match ? match[match.length - 1] : "Error",
    });
  }
};
`;

const TIMEOUT_MS = 5000;

export async function runPython(code: string): Promise<RunResult> {
  if (typeof window === "undefined") {
    return { stdout: "", stderr: "Unavailable", success: false, errorType: null, timedOut: false };
  }

  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);

  return new Promise<RunResult>((resolve) => {
    const finish = (result: RunResult) => {
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        stdout: "",
        stderr: "TimeoutError: execution exceeded the 5 second sandbox limit.",
        success: false,
        errorType: "TimeoutError",
        timedOut: true,
      });
    }, TIMEOUT_MS + 15000); // extra headroom only for the first Pyodide download

    worker.onmessage = (event) => {
      clearTimeout(timer);
      finish({ ...(event.data as Omit<RunResult, "timedOut">), timedOut: false });
    };

    worker.onerror = (event) => {
      clearTimeout(timer);
      finish({
        stdout: "",
        stderr: event.message || "The Python sandbox failed to start.",
        success: false,
        errorType: "SandboxError",
        timedOut: false,
      });
    };

    worker.postMessage({ code });
  });
}
