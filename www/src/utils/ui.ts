// Minimal UI Utils 
export function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    // Placeholder replacement for legacy showToast
    // In a real app we'd use Sonner or React Hot Toast
    console.log(`[Toast ${type}] ${message}`);
    // Fallback native alert for critical errors
    if (type === 'error') alert(message);
}
