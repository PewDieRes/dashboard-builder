import { createNode } from '../../dom/createNode.js';
import { DummyDataGenerator } from '../../elements/DummyDataGenerator.js';
import {
    createButton,
    createInspectorSection,
    createSegmentedControl,
    createSelectField,
    createTextField,
    replaceSelectOptions,
} from '../formControls.js';

const MANUAL_DATA_SOURCE = '';
const CHART_TYPE_OPTIONS = [{ value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }];

export class ChartInspector {
    #layoutStore;
    #apiClient;
    #notifier;
    #chartEditorDialog;
    #metricsPromise = null;

    constructor({ layoutStore, apiClient, notifier, chartEditorDialog }) {
        this.#layoutStore = layoutStore;
        this.#apiClient = apiClient;
        this.#notifier = notifier;
        this.#chartEditorDialog = chartEditorDialog;
    }

    render(sectionClientId, elementClientId) {
        const subject = { sectionClientId, elementClientId };
        const { content } = this.#findElement(subject);
        const dataSource = this.#createDataSourceField(subject, content);
        return [
            createInspectorSection('Properties', [
                createSegmentedControl({
                    label: 'Type',
                    options: CHART_TYPE_OPTIONS,
                    selectedValue: content.chartType,
                    onSelect: chartType => this.#updateContent(subject, currentContent => ({ ...currentContent, chartType })),
                }),
                createTextField({
                    label: 'Title',
                    readValue: () => this.#findElement(subject).content.title,
                    applyValue: title => this.#updateContent(subject, current => ({ ...current, title })),
                }),
                dataSource,
                createNode('div', { className: 'button-row button-row-stacked' }, [
                    createButton({ label: 'Edit data', onClick: () => this.#editData(subject) }),
                    createButton({ label: 'Generate random data', onClick: () => this.#generateRandomData(subject) }),
                ]),
            ]),
        ];
    }

    #createDataSourceField(subject, content) {
        const { fieldNode, selectNode } = createSelectField({
            label: 'Data source',
            onChange: dataSource => this.#changeDataSource(subject, selectNode, dataSource),
        });
        const currentDataSource = content.dataSource ?? MANUAL_DATA_SOURCE;
        replaceSelectOptions(selectNode, this.#buildDataSourceOptions([], currentDataSource), currentDataSource);
        this.#populateMetricOptions(selectNode, currentDataSource);
        return fieldNode;
    }

    async #populateMetricOptions(selectNode, currentDataSource) {
        try {
            const metrics = await this.#loadMetrics();
            if (selectNode.isConnected) {
                replaceSelectOptions(selectNode, this.#buildDataSourceOptions(metrics, currentDataSource), currentDataSource);
            }
        } catch {
            // Manual data stays available when the metric list cannot be loaded.
        }
    }

    #buildDataSourceOptions(metrics, currentDataSource) {
        const options = [
            { value: MANUAL_DATA_SOURCE, label: 'Manual data' },
            ...metrics.map(metric => ({ value: metric.key, label: metric.title })),
        ];
        const isListed = options.some(option => option.value === currentDataSource);
        return isListed ? options : [...options, { value: currentDataSource, label: currentDataSource }];
    }

    #loadMetrics() {
        this.#metricsPromise ??= this.#apiClient.listMetrics().catch(error => {
            this.#metricsPromise = null;
            throw error;
        });
        return this.#metricsPromise;
    }

    async #changeDataSource(subject, selectNode, dataSource) {
        if (dataSource === MANUAL_DATA_SOURCE) {
            this.#updateContent(subject, currentContent => this.#withoutDataSource(currentContent));
            return;
        }
        try {
            const { labels, values } = await this.#apiClient.getMetric(dataSource);
            this.#updateContent(subject, currentContent => ({ ...currentContent, labels, values, dataSource }));
        } catch (error) {
            this.#notifier.error(error.message);
            selectNode.value = this.#findElement(subject).content.dataSource ?? MANUAL_DATA_SOURCE;
        }
    }

    async #editData(subject) {
        const editedContent = await this.#chartEditorDialog.open(this.#findElement(subject).content);
        if (editedContent) {
            this.#updateContent(subject, () => editedContent);
        }
    }

    #generateRandomData(subject) {
        const pointCount = this.#findElement(subject).content.labels.length;
        const series = DummyDataGenerator.generateSeries({ pointCount });
        this.#updateContent(subject, currentContent => ({ ...this.#withoutDataSource(currentContent), ...series }));
    }

    #withoutDataSource(content) {
        const manualContent = { ...content };
        delete manualContent.dataSource;
        return manualContent;
    }

    #updateContent({ sectionClientId, elementClientId }, buildContent) {
        const { content } = this.#findElement({ sectionClientId, elementClientId });
        this.#layoutStore.updateElement(
            sectionClientId,
            elementClientId,
            { content: buildContent(content) },
            'element-content',
        );
    }

    #findElement({ sectionClientId, elementClientId }) {
        return this.#layoutStore.findElement(sectionClientId, elementClientId);
    }
}
