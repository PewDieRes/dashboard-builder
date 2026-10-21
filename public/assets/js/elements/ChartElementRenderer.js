import { createNode } from '../dom/createNode.js';

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
        containerNode.append(wrapperNode);

        const chartHandle = { chart: this.#createChart(canvasNode, element.content) };
        const resizeObserver = new ResizeObserver(() => chartHandle.chart.resize());
        resizeObserver.observe(canvasHolderNode);

        const openEditor = () => this.#editContent(chartHandle, canvasNode, element, context);
        editButtonNode.addEventListener('click', openEditor);
        wrapperNode.addEventListener('dblclick', openEditor);

        return () => {
            resizeObserver.disconnect();
            chartHandle.chart.destroy();
        };
    }

    #createChart(canvasNode, content) {
        return new window.Chart(canvasNode, {
            type: content.chartType,
            data: {
                labels: content.labels,
                datasets: [{ label: content.title, data: content.values }],
            },
            options: { responsive: true, maintainAspectRatio: false, animation: false },
        });
    }

    async #editContent(chartHandle, canvasNode, element, context) {
        const newContent = await this.#chartEditorDialog.open(element.content);
        if (!newContent) {
            return;
        }
        const previousChartType = element.content.chartType;
        context.layoutStore.updateElement(
            context.sectionClientId,
            context.elementClientId,
            { content: newContent },
            'content',
        );
        if (newContent.chartType !== previousChartType) {
            chartHandle.chart.destroy();
            chartHandle.chart = this.#createChart(canvasNode, newContent);
            return;
        }
        this.#updateChartInPlace(chartHandle.chart, newContent);
    }

    #updateChartInPlace(chart, content) {
        chart.data.labels = content.labels;
        chart.data.datasets[0].label = content.title;
        chart.data.datasets[0].data = content.values;
        chart.update();
    }
}
