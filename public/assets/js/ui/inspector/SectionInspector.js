import { createNode } from '../../dom/createNode.js';
import { clampSectionPlacement } from '../../interaction/geometry.js';
import { createButton, createInspectorSection, createNumberField, createTextField } from '../formControls.js';

const COLUMN_COUNT = 12;
const MINIMUM_ROW_SPAN = 4;
const MAXIMUM_ROW_SPAN = 200;

export class SectionInspector {
    #layoutStore;

    constructor(layoutStore) {
        this.#layoutStore = layoutStore;
    }

    render(sectionClientId) {
        return [
            createInspectorSection('General', [
                createTextField({
                    label: 'Title',
                    placeholder: 'Section title',
                    readValue: () => this.#layoutStore.findSection(sectionClientId).title,
                    applyValue: title => this.#layoutStore.updateSection(sectionClientId, { title }, 'content'),
                }),
            ]),
            createInspectorSection('Position', [
                createNode('div', { className: 'field-stack' }, [
                    this.#createPlacementField(sectionClientId, 'Column', 'gridColumn', 1, COLUMN_COUNT),
                    this.#createPlacementField(sectionClientId, 'Row', 'gridRow', 1, MAXIMUM_ROW_SPAN),
                ]),
            ]),
            createInspectorSection('Size', [
                createNode('div', { className: 'field-stack' }, [
                    this.#createPlacementField(sectionClientId, 'Columns', 'columnSpan', 1, COLUMN_COUNT),
                    this.#createPlacementField(
                        sectionClientId,
                        'Height in rows',
                        'rowSpan',
                        MINIMUM_ROW_SPAN,
                        MAXIMUM_ROW_SPAN,
                    ),
                ]),
            ]),
            createInspectorSection('Actions', [
                createButton({
                    label: 'Delete section',
                    className: 'button-danger',
                    onClick: () => this.#layoutStore.removeSection(sectionClientId),
                }),
            ]),
        ];
    }

    #createPlacementField(sectionClientId, label, fieldName, minimum, maximum) {
        return createNumberField({
            label,
            minimum,
            maximum,
            readValue: () => this.#layoutStore.findSection(sectionClientId)[fieldName],
            applyValue: value => this.#applyPlacement(sectionClientId, { [fieldName]: value }),
        });
    }

    #applyPlacement(sectionClientId, changedFields) {
        const { gridColumn, columnSpan, gridRow, rowSpan } = this.#layoutStore.findSection(sectionClientId);
        const placement = clampSectionPlacement({ gridColumn, columnSpan, gridRow, rowSpan, ...changedFields });
        this.#layoutStore.updateSection(sectionClientId, placement, 'geometry');
    }
}
