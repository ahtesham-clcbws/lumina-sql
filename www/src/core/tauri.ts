/**
 * Core Tauri API Wrapper
 * Handles communication with the Rust backend.
 */

declare global {
    interface Window {
        __TAURI__?: {
            core: {
                invoke: <T>(cmd: string, args?: any) => Promise<T>;
            };
        };
    }
}

let invokeFn = (cmd: string, args: any) => { console.error("Tauri API not initialized", cmd, args); return Promise.reject("Tauri API not initialized"); };

if (window.__TAURI__) {
    invokeFn = window.__TAURI__.core.invoke;
    console.log("Tauri API detected and bound.");
} else {
    console.warn("Tauri API not found in window object. Running in browser mode?");
}

/**
 * Invokes a Tauri command.
 * @param {string} cmd The command name.
 * @param {object} args The arguments object.
 * @returns {Promise<T>}
 */
export async function invoke<T = any>(cmd: string, args: Record<string, any> = {}): Promise<T> {
    try {
        return await invokeFn(cmd, args);
    } catch (e) {
        console.error(`Command '${cmd}' failed:`, e);
        throw e;
    }
}
