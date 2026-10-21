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
    #workspaceNode;

    constructor(rootNode, { workspaceNode, layoutStore, rendererRegistry, dragResizeController, apiClient, notifier }) {
        this.#rootNode = rootNode;
        this.#workspaceNode = workspaceNode;
        this.#layoutStore = layoutStore;
        this.#dragResizeController = dragResizeController;
        this.#sectionView = new SectionView({ layoutStore, rendererRegistry, dragResizeController, apiClient, notifier });
        layoutStore.addEventListener('change', event => this.#handleChange(event.detail));
        for (const pressableNode of [rootNode, workspaceNode]) {
            pressableNode.addEventListener('pointerdown', event => this.#clearSelectionOnBackgroundPress(event));
        }
        // The first 'load' change replaces this; rendering the empty store would flash "No sections yet".
        this.#rootNode.replaceChildren(createNode('p', { className: 'canvas-empty-state', text: 'Loading dashboard…' }));
    }

    #handleChange({ reason, sectionClientId, elementClientId }) {
        if (reason === 'load' || reason === 'structure') {
            this.#renderAll();
        } else if (reason === 'selection') {
            this.#applySelection();
        } else if (reason === 'geometry') {
            this.#refreshGeometry();
        } else if (reason === 'content') {
            this.#syncSectionTitles();
        } else if (reason === 'element-content') {
            this.#rerenderElement(sectionClientId, elementClientId);
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
        return [createNode('p', { className: 'canvas-empty-state', text: 'No sections yet. Use the Add panel to start building.' })];
    }

    #applySelection() {
        const { sectionClientId, elementClientId } = this.#layoutStore.getSelection();
        for (const sectionNode of this.#rootNode.querySelectorAll('[data-section-id]')) {
            const isSectionSelected = sectionNode.dataset.sectionId === sectionClientId && elementClientId === null;
            sectionNode.classList.toggle('is-selected', isSectionSelected);
        }
        for (const frameNode of this.#rootNode.querySelectorAll('[data-element-id]')) {
            frameNode.classList.toggle('is-selected', frameNode.dataset.elementId === elementClientId);
        }
    }

    #refreshGeometry() {
        for (const section of this.#layoutStore.getSections()) {
            this.#sectionView.refreshGeometry(this.#sectionNodes.get(section.clientId), section);
        }
    }

    #syncSectionTitles() {
        for (const section of this.#layoutStore.getSections()) {
            this.#sectionView.syncTitle(this.#sectionNodes.get(section.clientId), section);
        }
    }

    #rerenderElement(sectionClientId, elementClientId) {
        this.#sectionView.rerenderElement(
            this.#sectionNodes.get(sectionClientId),
            this.#layoutStore.findSection(sectionClientId),
            this.#layoutStore.findElement(sectionClientId, elementClientId),
        );
        this.#applySelection();
    }

    #clearSelectionOnBackgroundPress(event) {
        const backgroundNodes = [this.#rootNode, this.#gridNode, this.#workspaceNode];
        if (backgroundNodes.includes(event.target)) {
            this.#layoutStore.select(null);
        }
    }
}
