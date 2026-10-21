import { createNode } from '../dom/createNode.js';
import { SectionView } from './SectionView.js';

export class DashboardCanvas {
    #rootNode;
    #layoutStore;
    #sectionView;
    #dragResizeController;
    #destroyCallbacks = [];
    #sectionNodes = new Map();
    #gridNode = null;

    constructor(rootNode, { layoutStore, rendererRegistry, dragResizeController, apiClient, notifier }) {
        this.#rootNode = rootNode;
        this.#layoutStore = layoutStore;
        this.#dragResizeController = dragResizeController;
        this.#sectionView = new SectionView({ layoutStore, rendererRegistry, dragResizeController, apiClient, notifier });
        layoutStore.addEventListener('change', event => this.#handleChange(event.detail.reason));
        this.#rootNode.addEventListener('pointerdown', event => this.#clearSelectionOnBackgroundPress(event));
        this.#renderAll();
    }

    #handleChange(reason) {
        if (reason === 'load' || reason === 'structure') {
            this.#renderAll();
        } else if (reason === 'selection') {
            this.#applySelection();
        } else if (reason === 'geometry') {
            this.#refreshSectionPlacements();
        }
    }

    #renderAll() {
        this.#destroyCallbacks.forEach(destroy => destroy());
        this.#destroyCallbacks = [];
        this.#sectionNodes.clear();

        this.#gridNode = createNode('div', { className: 'dashboard-grid' });
        for (const section of this.#layoutStore.getSections()) {
            const { node, destroy } = this.#sectionView.render(section, this.#gridNode);
            this.#gridNode.append(node);
            this.#sectionNodes.set(section.clientId, node);
            this.#destroyCallbacks.push(destroy);
        }
        this.#rootNode.replaceChildren(this.#gridNode, ...this.#createEmptyStateNodes());
        this.#applySelection();
    }

    #createEmptyStateNodes() {
        if (this.#sectionNodes.size > 0) {
            return [];
        }
        return [createNode('p', { className: 'canvas-empty-state', text: 'No sections yet. Use "Add section" to start building.' })];
    }

    #applySelection() {
        const { sectionClientId, elementClientId } = this.#layoutStore.getSelection();
        for (const sectionNode of this.#rootNode.querySelectorAll('[data-section-id]')) {
            sectionNode.classList.toggle('is-selected', sectionNode.dataset.sectionId === sectionClientId);
        }
        for (const frameNode of this.#rootNode.querySelectorAll('[data-element-id]')) {
            frameNode.classList.toggle('is-selected', frameNode.dataset.elementId === elementClientId);
        }
    }

    #refreshSectionPlacements() {
        for (const section of this.#layoutStore.getSections()) {
            this.#sectionView.applyPlacement(this.#sectionNodes.get(section.clientId), section);
        }
    }

    #clearSelectionOnBackgroundPress(event) {
        if (event.target === this.#rootNode || event.target === this.#gridNode) {
            this.#layoutStore.select(null);
        }
    }
}
