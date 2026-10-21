import { DashboardApiClient } from './api/DashboardApiClient.js';
import { DashboardCanvas } from './canvas/DashboardCanvas.js';
import { createNode } from './dom/createNode.js';
import { ChartElementRenderer } from './elements/ChartElementRenderer.js';
import { ElementInserter } from './elements/ElementInserter.js';
import { ElementRendererRegistry } from './elements/ElementRendererRegistry.js';
import { ImageElementRenderer } from './elements/ImageElementRenderer.js';
import { ImageUploader } from './elements/ImageUploader.js';
import { TextElementRenderer } from './elements/TextElementRenderer.js';
import { DragResizeController } from './interaction/DragResizeController.js';
import { AutosaveScheduler } from './persistence/AutosaveScheduler.js';
import { LayoutStore } from './state/LayoutStore.js';
import { AddPanel } from './ui/AddPanel.js';
import { ChartEditorDialog } from './ui/ChartEditorDialog.js';
import { FrameLabel } from './ui/FrameLabel.js';
import { ChartInspector } from './ui/inspector/ChartInspector.js';
import { DashboardInspector } from './ui/inspector/DashboardInspector.js';
import { ElementGeometryInspector } from './ui/inspector/ElementGeometryInspector.js';
import { ImageInspector } from './ui/inspector/ImageInspector.js';
import { InspectorPanel } from './ui/inspector/InspectorPanel.js';
import { SectionInspector } from './ui/inspector/SectionInspector.js';
import { TextInspector } from './ui/inspector/TextInspector.js';
import { LayersPanel } from './ui/LayersPanel.js';
import { Notifier } from './ui/Notifier.js';
import { RichTextToolbar } from './ui/RichTextToolbar.js';
import { SidebarTabs } from './ui/SidebarTabs.js';
import { Toolbar } from './ui/Toolbar.js';

const COMPACT_VIEWPORT_QUERY = '(max-width: 767px)';
const DEFAULT_DASHBOARD_NAME = 'My Dashboard';

function synchronizeUrl(dashboardId) {
    history.replaceState(null, '', `?dashboard=${dashboardId}`);
}

function applyResponsiveMode(dragResizeController) {
    const compactViewport = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    const apply = () => {
        document.body.classList.toggle('is-compact', compactViewport.matches);
        dragResizeController.setEnabled(!compactViewport.matches);
    };
    compactViewport.addEventListener('change', apply);
    apply();
}

async function resolveInitialDashboardId(toolbar, apiClient) {
    let dashboards = await toolbar.refreshDashboardList();
    if (dashboards.length === 0) {
        await apiClient.createDashboard(DEFAULT_DASHBOARD_NAME);
        dashboards = await toolbar.refreshDashboardList();
    }
    const requestedId = Number(new URLSearchParams(window.location.search).get('dashboard'));
    const requestedDashboard = dashboards.find(dashboard => dashboard.id === requestedId);
    return (requestedDashboard ?? dashboards[0])?.id;
}

function createRendererRegistry({ richTextToolbar, imageUploader, chartEditorDialog }) {
    const rendererRegistry = new ElementRendererRegistry();
    rendererRegistry.register('text', new TextElementRenderer(richTextToolbar));
    rendererRegistry.register('image', new ImageElementRenderer(imageUploader));
    rendererRegistry.register('chart', new ChartElementRenderer(chartEditorDialog));
    return rendererRegistry;
}

function createInspectorPanel({ layoutStore, apiClient, notifier, imageUploader, richTextToolbar, chartEditorDialog }) {
    return new InspectorPanel(document.querySelector('#inspector'), {
        layoutStore,
        dashboardInspector: new DashboardInspector(layoutStore),
        sectionInspector: new SectionInspector(layoutStore),
        elementGeometryInspector: new ElementGeometryInspector(layoutStore),
        typeInspectors: {
            text: new TextInspector(richTextToolbar),
            image: new ImageInspector(layoutStore, imageUploader),
            chart: new ChartInspector({ layoutStore, apiClient, notifier, chartEditorDialog }),
        },
    });
}

async function startApplication() {
    const apiClient = new DashboardApiClient();
    const layoutStore = new LayoutStore();
    const notifier = new Notifier(document.querySelector('#toast-region'));
    const imageUploader = new ImageUploader(apiClient, notifier);
    const chartEditorDialog = new ChartEditorDialog(document.querySelector('#chart-editor-dialog'), apiClient);
    const richTextToolbar = new RichTextToolbar(
        createNode('div', { className: 'rich-text-toolbar', attributes: { hidden: '' } }),
    );
    const rendererRegistry = createRendererRegistry({ richTextToolbar, imageUploader, chartEditorDialog });
    const dragResizeController = new DragResizeController(layoutStore);

    new FrameLabel(document.querySelector('#frame-label'), layoutStore);
    new DashboardCanvas(document.querySelector('#dashboard-canvas'), {
        workspaceNode: document.querySelector('#workspace'),
        layoutStore,
        rendererRegistry,
        dragResizeController,
        apiClient,
        notifier,
    });
    new SidebarTabs(document.querySelector('#sidebar'));
    new AddPanel(document.querySelector('#add-panel'), {
        layoutStore,
        elementInserter: new ElementInserter(layoutStore),
    });
    new LayersPanel(document.querySelector('#layers-panel'), layoutStore);
    createInspectorPanel({ layoutStore, apiClient, notifier, imageUploader, richTextToolbar, chartEditorDialog });

    let toolbar = null;
    const autosaveScheduler = new AutosaveScheduler(layoutStore, apiClient, {
        notifier,
        onStatusChange: status => toolbar.showSaveStatus(status),
    });
    toolbar = new Toolbar(document.querySelector('.topbar'), {
        layoutStore,
        apiClient,
        notifier,
        onDashboardChange: synchronizeUrl,
        onSaveRequested: () => autosaveScheduler.saveNow(),
    });

    applyResponsiveMode(dragResizeController);

    try {
        const initialDashboardId = await resolveInitialDashboardId(toolbar, apiClient);
        if (initialDashboardId !== undefined) {
            await toolbar.openDashboard(initialDashboardId);
        }
    } catch (error) {
        notifier.error(error.message);
    }
}

startApplication();
