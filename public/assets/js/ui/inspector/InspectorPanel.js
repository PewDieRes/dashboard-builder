import { createNode } from '../../dom/createNode.js';
import { ELEMENT_TYPE_LABELS, SECTION_LABEL } from '../../elements/elementTypeLabels.js';
import { createIcon, ELEMENT_ICON_NAMES } from '../icons.js';
import { refreshFormControls } from '../formControls.js';

const DASHBOARD_LABEL = 'Dashboard';
const REDRAW_REASONS = new Set(['load', 'structure', 'selection']);
const REFRESH_FIELD_REASONS = new Set(['geometry', 'content']);
const REDRAW_UNLESS_TYPING_REASONS = new Set(['element-content', 'rename']);
const TEXT_ENTRY_SELECTOR = 'input[type="text"], input[type="number"], textarea';

export class InspectorPanel {
    #rootNode;
    #layoutStore;
    #dashboardInspector;
    #sectionInspector;
    #elementGeometryInspector;
    #typeInspectors;

    constructor(rootNode, { layoutStore, dashboardInspector, sectionInspector, elementGeometryInspector, typeInspectors }) {
        this.#rootNode = rootNode;
        this.#layoutStore = layoutStore;
        this.#dashboardInspector = dashboardInspector;
        this.#sectionInspector = sectionInspector;
        this.#elementGeometryInspector = elementGeometryInspector;
        this.#typeInspectors = typeInspectors;
        layoutStore.addEventListener('change', event => this.#handleChange(event.detail.reason));
        this.#redraw();
    }

    #handleChange(reason) {
        if (REDRAW_REASONS.has(reason)) {
            this.#redraw();
        } else if (REFRESH_FIELD_REASONS.has(reason)) {
            refreshFormControls(this.#rootNode);
        } else if (REDRAW_UNLESS_TYPING_REASONS.has(reason) && !this.#isTypingInside()) {
            this.#redraw();
        }
    }

    #isTypingInside() {
        const focusedNode = document.activeElement;
        return this.#rootNode.contains(focusedNode) && focusedNode.matches(TEXT_ENTRY_SELECTOR);
    }

    #redraw() {
        const { sectionClientId, elementClientId } = this.#layoutStore.getSelection();
        if (elementClientId !== null) {
            this.#rootNode.replaceChildren(...this.#renderElement(sectionClientId, elementClientId));
        } else if (sectionClientId !== null) {
            this.#rootNode.replaceChildren(
                this.#createHeader(SECTION_LABEL, 'section'),
                ...this.#sectionInspector.render(sectionClientId),
            );
        } else {
            this.#rootNode.replaceChildren(
                this.#createHeader(DASHBOARD_LABEL, 'desktop'),
                ...this.#dashboardInspector.render(),
            );
        }
    }

    #renderElement(sectionClientId, elementClientId) {
        const { elementType } = this.#layoutStore.findElement(sectionClientId, elementClientId);
        return [
            this.#createHeader(ELEMENT_TYPE_LABELS[elementType], ELEMENT_ICON_NAMES[elementType]),
            ...this.#elementGeometryInspector.render(sectionClientId, elementClientId),
            ...this.#typeInspectors[elementType].render(sectionClientId, elementClientId),
        ];
    }

    #createHeader(label, iconName) {
        return createNode('header', { className: 'inspector-header' }, [
            createIcon(iconName),
            createNode('h2', { className: 'inspector-title', text: label }),
        ]);
    }
}
