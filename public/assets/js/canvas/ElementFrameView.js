import { createNode } from '../dom/createNode.js';
import { applyBoxStyle } from './elementBoxStyle.js';

export class ElementFrameView {
    #layoutStore;
    #rendererRegistry;
    #dragResizeController;
    #apiClient;
    #notifier;

    constructor({ layoutStore, rendererRegistry, dragResizeController, apiClient, notifier }) {
        this.#layoutStore = layoutStore;
        this.#rendererRegistry = rendererRegistry;
        this.#dragResizeController = dragResizeController;
        this.#apiClient = apiClient;
        this.#notifier = notifier;
    }

    /** Returns the frame node and a destroy function that releases renderer and interaction resources. */
    render(sectionClientId, element, sectionBodyNode) {
        const dragHandleNode = createNode('span', {
            className: 'element-drag-handle',
            text: '☰',
            attributes: { title: 'Drag to move', 'aria-label': 'Drag handle' },
        });
        const deleteButtonNode = createNode('button', {
            className: 'element-delete-button',
            text: '×',
            attributes: { type: 'button', title: 'Delete element', 'aria-label': 'Delete element' },
        });
        const contentNode = createNode('div', { className: 'element-content' });
        const frameNode = createNode('div', {
            className: 'element-frame',
            attributes: { 'data-element-id': element.clientId },
        }, [dragHandleNode, deleteButtonNode, contentNode]);

        applyBoxStyle(frameNode, element);
        frameNode.style.zIndex = String(element.zIndex);
        frameNode.addEventListener('pointerdown', () => {
            this.#layoutStore.select(sectionClientId, element.clientId);
        });
        deleteButtonNode.addEventListener('click', () => {
            this.#layoutStore.removeElement(sectionClientId, element.clientId);
        });

        const cleanupRenderer = this.#rendererRegistry.render(contentNode, element, {
            layoutStore: this.#layoutStore,
            apiClient: this.#apiClient,
            notifier: this.#notifier,
            sectionClientId,
            elementClientId: element.clientId,
        });
        this.#dragResizeController.attachElement(frameNode, sectionClientId, element.clientId, sectionBodyNode);

        return {
            node: frameNode,
            destroy: () => {
                cleanupRenderer();
                this.#dragResizeController.detach(frameNode);
            },
        };
    }
}
