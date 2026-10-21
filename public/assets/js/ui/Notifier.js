const TOAST_LIFETIME_MILLISECONDS = 4000;

export class Notifier {
    #rootNode;

    constructor(rootNode) {
        this.#rootNode = rootNode;
        this.#rootNode.setAttribute('aria-live', 'polite');
    }

    success(message) {
        this.#showToast(message, 'success');
    }

    error(message) {
        this.#showToast(message, 'error');
    }

    #showToast(message, variant) {
        const toastNode = document.createElement('div');
        toastNode.className = `toast toast-${variant}`;
        toastNode.textContent = message;
        this.#rootNode.append(toastNode);
        setTimeout(() => toastNode.remove(), TOAST_LIFETIME_MILLISECONDS);
    }
}
