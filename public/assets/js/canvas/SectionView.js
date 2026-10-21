import { createNode } from '../dom/createNode.js';
import { SECTION_LABEL } from '../elements/elementTypeLabels.js';
import { ElementFrameView } from './ElementFrameView.js';
import { createSelectionHandleNodes } from './selectionHandles.js';

export class SectionView {
    #layoutStore;
    #dragResizeController;
    #elementFrameView;

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
        const destroyFrames = section.elements.map(element => this.#renderFrame(section, element, bodyNode));
        this.#dragResizeController.attachSection(sectionNode, section.clientId, gridNode);

        return {
            node: sectionNode,
            destroy: () => {
                destroyFrames.forEach(destroyFrame => destroyFrame());
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

    #renderFrame(section, element, bodyNode) {
        const { node, destroy } = this.#elementFrameView.render(section.clientId, element, bodyNode);
        bodyNode.append(node);
        return destroy;
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
