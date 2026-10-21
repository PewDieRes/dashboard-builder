import { DashboardApiClient } from './api/DashboardApiClient.js';
import { ElementInserter } from './elements/ElementInserter.js';
import { DashboardCanvas } from './canvas/DashboardCanvas.js';
import { ChartElementRenderer } from './elements/ChartElementRenderer.js';
import { ElementRendererRegistry } from './elements/ElementRendererRegistry.js';
import { ImageElementRenderer } from './elements/ImageElementRenderer.js';
import { TextElementRenderer } from './elements/TextElementRenderer.js';
import { DragResizeController } from './interaction/DragResizeController.js';
import { AutosaveScheduler } from './persistence/AutosaveScheduler.js';
import { createNode } from './dom/createNode.js';
import { LayoutStore } from './state/LayoutStore.js';
import { AddPanel } from './ui/AddPanel.js';
import { ChartEditorDialog } from './ui/ChartEditorDialog.js';
import { FrameLabel } from './ui/FrameLabel.js';
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

function createRendererRegistry(apiClient) {
    const rendererRegistry = new ElementRendererRegistry();
    const richTextToolbarNode = createNode('div', { className: 'rich-text-toolbar', attributes: { hidden: '' } });
    document.body.append(richTextToolbarNode);
    const richTextToolbar = new RichTextToolbar(richTextToolbarNode);
    rendererRegistry.register('text', new TextElementRenderer(richTextToolbar));
    rendererRegistry.register('image', new ImageElementRenderer());
    const chartEditorDialog = new ChartEditorDialog(document.querySelector('#chart-editor-dialog'), apiClient);
    rendererRegistry.register('chart', new ChartElementRenderer(chartEditorDialog));
    return rendererRegistry;
}

async function startApplication() {
    const apiClient = new DashboardApiClient();
    const layoutStore = new LayoutStore();
    const notifier = new Notifier(document.querySelector('#toast-region'));
    const rendererRegistry = createRendererRegistry(apiClient);
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
