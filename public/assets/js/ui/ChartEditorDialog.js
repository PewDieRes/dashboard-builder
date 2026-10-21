import { createNode } from '../dom/createNode.js';
import { DummyDataGenerator } from '../elements/DummyDataGenerator.js';

const MINIMUM_ROW_COUNT = 1;
const MAXIMUM_ROW_COUNT = 24;
const CHART_TYPES = ['bar', 'line'];

export class ChartEditorDialog {
    #dialogNode;
    #resolveOpenRequest = null;
    #formNode = null;
    #rowsNode = null;
    #errorNode = null;
    #addRowButtonNode = null;

    constructor(dialogNode) {
        this.#dialogNode = dialogNode;
        this.#dialogNode.addEventListener('close', () => this.#settle(null));
    }

    /** Resolves to the edited content, or null when the dialog is cancelled. */
    open(content) {
        this.#settle(null);
        return new Promise(resolve => {
            this.#resolveOpenRequest = resolve;
            this.#renderForm(content);
            this.#dialogNode.showModal();
        });
    }

    #settle(result) {
        const resolve = this.#resolveOpenRequest;
        this.#resolveOpenRequest = null;
        resolve?.(result);
    }

    #renderForm(content) {
        this.#rowsNode = createNode('div', { className: 'chart-data-rows' });
        this.#errorNode = createNode('p', { className: 'dialog-error', attributes: { role: 'alert' } });
        this.#addRowButtonNode = this.#createButton('Add row', () => this.#addRow('', ''));
        content.labels.forEach((label, pointIndex) => this.#addRow(label, content.values[pointIndex]));

        this.#formNode = createNode('form', { className: 'dialog-form', attributes: { method: 'dialog' } }, [
            createNode('h2', { className: 'dialog-title', text: 'Edit chart' }),
            this.#createTitleField(content.title),
            this.#createChartTypeField(content.chartType),
            createNode('fieldset', { className: 'dialog-field' }, [
                createNode('legend', { text: 'Data' }),
                this.#rowsNode,
            ]),
            this.#errorNode,
            this.#createActions(),
        ]);
        this.#formNode.addEventListener('submit', event => {
            event.preventDefault();
            this.#save();
        });
        this.#dialogNode.replaceChildren(this.#formNode);
        this.#refreshRowControls();
    }

    #createTitleField(title) {
        const inputNode = createNode('input', {
            attributes: { type: 'text', name: 'title', value: title, maxlength: '120' },
        });
        return createNode('label', { className: 'dialog-field' }, [createNode('span', { text: 'Title' }), inputNode]);
    }

    #createChartTypeField(selectedChartType) {
        const radioLabelNodes = CHART_TYPES.map(chartType => {
            const radioNode = createNode('input', { attributes: { type: 'radio', name: 'chartType', value: chartType } });
            radioNode.checked = chartType === selectedChartType;
            return createNode('label', {}, [radioNode, document.createTextNode(` ${chartType[0].toUpperCase()}${chartType.slice(1)}`)]);
        });
        return createNode('fieldset', { className: 'dialog-field' }, [
            createNode('legend', { text: 'Chart type' }),
            createNode('div', { className: 'dialog-radio-group' }, radioLabelNodes),
        ]);
    }

    #createActions() {
        const cancelButtonNode = this.#createButton('Cancel', () => this.#dialogNode.close());
        const saveButtonNode = createNode('button', {
            className: 'button button-primary',
            text: 'Save',
            attributes: { type: 'submit' },
        });
        const generateButtonNode = this.#createButton('Generate random data', () => this.#generateRandomData());
        return createNode('div', { className: 'dialog-actions' }, [
            this.#addRowButtonNode,
            generateButtonNode,
            createNode('div', { className: 'dialog-actions-end' }, [cancelButtonNode, saveButtonNode]),
        ]);
    }

    #createButton(label, onClick) {
        const buttonNode = createNode('button', { className: 'button', text: label, attributes: { type: 'button' } });
        buttonNode.addEventListener('click', onClick);
        return buttonNode;
    }

    #addRow(label, value) {
        const labelInputNode = createNode('input', {
            attributes: { type: 'text', 'aria-label': 'Label', placeholder: 'Label', value: String(label) },
        });
        const valueInputNode = createNode('input', {
            attributes: { type: 'number', step: 'any', 'aria-label': 'Value', placeholder: 'Value', value: String(value) },
        });
        const removeButtonNode = createNode('button', {
            className: 'button',
            text: '×',
            attributes: { type: 'button', 'aria-label': 'Remove row', title: 'Remove row' },
        });
        const rowNode = createNode('div', { className: 'chart-data-row' }, [labelInputNode, valueInputNode, removeButtonNode]);
        removeButtonNode.addEventListener('click', () => this.#removeRow(rowNode));
        this.#rowsNode.append(rowNode);
        this.#refreshRowControls();
    }

    #removeRow(rowNode) {
        rowNode.remove();
        this.#refreshRowControls();
    }

    #refreshRowControls() {
        const rowNodes = [...this.#rowsNode.children];
        this.#addRowButtonNode.disabled = rowNodes.length >= MAXIMUM_ROW_COUNT;
        for (const rowNode of rowNodes) {
            rowNode.querySelector('button').disabled = rowNodes.length <= MINIMUM_ROW_COUNT;
        }
    }

    #generateRandomData() {
        const pointCount = this.#rowsNode.children.length;
        const { labels, values } = DummyDataGenerator.generateSeries({ pointCount });
        [...this.#rowsNode.children].forEach((rowNode, rowIndex) => {
            const [labelInputNode, valueInputNode] = rowNode.querySelectorAll('input');
            labelInputNode.value = labels[rowIndex];
            valueInputNode.value = String(values[rowIndex]);
        });
        this.#errorNode.textContent = '';
    }

    #save() {
        const content = this.#readContent();
        if (!content) {
            return;
        }
        this.#settle(content);
        this.#dialogNode.close();
    }

    /** Returns the form content, or null after showing an inline error when a value is not a number. */
    #readContent() {
        const labels = [];
        const values = [];
        for (const rowNode of this.#rowsNode.children) {
            const [labelInputNode, valueInputNode] = rowNode.querySelectorAll('input');
            const value = Number(valueInputNode.value);
            if (valueInputNode.value.trim() === '' || Number.isNaN(value)) {
                this.#errorNode.textContent = 'Every value must be a number.';
                valueInputNode.focus();
                return null;
            }
            labels.push(labelInputNode.value);
            values.push(value);
        }
        this.#errorNode.textContent = '';
        return {
            chartType: this.#formNode.elements.chartType.value,
            title: this.#formNode.elements.title.value,
            labels,
            values,
        };
    }
}
