/**
 * ViewLoader
 * Handles dynamic fetching and caching of HTML views (partials).
 */

const viewCache = new Map<string, string>();

export class ViewLoader {
    /**
     * Loads a view into a target element.
     * @param {string} viewPath - Path to the .html file (relative to www/views/)
     * @param {HTMLElement|string} target - specific element or ID to inject into
     * @param {boolean} forceRefresh - If true, bypass cache
     */
    static async load(viewPath: string, target: HTMLElement | string, forceRefresh: boolean = false) {
        const targetEl = (typeof target === 'string' ? document.getElementById(target) : target) as HTMLElement | null;
        if (!targetEl) {
            console.error(`[ViewLoader] Target not found for ${viewPath}`);
            return;
        }

        // Return if already loaded (unless forced)
        if (targetEl.dataset.viewLoaded === viewPath && !forceRefresh) {
            return;
        }

        try {
            let html = viewCache.get(viewPath);

            if (!html || forceRefresh) {
                console.log(`[ViewLoader] Fetching ${viewPath}...`);
                const response = await fetch(`/views/${viewPath}`); // Absolute path from root
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                html = await response.text();
                viewCache.set(viewPath, html);
            }

            targetEl.innerHTML = html;
            targetEl.dataset.viewLoaded = viewPath;

            // Execute any scripts found in the injected HTML (security risk in open web, fine for local app)
            // Note: innerHTML does not execute <script> tags automatically.
            // We might need a helper if we move logic into views, but for now logic is in modules.
            
            return true;
        } catch (err: any) {
            console.error(`[ViewLoader] Failed to load ${viewPath}:`, err);
            targetEl.innerHTML = `<div class="p-4 text-red-500">Error loading view: ${err.message}</div>`;
            return false;
        }
    }
}
