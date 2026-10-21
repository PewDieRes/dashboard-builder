import { createNode } from '../dom/createNode.js';

const FIELD_REFRESH_EVENT = 'inspector-refresh';
const EDITABLE_FIELD_SELECTOR = 'input[type="number"], input[type="text"]';

/** Asks every field inside the container to re-read its value from its source, except the one being typed in. */
export function refreshFormControls(containerNode) {
    for (const inputNode of containerNode.querySelectorAll(EDITABLE_FIELD_SELECTOR)) {
        if (inputNode !== document.activeElement) {
            inputNode.dispatchEvent(new Event(FIELD_REFRESH_EVENT));
        }
    }
}

export function createInspectorSection(title, childNodes) {
    return createNode('section', { className: 'inspector-section' }, [
        createNode('h3', { className: 'panel-heading', text: title }),
        ...childNodes,
    ]);
}

export function createHint(text) {
    return createNode('p', { className: 'panel-hint', text });
}

export function createButton({ label, onClick, className = '' }) {
    const buttonNode = createNode('button', {
        className: `button ${className}`.trim(),
        text: label,
        attributes: { type: 'button' },
    });
    buttonNode.addEventListener('click', onClick);
    return buttonNode;
}

/**
 * Compact number input. `applyValue` receives each valid entry as it is typed; on commit the field shows
 * `readValue()` again, so any clamping applied by the caller becomes visible.
 */
export function createNumberField({ label, ariaLabel = label, unit = '', minimum, maximum, readValue, applyValue }) {
    const inputNode = createNode('input', {
        className: 'field-input',
        attributes: { type: 'number', step: 'any', min: String(minimum), max: String(maximum), 'aria-label': ariaLabel },
    });
    const showCurrentValue = () => {
        inputNode.value = String(readValue());
    };
    showCurrentValue();
    inputNode.addEventListener(FIELD_REFRESH_EVENT, showCurrentValue);
    inputNode.addEventListener('input', () => {
        if (inputNode.value.trim() !== '' && Number.isFinite(inputNode.valueAsNumber)) {
            applyValue(inputNode.valueAsNumber);
        }
    });
    inputNode.addEventListener('change', showCurrentValue);
    return createNode('label', { className: 'field field-compact' }, [
        createNode('span', { className: 'field-label', text: label }),
        inputNode,
        createNode('span', { className: 'field-unit', text: unit }),
    ]);
}

export function createTextField({ label, readValue, maxLength = 120, placeholder = '', applyValue }) {
    const inputNode = createNode('input', {
        className: 'field-input control',
        attributes: { type: 'text', maxlength: String(maxLength), placeholder },
    });
    inputNode.value = readValue();
    inputNode.addEventListener(FIELD_REFRESH_EVENT, () => {
        inputNode.value = readValue();
    });
    inputNode.addEventListener('input', () => applyValue(inputNode.value));
    return createNode('label', { className: 'field' }, [
        createNode('span', { className: 'field-label', text: label }),
        inputNode,
    ]);
}

export function createSelectField({ label, onChange }) {
    const selectNode = createNode('select', { className: 'field-input control' });
    selectNode.addEventListener('change', () => onChange(selectNode.value));
    const fieldNode = createNode('label', { className: 'field' }, [
        createNode('span', { className: 'field-label', text: label }),
        selectNode,
    ]);
    return { fieldNode, selectNode };
}

export function replaceSelectOptions(selectNode, options, selectedValue) {
    selectNode.replaceChildren(...options.map(option => {
        const optionNode = new Option(option.label, option.value);
        optionNode.selected = option.value === selectedValue;
        return optionNode;
    }));
}

export function createSegmentedControl({ label, options, selectedValue, onSelect }) {
    const buttonNodes = options.map(option => {
        const buttonNode = createNode('button', {
            className: 'segment',
            text: option.label,
            attributes: { type: 'button', 'aria-pressed': String(option.value === selectedValue) },
        });
        buttonNode.addEventListener('click', () => onSelect(option.value));
        return buttonNode;
    });
    return createNode('div', { className: 'field' }, [
        createNode('span', { className: 'field-label', text: label }),
        createNode('div', { className: 'segmented-control', attributes: { role: 'group', 'aria-label': label } }, buttonNodes),
    ]);
}
