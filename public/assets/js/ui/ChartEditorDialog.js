import { createNode } from '../dom/createNode.js';
import { DummyDataGenerator } from '../elements/DummyDataGenerator.js';

const MINIMUM_ROW_COUNT = 1;
const MAXIMUM_ROW_COUNT = 24;
const CHART_TYPES = ['bar', 'line'];
const MANUAL_DATA_SOURCE = '';
const LINKED_DATA_HINT = 'Data comes from the server and refreshes on every load';

export class ChartEditorDialog {
    #dialogNode;
    #resolveOpenRequest = null;
    #formNode = null;
    #rowsNode = null;
    #errorNode = null;
    #addRowButtonNode = null;
    #dataSourceSelectNode = null;
    #dataSourceHintNode = null;
    #linkedDataSource = null;
    #apiClient;
    #metricsPromise = null;

    constructor(dialogNode, apiClient) {
        this.#dialogNode = dialogNode;
        this.#apiClient = apiClient;
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
        this.#linkedDataSource = content.dataSource ?? null;
        this.#rowsNode = createNode('div', { className: 'chart-data-rows' });
        this.#errorNode = createNode('p', { className: 'dialog-error', attributes: { role: 'alert' } });
        this.#addRowButtonNode = this.#createButton('Add row', () => this.#addRow('', ''));
        const dataSourceFieldNode = this.#createDataSourceField();
        content.labels.forEach((label, pointIndex) => this.#addRow(label, content.values[pointIndex]));

        this.#formNode = createNode('form', { className: 'dialog-form', attributes: { method: 'dialog' } }, [
            createNode('h2', { className: 'dialog-title', text: 'Edit chart' }),
            this.#createTitleField(content.title),
            this.#createChartTypeField(content.chartType),
            dataSourceFieldNode,
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
        this.#populateDataSourceOptions();
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

    #createDataSourceField() {
        this.#dataSourceSelectNode = createNode('select', { attributes: { name: 'dataSource' } });
        this.#dataSourceSelectNode.addEventListener('change', () => this.#handleDataSourceChange());
        this.#dataSourceHintNode = createNode('span', { className: 'dialog-hint', text: LINKED_DATA_HINT });
        this.#renderDataSourceOptions([]);
        return createNode('label', { className: 'dialog-field' }, [
            createNode('span', { text: 'Data source' }),
            this.#dataSourceSelectNode,
            this.#dataSourceHintNode,
        ]);
    }

    #loadMetrics() {
        this.#metricsPromise ??= this.#apiClient.listMetrics().catch(error => {
            this.#metricsPromise = null;
            throw error;
        });
        return this.#metricsPromise;
    }

    async #populateDataSourceOptions() {
        const selectNode = this.#dataSourceSelectNode;
        try {
            const metrics = await this.#loadMetrics();
            if (selectNode === this.#dataSourceSelectNode) {
                this.#renderDataSourceOptions(metrics);
            }
        } catch {
            // Manual data stays available when the metric list cannot be loaded.
        }
    }

    #renderDataSourceOptions(metrics) {
        const options = [{ key: MANUAL_DATA_SOURCE, title: 'Manual data' }, ...metrics];
        const isLinkedMetricListed = metrics.some(metric => metric.key === this.#linkedDataSource);
        if (this.#linkedDataSource !== null && !isLinkedMetricListed) {
            options.push({ key: this.#linkedDataSource, title: this.#linkedDataSource });
        }
        this.#dataSourceSelectNode.replaceChildren(...options.map(option => {
            const optionNode = createNode('option', { text: option.title, attributes: { value: option.key } });
            optionNode.selected = option.key === (this.#linkedDataSource ?? MANUAL_DATA_SOURCE);
            return optionNode;
        }));
    }

    async #handleDataSourceChange() {
        const selectNode = this.#dataSourceSelectNode;
        const requestedDataSource = selectNode.value;
        if (requestedDataSource === MANUAL_DATA_SOURCE) {
            this.#switchToManualData();
            return;
        }
        let metric;
        try {
            metric = await this.#apiClient.getMetric(requestedDataSource);
        } catch (error) {
            if (selectNode === this.#dataSourceSelectNode && selectNode.value === requestedDataSource) {
                selectNode.value = this.#linkedDataSource ?? MANUAL_DATA_SOURCE;
                this.#errorNode.textContent = error.message;
            }
            return;
        }
        if (selectNode !== this.#dataSourceSelectNode || selectNode.value !== requestedDataSource) {
            return;
        }
        this.#linkedDataSource = requestedDataSource;
        this.#replaceRows(metric.labels, metric.values);
        this.#errorNode.textContent = '';
    }

    #switchToManualData() {
        this.#linkedDataSource = null;
        this.#dataSourceSelectNode.value = MANUAL_DATA_SOURCE;
        this.#refreshRowControls();
    }

    #replaceRows(labels, values) {
        this.#rowsNode.replaceChildren();
        labels.forEach((label, pointIndex) => this.#addRow(label, values[pointIndex]));
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
        const isLinked = this.#linkedDataSource !== null;
        this.#addRowButtonNode.disabled = isLinked || rowNodes.length >= MAXIMUM_ROW_COUNT;
        this.#dataSourceHintNode.hidden = !isLinked;
        for (const rowNode of rowNodes) {
            rowNode.querySelector('button').disabled = isLinked || rowNodes.length <= MINIMUM_ROW_COUNT;
            for (const inputNode of rowNode.querySelectorAll('input')) {
                inputNode.readOnly = isLinked;
            }
        }
    }

    #generateRandomData() {
        this.#switchToManualData();
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
        const content = {
            chartType: this.#formNode.elements.chartType.value,
            title: this.#formNode.elements.title.value,
            labels,
            values,
        };
        if (this.#linkedDataSource !== null) {
            content.dataSource = this.#linkedDataSource;
        }
        return content;
    }
}
