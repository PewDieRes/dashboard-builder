import { createNode } from '../dom/createNode.js';
import { describeElement } from '../elements/describeElement.js';
import { createIcon, ELEMENT_ICON_NAMES } from './icons.js';

const REBUILD_REASONS = new Set(['load', 'structure', 'content', 'element-content']);
const UNTITLED_SECTION_LABEL = 'Untitled section';

export class LayersPanel {
    #rootNode;
    #layoutStore;

    constructor(rootNode, layoutStore) {
        this.#rootNode = rootNode;
        this.#layoutStore = layoutStore;
        layoutStore.addEventListener('change', event => this.#handleChange(event.detail.reason));
        this.#rebuild();
    }

    #handleChange(reason) {
        if (REBUILD_REASONS.has(reason)) {
            this.#rebuild();
        } else if (reason === 'selection') {
            this.#applySelection();
        }
    }

    #rebuild() {
        const sections = this.#layoutStore.getSections();
        if (sections.length === 0) {
            this.#rootNode.replaceChildren(createNode('p', { className: 'panel-hint', text: 'No sections yet.' }));
            return;
        }
        const treeNode = createNode('div', { className: 'layer-tree', attributes: { role: 'tree' } });
        treeNode.append(...sections.map(section => this.#createSectionGroup(section)));
        this.#rootNode.replaceChildren(treeNode);
        this.#applySelection();
    }

    #createSectionGroup(section) {
        const rowNode = this.#createRow({
            iconName: 'section',
            label: section.title.trim() || UNTITLED_SECTION_LABEL,
            sectionClientId: section.clientId,
            elementClientId: null,
            depthClassName: 'layer-row-section',
        });
        const elementRowNodes = section.elements.map(element => this.#createRow({
            iconName: ELEMENT_ICON_NAMES[element.elementType],
            label: describeElement(element),
            sectionClientId: section.clientId,
            elementClientId: element.clientId,
            depthClassName: 'layer-row-element',
        }));
        return createNode('div', { className: 'layer-group', attributes: { role: 'group' } }, [
            rowNode,
            ...elementRowNodes,
        ]);
    }

    #createRow({ iconName, label, sectionClientId, elementClientId, depthClassName }) {
        const rowNode = createNode('button', {
            className: `layer-row ${depthClassName}`,
            attributes: { type: 'button', role: 'treeitem' },
        }, [createIcon(iconName), createNode('span', { className: 'layer-label', text: label })]);
        rowNode.dataset.layerSectionId = sectionClientId;
        rowNode.dataset.layerElementId = elementClientId ?? '';
        rowNode.addEventListener('click', () => this.#layoutStore.select(sectionClientId, elementClientId));
        return rowNode;
    }

    #applySelection() {
        const { sectionClientId, elementClientId } = this.#layoutStore.getSelection();
        for (const rowNode of this.#rootNode.querySelectorAll('.layer-row')) {
            const isSelected = rowNode.dataset.layerSectionId === sectionClientId
                && rowNode.dataset.layerElementId === (elementClientId ?? '');
            rowNode.classList.toggle('is-selected', isSelected);
            rowNode.setAttribute('aria-selected', String(isSelected));
        }
    }
}
