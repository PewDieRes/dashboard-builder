import { createNode } from '../dom/createNode.js';

const ACCENT_COLOR_VARIABLE = '--color-accent';

export class ChartElementRenderer {
    #chartEditorDialog;

    constructor(chartEditorDialog) {
        this.#chartEditorDialog = chartEditorDialog;
    }

    render(containerNode, element, context) {
        if (!window.Chart) {
            containerNode.textContent = 'Chart library could not be loaded.';
            return () => {};
        }
        const canvasNode = createNode('canvas');
        const canvasHolderNode = createNode('div', { className: 'chart-canvas-holder' }, [canvasNode]);
        const editButtonNode = createNode('button', {
            className: 'chart-edit-button',
            text: 'Edit chart',
            attributes: { type: 'button' },
        });
        const wrapperNode = createNode('div', { className: 'chart-element' }, [editButtonNode, canvasHolderNode]);
        if (element.content.dataSource) {
            wrapperNode.prepend(createNode('span', { className: 'chart-live-badge', text: 'Live' }));
        }
        containerNode.append(wrapperNode);

        const chartHandle = { chart: this.#createChart(canvasNode, element.content), isDestroyed: false };
        const resizeObserver = new ResizeObserver(() => chartHandle.chart.resize());
        resizeObserver.observe(canvasHolderNode);

        const openEditor = () => this.#editContent(element, context);
        editButtonNode.addEventListener('click', openEditor);
        wrapperNode.addEventListener('dblclick', openEditor);

        if (element.content.dataSource) {
            this.#loadLiveData(chartHandle, element, context);
        }

        return () => {
            chartHandle.isDestroyed = true;
            resizeObserver.disconnect();
            chartHandle.chart.destroy();
        };
    }

    #createChart(canvasNode, content) {
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue(ACCENT_COLOR_VARIABLE).trim();
        return new window.Chart(canvasNode, {
            type: content.chartType,
            data: {
                labels: content.labels,
                datasets: [{
                    label: content.title,
                    data: content.values,
                    backgroundColor: accentColor,
                    borderColor: accentColor,
                }],
            },
            options: { responsive: true, maintainAspectRatio: false, animation: false },
        });
    }

    async #loadLiveData(chartHandle, element, context) {
        const requestedDataSource = element.content.dataSource;
        let metric;
        try {
            metric = await context.apiClient.getMetric(requestedDataSource);
        } catch (error) {
            if (!chartHandle.isDestroyed) {
                context.notifier.error(`Could not load live chart data: ${error.message}`);
            }
            return;
        }
        if (chartHandle.isDestroyed || element.content.dataSource !== requestedDataSource) {
            return;
        }
        this.#applyLiveSeries(chartHandle, element, context, metric);
    }

    #applyLiveSeries(chartHandle, element, context, metric) {
        const { labels, values } = element.content;
        if (JSON.stringify(labels) === JSON.stringify(metric.labels)
            && JSON.stringify(values) === JSON.stringify(metric.values)) {
            return;
        }
        const liveContent = { ...element.content, labels: metric.labels, values: metric.values };
        context.layoutStore.updateElement(
            context.sectionClientId,
            context.elementClientId,
            { content: liveContent },
            'content',
        );
        this.#updateChartInPlace(chartHandle.chart, liveContent);
    }

    async #editContent(element, context) {
        const newContent = await this.#chartEditorDialog.open(element.content);
        if (newContent) {
            context.layoutStore.updateElement(
                context.sectionClientId,
                context.elementClientId,
                { content: newContent },
                'element-content',
            );
        }
    }

    #updateChartInPlace(chart, content) {
        chart.data.labels = content.labels;
        chart.data.datasets[0].label = content.title;
        chart.data.datasets[0].data = content.values;
        chart.update();
    }
}
