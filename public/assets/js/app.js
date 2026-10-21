import { DashboardApiClient } from './api/DashboardApiClient.js';
import { DashboardCanvas } from './canvas/DashboardCanvas.js';
import { ChartElementRenderer } from './elements/ChartElementRenderer.js';
import { ElementRendererRegistry } from './elements/ElementRendererRegistry.js';
import { ImageElementRenderer } from './elements/ImageElementRenderer.js';
import { TextElementRenderer } from './elements/TextElementRenderer.js';
import { DragResizeController } from './interaction/DragResizeController.js';
import { AutosaveScheduler } from './persistence/AutosaveScheduler.js';
import { LayoutStore } from './state/LayoutStore.js';
import { ChartEditorDialog } from './ui/ChartEditorDialog.js';
import { Notifier } from './ui/Notifier.js';
import { RichTextToolbar } from './ui/RichTextToolbar.js';
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

function createRendererRegistry() {
    const rendererRegistry = new ElementRendererRegistry();
    const richTextToolbar = new RichTextToolbar(document.querySelector('.rich-text-toolbar'));
    rendererRegistry.register('text', new TextElementRenderer(richTextToolbar));
    rendererRegistry.register('image', new ImageElementRenderer());
    const chartEditorDialog = new ChartEditorDialog(document.querySelector('#chart-editor-dialog'));
    rendererRegistry.register('chart', new ChartElementRenderer(chartEditorDialog));
    return rendererRegistry;
}

async function startApplication() {
    const apiClient = new DashboardApiClient();
    const layoutStore = new LayoutStore();
    const notifier = new Notifier(document.querySelector('#toast-region'));
    const rendererRegistry = createRendererRegistry();
    const dragResizeController = new DragResizeController(layoutStore);

    new DashboardCanvas(document.querySelector('#dashboard-canvas'), {
        layoutStore,
        rendererRegistry,
        dragResizeController,
        apiClient,
        notifier,
    });

    let toolbar = null;
    const autosaveScheduler = new AutosaveScheduler(layoutStore, apiClient, {
        notifier,
        onStatusChange: status => toolbar.showSaveStatus(status),
    });
    toolbar = new Toolbar(document.querySelector('.toolbar'), {
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
