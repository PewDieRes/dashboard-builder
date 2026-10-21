import { createNode } from '../../dom/createNode.js';
import { clampElementBox } from '../../interaction/geometry.js';
import { createButton, createInspectorSection, createNumberField } from '../formControls.js';

const MINIMUM_Z_INDEX = 0;
const MAXIMUM_Z_INDEX = 1000;
const MAXIMUM_PERCENT = 100;

export class ElementGeometryInspector {
    #layoutStore;

    constructor(layoutStore) {
        this.#layoutStore = layoutStore;
    }

    render(sectionClientId, elementClientId) {
        const subject = { sectionClientId, elementClientId };
        return [
            createInspectorSection('Position', [
                createNode('div', { className: 'field-pair' }, [
                    this.#createBoxField(subject, 'X', 'X', 'offsetXPercent'),
                    this.#createBoxField(subject, 'Y', 'Y', 'offsetYPercent'),
                ]),
            ]),
            createInspectorSection('Size', [
                createNode('div', { className: 'field-pair' }, [
                    this.#createBoxField(subject, 'W', 'Width', 'widthPercent'),
                    this.#createBoxField(subject, 'H', 'Height', 'heightPercent'),
                ]),
            ]),
            createInspectorSection('Arrange', [
                createNode('div', { className: 'button-row' }, [
                    createButton({ label: 'Bring forward', onClick: () => this.#shiftLayer(subject, 1) }),
                    createButton({ label: 'Send backward', onClick: () => this.#shiftLayer(subject, -1) }),
                ]),
            ]),
            createInspectorSection('Actions', [
                createButton({
                    label: 'Delete element',
                    className: 'button-danger',
                    onClick: () => this.#layoutStore.removeElement(sectionClientId, elementClientId),
                }),
            ]),
        ];
    }

    #createBoxField(subject, label, ariaLabel, fieldName) {
        return createNumberField({
            label,
            ariaLabel,
            unit: '%',
            minimum: 0,
            maximum: MAXIMUM_PERCENT,
            readValue: () => this.#findElement(subject)[fieldName],
            applyValue: value => this.#applyBox(subject, { [fieldName]: value }),
        });
    }

    #applyBox(subject, changedFields) {
        const { offsetXPercent, offsetYPercent, widthPercent, heightPercent } = this.#findElement(subject);
        const box = clampElementBox({ offsetXPercent, offsetYPercent, widthPercent, heightPercent, ...changedFields });
        this.#layoutStore.updateElement(subject.sectionClientId, subject.elementClientId, box, 'geometry');
    }

    #shiftLayer(subject, step) {
        const zIndex = Math.min(Math.max(this.#findElement(subject).zIndex + step, MINIMUM_Z_INDEX), MAXIMUM_Z_INDEX);
        this.#layoutStore.updateElement(subject.sectionClientId, subject.elementClientId, { zIndex }, 'geometry');
    }

    #findElement({ sectionClientId, elementClientId }) {
        return this.#layoutStore.findElement(sectionClientId, elementClientId);
    }
}
