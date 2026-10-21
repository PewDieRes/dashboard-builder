import { createIcon } from './icons.js';

const PREVIEW_CLASS_NAME = 'is-preview';
const BLOCKING_REASON = 'preview';
const EDITABLE_TEXT_SELECTOR = '.text-element';
const REAPPLY_REASONS = new Set(['load', 'structure', 'element-content']);

/** Hides the editing chrome and makes the canvas read-only so the dashboard can be reviewed as published. */
export class PreviewMode {
    #buttonNode;
    #layoutStore;
    #canvasNode;
    #interactionGate;
    #isActive = false;

    constructor(buttonNode, { layoutStore, canvasNode, interactionGate }) {
        this.#buttonNode = buttonNode;
        this.#layoutStore = layoutStore;
        this.#canvasNode = canvasNode;
        this.#interactionGate = interactionGate;
        buttonNode.prepend(createIcon('eye'));
        buttonNode.addEventListener('click', () => this.#toggle());
        layoutStore.addEventListener('change', event => this.#handleChange(event.detail.reason));
    }

    isActive() {
        return this.#isActive;
    }

    #toggle() {
        this.#isActive = !this.#isActive;
        if (this.#isActive) {
            document.activeElement?.blur();
            this.#layoutStore.select(null);
        }
        document.body.classList.toggle(PREVIEW_CLASS_NAME, this.#isActive);
        this.#buttonNode.setAttribute('aria-pressed', String(this.#isActive));
        this.#interactionGate.setBlocked(BLOCKING_REASON, this.#isActive);
        this.#applyTextEditability();
    }

    #handleChange(reason) {
        if (this.#isActive && REAPPLY_REASONS.has(reason)) {
            this.#applyTextEditability();
        }
    }

    #applyTextEditability() {
        for (const textNode of this.#canvasNode.querySelectorAll(EDITABLE_TEXT_SELECTOR)) {
            textNode.setAttribute('contenteditable', String(!this.#isActive));
        }
    }
}
