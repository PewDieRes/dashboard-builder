const TEXT_ENTRY_SELECTOR = 'input, select, textarea, [contenteditable="true"]';
const DELETE_KEYS = new Set(['Delete', 'Backspace']);

export class KeyboardShortcuts {
    #layoutStore;
    #isEnabled;

    constructor(layoutStore, { isEnabled = () => true } = {}) {
        this.#layoutStore = layoutStore;
        this.#isEnabled = isEnabled;
        document.addEventListener('keydown', event => this.#handleKeydown(event));
    }

    #handleKeydown(event) {
        if (!this.#isEnabled() || event.target.closest('dialog')) {
            return;
        }
        if (event.key === 'Escape') {
            this.#clearSelection(event.target);
        } else if (DELETE_KEYS.has(event.key) && !event.target.closest(TEXT_ENTRY_SELECTOR)) {
            event.preventDefault();
            this.#deleteSelection();
        }
    }

    #clearSelection(focusedNode) {
        if (focusedNode.closest(TEXT_ENTRY_SELECTOR)) {
            focusedNode.blur();
        }
        this.#layoutStore.select(null);
    }

    #deleteSelection() {
        const { sectionClientId, elementClientId } = this.#layoutStore.getSelection();
        if (elementClientId !== null) {
            this.#layoutStore.removeElement(sectionClientId, elementClientId);
        } else if (sectionClientId !== null) {
            this.#layoutStore.removeSection(sectionClientId);
        }
    }
}
