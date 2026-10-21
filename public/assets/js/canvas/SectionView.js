import { createNode } from '../dom/createNode.js';
import { SECTION_LABEL } from '../elements/elementTypeLabels.js';
import { ElementFrameView } from './ElementFrameView.js';
import { createSelectionHandleNodes } from './selectionHandles.js';

export class SectionView {
    #layoutStore;
    #dragResizeController;
    #elementFrameView;
    #frameHandlesBySection = new Map();

    constructor(dependencies) {
        this.#layoutStore = dependencies.layoutStore;
        this.#dragResizeController = dependencies.dragResizeController;
        this.#elementFrameView = new ElementFrameView(dependencies);
    }

    /** Returns the section node and a destroy function that releases every nested view. */
    render(section, gridNode) {
        const titleInputNode = createNode('input', {
            className: 'section-title-input',
            attributes: {
                type: 'text',
                value: section.title,
                maxlength: '120',
                placeholder: 'Section title',
                'aria-label': 'Section title',
            },
        });
        const deleteButtonNode = createNode('button', {
            className: 'section-delete-button',
            text: '×',
            attributes: { type: 'button', title: 'Delete section', 'aria-label': 'Delete section' },
        });
        const headerNode = createNode('div', { className: 'section-header' }, [
            createNode('span', { className: 'section-drag-grip', attributes: { 'aria-hidden': 'true' } }),
            titleInputNode,
            deleteButtonNode,
        ]);
        const bodyNode = createNode('div', { className: 'section-body' });
        const selectionChipNode = createNode('span', { className: 'selection-chip', text: SECTION_LABEL });
        const sectionNode = createNode('section', {
            className: 'section',
            attributes: { 'data-section-id': section.clientId },
        }, [headerNode, bodyNode, selectionChipNode, ...createSelectionHandleNodes()]);

        this.applyPlacement(sectionNode, section);
        this.#bindSectionEvents(sectionNode, section, titleInputNode, deleteButtonNode);
        const frameHandles = new Map();
        this.#frameHandlesBySection.set(section.clientId, frameHandles);
        for (const element of section.elements) {
            this.#renderFrame(section, element, bodyNode, frameHandles);
        }
        this.#dragResizeController.attachSection(sectionNode, section.clientId, gridNode);

        return {
            node: sectionNode,
            destroy: () => {
                frameHandles.forEach(frameHandle => frameHandle.destroy());
                this.#frameHandlesBySection.delete(section.clientId);
                this.#dragResizeController.detach(sectionNode);
            },
        };
    }

    applyPlacement(sectionNode, { gridColumn, columnSpan, gridRow, rowSpan }) {
        sectionNode.style.gridColumn = `${gridColumn} / span ${columnSpan}`;
        sectionNode.style.gridRow = `${gridRow} / span ${rowSpan}`;
        sectionNode.style.setProperty('--row-span', String(rowSpan));
        sectionNode.style.order = String(gridRow * 100 + gridColumn);
    }

    refreshGeometry(sectionNode, section) {
        this.applyPlacement(sectionNode, section);
        const frameHandles = this.#frameHandlesBySection.get(section.clientId);
        for (const element of section.elements) {
            this.#elementFrameView.applyGeometry(frameHandles.get(element.clientId).node, element);
        }
    }

    syncTitle(sectionNode, section) {
        const titleInputNode = sectionNode.querySelector('.section-title-input');
        if (titleInputNode.value !== section.title) {
            titleInputNode.value = section.title;
        }
    }

    /** Redraws a single element frame in place, keeping its position among its siblings. */
    rerenderElement(sectionNode, section, element) {
        const frameHandles = this.#frameHandlesBySection.get(section.clientId);
        const previousHandle = frameHandles.get(element.clientId);
        previousHandle.destroy();
        const bodyNode = sectionNode.querySelector('.section-body');
        const replacementHandle = this.#elementFrameView.render(section.clientId, element, bodyNode);
        previousHandle.node.replaceWith(replacementHandle.node);
        frameHandles.set(element.clientId, replacementHandle);
    }

    #renderFrame(section, element, bodyNode, frameHandles) {
        const frameHandle = this.#elementFrameView.render(section.clientId, element, bodyNode);
        bodyNode.append(frameHandle.node);
        frameHandles.set(element.clientId, frameHandle);
    }

    #bindSectionEvents(sectionNode, section, titleInputNode, deleteButtonNode) {
        sectionNode.addEventListener('pointerdown', event => {
            const isInsideElementFrame = event.target.closest('.element-frame') !== null;
            if (!isInsideElementFrame) {
                this.#layoutStore.select(section.clientId);
            }
        });
        titleInputNode.addEventListener('input', () => {
            this.#layoutStore.updateSection(section.clientId, { title: titleInputNode.value }, 'content');
        });
        deleteButtonNode.addEventListener('click', () => this.#layoutStore.removeSection(section.clientId));
    }
}
