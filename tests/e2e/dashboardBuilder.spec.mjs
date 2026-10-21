import { test, expect } from '@playwright/test';
import {
    SAMPLE_PNG_BASE64,
    createTestDashboard,
    dragBy,
    dragFromPoint,
    fetchDashboard,
    openDashboard,
} from './support/dashboardApi.mjs';

let dashboardId;
let uncaughtPageErrors;

test.beforeEach(async ({ page, request }) => {
    uncaughtPageErrors = [];
    page.on('pageerror', error => uncaughtPageErrors.push(error.message));
    dashboardId = await createTestDashboard(request);
    page.on('dialog', dialog => dialog.accept());
    await openDashboard(page, dashboardId);
});

test.afterEach(() => {
    expect(uncaughtPageErrors, 'uncaught errors in the page').toEqual([]);
});

async function expectSavedLayout(request, assertion) {
    await expect.poll(async () => assertion(await fetchDashboard(request, dashboardId)), { timeout: 8_000 }).toBe(true);
}

test.describe('loading', () => {
    test('renders the saved layout with text, chart and image', async ({ page }) => {
        await expect(page.locator('.text-element')).toContainText('Editable note');
        await expect(page.locator('.chart-element canvas')).toHaveCount(1);
        await expect(page.locator('.image-element img')).toHaveAttribute('src', '/assets/images/sample-banner.svg');
    });
});

test.describe('sections', () => {
    test('adds a section and persists it', async ({ page, request }) => {
        await page.getByRole('button', { name: 'Add section' }).click();
        await expect(page.locator('.section')).toHaveCount(4);
        await expectSavedLayout(request, dashboard => dashboard.sections.length === 4);
        await page.reload();
        await expect(page.locator('.section')).toHaveCount(4);
    });

    test('moves a section by dragging its header', async ({ page, request }) => {
        const logoSection = page.locator('.section').nth(2);
        await dragBy(page, logoSection.locator('.section-drag-grip'), 500, 0);
        await expectSavedLayout(request, dashboard => dashboard.sections[2].gridColumn > 1);
    });

    test('resizes a section from its right edge without moving it', async ({ page, request }) => {
        const logoSection = page.locator('.section').nth(2);
        const box = await logoSection.boundingBox();
        await dragFromPoint(page, box.x + box.width - 3, box.y + box.height / 2, 2000, 0);
        await expectSavedLayout(request, dashboard => {
            const section = dashboard.sections[2];
            return section.gridColumn === 1 && section.columnSpan === 12;
        });
    });

    test('renames a section', async ({ page, request }) => {
        const titleInput = page.locator('.section').first().getByLabel('Section title');
        await titleInput.fill('Renamed notes');
        await expectSavedLayout(request, dashboard => dashboard.sections[0].title === 'Renamed notes');
    });

    test('deletes a section', async ({ page, request }) => {
        await page.locator('.section').nth(2).getByLabel('Delete section').click();
        await expect(page.locator('.section')).toHaveCount(2);
        await expectSavedLayout(request, dashboard => dashboard.sections.length === 2);
    });
});

test.describe('rich text', () => {
    test('edits text with bold, italic and font size and keeps it after reload', async ({ page, request }) => {
        const editable = page.locator('.text-element');
        await editable.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.type('Quarterly results');
        await expect(page.locator('.rich-text-toolbar')).toBeVisible();

        await page.keyboard.press('Control+A');
        await page.getByRole('button', { name: 'Bold' }).click();
        await page.getByRole('button', { name: 'Italic' }).click();
        await page.locator('.rich-text-size-select').selectOption('24');

        await expectSavedLayout(request, dashboard => {
            const html = dashboard.sections[0].elements[0].content.html;
            return /Quarterly results/.test(html)
                && /<(b|strong)>/.test(html)
                && /<(i|em)>/.test(html)
                && /font-size: 24px/.test(html);
        });

        await page.reload();
        await expect(page.locator('.text-element')).toContainText('Quarterly results');
        await expect(page.locator('.text-element span[style*="font-size: 24px"]')).toHaveCount(1);
    });
});

test.describe('elements', () => {
    test('adds text, image and chart elements to the selected section', async ({ page, request }) => {
        await page.locator('.section').first().locator('.section-body').click({ position: { x: 5, y: 5 } });
        for (const elementLabel of ['Add text', 'Add image', 'Add bar chart']) {
            await page.getByRole('button', { name: elementLabel }).click();
        }
        await expect(page.locator('.section').first().locator('.element-frame')).toHaveCount(4);
        await expectSavedLayout(request, dashboard => {
            const types = dashboard.sections[0].elements.map(element => element.elementType).sort();
            return JSON.stringify(types) === JSON.stringify(['chart', 'image', 'text', 'text']);
        });
    });

    test('moves an element with its drag handle', async ({ page, request }) => {
        const frame = page.locator('.section').first().locator('.element-frame');
        await frame.hover();
        await dragBy(page, frame.locator('.element-drag-handle'), 60, 40);
        await expectSavedLayout(request, dashboard => {
            const element = dashboard.sections[0].elements[0];
            return element.offsetXPercent > 10 && element.offsetYPercent > 10;
        });
    });

    test('resizes an element and clamps it to the section without moving the left edge', async ({ page, request }) => {
        const frame = page.locator('.section').first().locator('.element-frame');
        await frame.click();
        const box = await frame.boundingBox();
        await dragFromPoint(page, box.x + box.width - 2, box.y + box.height / 2, 2000, 0);
        await expectSavedLayout(request, dashboard => {
            const element = dashboard.sections[0].elements[0];
            return element.offsetXPercent === 10 && element.widthPercent === 90;
        });
    });

    test('deletes an element', async ({ page, request }) => {
        const frame = page.locator('.section').first().locator('.element-frame');
        await frame.hover();
        await frame.getByLabel('Delete element').click();
        await expect(page.locator('.section').first().locator('.element-frame')).toHaveCount(0);
        await expectSavedLayout(request, dashboard => dashboard.sections[0].elements.length === 0);
    });
});

test.describe('images', () => {
    test('uploads a replacement image and keeps it after reload', async ({ page, request }) => {
        await page.locator('.element-frame input[type="file"]').setInputFiles({
            name: 'pixel.png',
            mimeType: 'image/png',
            buffer: Buffer.from(SAMPLE_PNG_BASE64, 'base64'),
        });
        await expect(page.locator('.image-element img')).toHaveAttribute('src', /^\/uploads\/[a-f0-9]{32}\.png$/);
        await expectSavedLayout(request, dashboard =>
            /^\/uploads\//.test(dashboard.sections[2].elements[0].content.imageUrl));
        await page.reload();
        await expect(page.locator('.image-element img')).toHaveAttribute('src', /^\/uploads\//);
    });

    test('rejects a non-image file with an error message', async ({ page }) => {
        await page.locator('.element-frame input[type="file"]').setInputFiles({
            name: 'notes.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('not an image'),
        });
        await expect(page.locator('#toast-region')).not.toBeEmpty();
        await expect(page.locator('.image-element img')).toHaveAttribute('src', '/assets/images/sample-banner.svg');
    });
});

test.describe('charts', () => {
    test('edits chart type, title and data, and generates random data', async ({ page, request }) => {
        await page.locator('.chart-edit-button').click();
        const dialog = page.locator('#chart-editor-dialog');
        await expect(dialog).toBeVisible();

        await dialog.locator('input[name="title"]').fill('Weekly signups');
        await dialog.locator('input[name="chartType"][value="line"]').check();
        await dialog.getByRole('button', { name: 'Add row' }).click();
        await dialog.getByLabel('Label').last().fill('Apr');
        await dialog.getByLabel('Value').last().fill('42');
        await dialog.getByRole('button', { name: 'Save' }).click();
        await expect(dialog).toBeHidden();

        await expectSavedLayout(request, dashboard => {
            const content = dashboard.sections[1].elements[0].content;
            return content.chartType === 'line' && content.title === 'Weekly signups'
                && content.labels.length === 4 && content.values[3] === 42;
        });

        await page.locator('.chart-edit-button').click();
        await dialog.getByRole('button', { name: 'Generate random data' }).click();
        await dialog.getByRole('button', { name: 'Save' }).click();
        await expectSavedLayout(request, dashboard => {
            const values = dashboard.sections[1].elements[0].content.values;
            return values.length === 4 && JSON.stringify(values) !== JSON.stringify([10, 20, 30, 42]);
        });
    });

    test('rejects non-numeric chart values inline', async ({ page }) => {
        await page.locator('.chart-edit-button').click();
        const dialog = page.locator('#chart-editor-dialog');
        await dialog.getByLabel('Value').first().evaluate(input => { input.type = 'text'; input.value = 'abc'; });
        await dialog.getByRole('button', { name: 'Save' }).click();
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('.dialog-error')).not.toBeEmpty();
    });
});

test.describe('live chart data', () => {
    test('links a chart to a server metric and keeps the link after reload', async ({ page, request }) => {
        await page.locator('.chart-edit-button').click();
        const dialog = page.locator('#chart-editor-dialog');
        await dialog.locator('select[name="dataSource"]').selectOption('signups-by-channel');
        await expect(dialog.locator('.chart-data-row')).toHaveCount(5);
        await expect(dialog.getByLabel('Label').first()).not.toBeEditable();
        await expect(dialog.getByText('Data comes from the server and refreshes on every load')).toBeVisible();
        await dialog.getByRole('button', { name: 'Save' }).click();
        await expect(dialog).toBeHidden();
        await expect(page.locator('.chart-live-badge')).toBeVisible();

        await expectSavedLayout(request, dashboard => {
            const content = dashboard.sections[1].elements[0].content;
            return content.dataSource === 'signups-by-channel' && content.labels.length === 5;
        });

        await page.reload();
        await expect(page.locator('.chart-live-badge')).toBeVisible();
    });

    test('switching back to manual data removes the link', async ({ page, request }) => {
        await page.locator('.chart-edit-button').click();
        const dialog = page.locator('#chart-editor-dialog');
        await dialog.locator('select[name="dataSource"]').selectOption('signups-by-channel');
        await expect(dialog.locator('.chart-data-row')).toHaveCount(5);
        await dialog.getByRole('button', { name: 'Save' }).click();
        await expectSavedLayout(request, dashboard =>
            dashboard.sections[1].elements[0].content.dataSource === 'signups-by-channel');

        await page.locator('.chart-edit-button').click();
        await dialog.locator('select[name="dataSource"]').selectOption({ label: 'Manual data' });
        await expect(dialog.getByLabel('Label').first()).toBeEditable();
        await dialog.getByRole('button', { name: 'Save' }).click();
        await expect(page.locator('.chart-live-badge')).toBeHidden();

        await expectSavedLayout(request, dashboard =>
            !('dataSource' in dashboard.sections[1].elements[0].content));
    });
});

test.describe('metrics api', () => {
    test('lists the available metrics', async ({ request }) => {
        const response = await request.get('/api/metrics');
        expect(response.status()).toBe(200);
        const { metrics } = await response.json();
        expect(metrics.map(metric => metric.key)).toEqual(['monthly-revenue', 'daily-visitors', 'signups-by-channel']);
    });

    test('returns a generated series for a known metric', async ({ request }) => {
        const response = await request.get('/api/metrics/daily-visitors');
        expect(response.status()).toBe(200);
        const metric = await response.json();
        expect(metric.labels).toHaveLength(7);
        expect(metric.values).toHaveLength(7);
    });

    test('returns 404 for an unknown metric', async ({ request }) => {
        const response = await request.get('/api/metrics/unknown');
        expect(response.status()).toBe(404);
        expect((await response.json()).error.code).toBe('not_found');
    });
});

test.describe('dashboards', () => {
    test('creates a new dashboard and switches back', async ({ page }) => {
        page.removeAllListeners('dialog');
        page.on('dialog', dialog => dialog.accept('Created in e2e'));
        await page.getByRole('button', { name: 'New dashboard' }).click();
        await expect(page.locator('#dashboard-name-input')).toHaveValue('Created in e2e');
        await expect(page).not.toHaveURL(new RegExp(`dashboard=${dashboardId}$`));

        await page.locator('#dashboard-select').selectOption(String(dashboardId));
        await expect(page.locator('.section')).toHaveCount(3);
        await expect(page).toHaveURL(new RegExp(`dashboard=${dashboardId}$`));
    });

    test('renames the dashboard', async ({ page, request }) => {
        await page.locator('#dashboard-name-input').fill('Renamed board');
        await expectSavedLayout(request, dashboard => dashboard.name === 'Renamed board');
    });
});

test.describe('responsive', () => {
    test('stacks sections on a phone without horizontal scroll', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expect(page.locator('body')).toHaveClass(/is-compact/);
        const sectionBoxes = await page.locator('.section').evaluateAll(sections =>
            sections.map(section => section.getBoundingClientRect().toJSON()));
        for (let sectionIndex = 1; sectionIndex < sectionBoxes.length; sectionIndex += 1) {
            expect(sectionBoxes[sectionIndex].top).toBeGreaterThanOrEqual(sectionBoxes[sectionIndex - 1].bottom - 1);
        }
        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(hasHorizontalScroll).toBe(false);
    });
});

function elementFrameInSection(page, sectionIndex) {
    return page.locator('.section').nth(sectionIndex).locator('.element-frame');
}

test.describe('inspector', () => {
    test('shows the dashboard summary when nothing is selected', async ({ page }) => {
        const inspector = page.locator('#inspector');
        await expect(inspector.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
        await expect(inspector).toContainText('Sections');
        await expect(inspector.getByLabel('Name', { exact: true })).toBeVisible();
    });

    test('width input resizes the element on the canvas and persists', async ({ page, request }) => {
        const frame = elementFrameInSection(page, 0);
        await frame.click({ position: { x: 4, y: 4 } });
        await page.locator('#inspector').getByLabel('Width', { exact: true }).fill('30');
        await expect.poll(() => frame.evaluate(node => node.style.width)).toBe('30%');
        await expectSavedLayout(request, dashboard => dashboard.sections[0].elements[0].widthPercent === 30);
    });

    test('clamps an out-of-range size to the section', async ({ page, request }) => {
        await elementFrameInSection(page, 0).click({ position: { x: 4, y: 4 } });
        const widthInput = page.locator('#inspector').getByLabel('Width', { exact: true });
        await widthInput.fill('500');
        await widthInput.blur();
        await expect(widthInput).toHaveValue('100');
        await expectSavedLayout(request, dashboard => dashboard.sections[0].elements[0].widthPercent === 100);
    });

    test('section column and span inputs persist', async ({ page, request }) => {
        await page.locator('.section').nth(2).locator('.section-title-input').click();
        const inspector = page.locator('#inspector');
        await inspector.getByLabel('Column', { exact: true }).fill('3');
        await inspector.getByLabel('Columns', { exact: true }).fill('5');
        await expectSavedLayout(request, dashboard => {
            const section = dashboard.sections[2];
            return section.gridColumn === 3 && section.columnSpan === 5;
        });
    });

    test('section title edited in the inspector updates the canvas', async ({ page, request }) => {
        await page.locator('.section').first().locator('.section-title-input').click();
        await page.locator('#inspector').getByLabel('Title', { exact: true }).fill('From inspector');
        await expect(page.locator('.section').first().getByLabel('Section title')).toHaveValue('From inspector');
        await expectSavedLayout(request, dashboard => dashboard.sections[0].title === 'From inspector');
    });

    test('arranges an element with bring forward', async ({ page, request }) => {
        await elementFrameInSection(page, 0).click({ position: { x: 4, y: 4 } });
        await page.getByRole('button', { name: 'Bring forward' }).click();
        await expectSavedLayout(request, dashboard => dashboard.sections[0].elements[0].zIndex === 2);
    });

    test('deletes the selected element from the inspector', async ({ page, request }) => {
        await elementFrameInSection(page, 0).click({ position: { x: 4, y: 4 } });
        await page.locator('#inspector').getByRole('button', { name: 'Delete element' }).click();
        await expect(elementFrameInSection(page, 0)).toHaveCount(0);
        await expectSavedLayout(request, dashboard => dashboard.sections[0].elements.length === 0);
    });

    test('chart inspector switches the chart type and persists it', async ({ page, request }) => {
        await elementFrameInSection(page, 1).click({ position: { x: 4, y: 4 } });
        await page.locator('#inspector').getByRole('button', { name: 'Line', exact: true }).click();
        await expectSavedLayout(request, dashboard => dashboard.sections[1].elements[0].content.chartType === 'line');
        await expect(page.locator('.chart-element canvas')).toHaveCount(1);
    });

    test('chart inspector links a data source and edits the title', async ({ page, request }) => {
        await elementFrameInSection(page, 1).click({ position: { x: 4, y: 4 } });
        const inspector = page.locator('#inspector');
        await inspector.getByLabel('Title', { exact: true }).fill('Visitors');
        await inspector.getByLabel('Data source').selectOption('daily-visitors');
        await expectSavedLayout(request, dashboard => {
            const content = dashboard.sections[1].elements[0].content;
            return content.title === 'Visitors' && content.dataSource === 'daily-visitors' && content.labels.length === 7;
        });
        await expect(page.locator('.chart-live-badge')).toBeVisible();
    });

    test('image inspector edits the alt text', async ({ page, request }) => {
        await elementFrameInSection(page, 2).click({ position: { x: 4, y: 4 } });
        await page.locator('#inspector').getByLabel('Alt text').fill('Company logo');
        await expect(page.locator('.image-element img')).toHaveAttribute('alt', 'Company logo');
        await expectSavedLayout(request, dashboard => dashboard.sections[2].elements[0].content.altText === 'Company logo');
    });

    test('text inspector hints until the text is focused', async ({ page }) => {
        await page.getByRole('tab', { name: 'Layers' }).click();
        await page.locator('.layer-row-element', { hasText: 'Editable note' }).click();
        const inspector = page.locator('#inspector');
        await expect(inspector.getByText('Click into the text to format it')).toBeVisible();
        await page.locator('.text-element').click();
        await expect(inspector.getByRole('button', { name: 'Bold' })).toBeVisible();
        await expect(inspector.getByText('Click into the text to format it')).toBeHidden();
    });
});

test.describe('add panel', () => {
    test('adding text with no section selected creates a section first', async ({ page, request }) => {
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Add text' }).click();
        await expect(page.locator('.section')).toHaveCount(4);
        await expect(page.locator('.section').nth(3).locator('.element-frame')).toHaveCount(1);
        await expectSavedLayout(request, dashboard =>
            dashboard.sections.length === 4 && dashboard.sections[3].elements[0].elementType === 'text');
    });

    test('adds a line chart with the line type', async ({ page, request }) => {
        await page.locator('.section').nth(2).locator('.section-title-input').click();
        await page.getByRole('button', { name: 'Add line chart' }).click();
        await expectSavedLayout(request, dashboard => {
            const chart = dashboard.sections[2].elements.find(element => element.elementType === 'chart');
            return chart?.content.chartType === 'line';
        });
    });
});

test.describe('layers', () => {
    test('clicking a layer selects the element on the canvas and the reverse', async ({ page }) => {
        await page.getByRole('tab', { name: 'Layers' }).click();
        await page.locator('.layer-row-element', { hasText: 'Revenue' }).click();
        await expect(elementFrameInSection(page, 1)).toHaveClass(/is-selected/);

        await elementFrameInSection(page, 2).click({ position: { x: 4, y: 4 } });
        await expect(page.locator('.layer-row.is-selected')).toHaveCount(1);
        await expect(page.locator('.layer-row.is-selected')).toContainText('Sample banner');
    });

    test('clicking a section layer selects the section', async ({ page }) => {
        await page.getByRole('tab', { name: 'Layers' }).click();
        await page.locator('.layer-row-section', { hasText: 'Logo' }).click();
        await expect(page.locator('.section').nth(2)).toHaveClass(/is-selected/);
        await expect(page.locator('#inspector').getByRole('heading', { name: 'Section', exact: true })).toBeVisible();
    });
});

test.describe('device modes', () => {
    test('mobile mode stacks sections inside a narrow frame', async ({ page }) => {
        await page.getByRole('button', { name: 'Mobile', exact: true }).click();
        const frame = page.locator('#dashboard-canvas');
        await expect(frame).toHaveClass(/is-stacked/);
        expect((await frame.boundingBox()).width).toBeLessThanOrEqual(390);
        const sectionBoxes = await page.locator('.section').evaluateAll(sections =>
            sections.map(section => section.getBoundingClientRect().toJSON()));
        for (let sectionIndex = 1; sectionIndex < sectionBoxes.length; sectionIndex += 1) {
            expect(sectionBoxes[sectionIndex].top).toBeGreaterThanOrEqual(sectionBoxes[sectionIndex - 1].bottom - 1);
        }
        await page.getByRole('button', { name: 'Desktop', exact: true }).click();
        await expect(frame).not.toHaveClass(/is-stacked/);
    });

    test('tablet mode keeps the frame at tablet width', async ({ page }) => {
        await page.getByRole('button', { name: 'Tablet', exact: true }).click();
        expect((await page.locator('#dashboard-canvas').boundingBox()).width).toBeLessThanOrEqual(768);
    });
});

test.describe('preview', () => {
    test('hides the sidebars, blocks dragging and makes text read-only', async ({ page, request }) => {
        await page.getByRole('button', { name: 'Preview', exact: true }).click();
        await expect(page.locator('#sidebar')).toBeHidden();
        await expect(page.locator('#inspector')).toBeHidden();
        await expect(page.locator('.text-element')).toHaveAttribute('contenteditable', 'false');

        const box = await elementFrameInSection(page, 0).boundingBox();
        await dragFromPoint(page, box.x + box.width / 2, box.y + box.height / 2, 120, 60);
        await page.waitForTimeout(2_000);
        const [element] = (await fetchDashboard(request, dashboardId)).sections[0].elements;
        expect([element.offsetXPercent, element.offsetYPercent]).toEqual([10, 10]);

        await page.getByRole('button', { name: 'Preview', exact: true }).click();
        await expect(page.locator('#sidebar')).toBeVisible();
        await expect(page.locator('.text-element')).toHaveAttribute('contenteditable', 'true');
    });
});

test.describe('keyboard shortcuts', () => {
    test('Delete removes the selected element', async ({ page, request }) => {
        await elementFrameInSection(page, 2).click({ position: { x: 4, y: 4 } });
        await page.keyboard.press('Delete');
        await expect(elementFrameInSection(page, 2)).toHaveCount(0);
        await expectSavedLayout(request, dashboard => dashboard.sections[2].elements.length === 0);
    });

    test('Delete removes a selected section when no element is selected', async ({ page, request }) => {
        await page.locator('.section').nth(2).locator('.section-header').click({ position: { x: 2, y: 2 } });
        await page.keyboard.press('Delete');
        await expect(page.locator('.section')).toHaveCount(2);
        await expectSavedLayout(request, dashboard => dashboard.sections.length === 2);
    });

    test('Delete inside a text field does not remove the selection', async ({ page }) => {
        await page.locator('.section').first().getByLabel('Section title').click();
        await page.keyboard.press('Delete');
        await expect(page.locator('.section')).toHaveCount(3);
    });

    test('Escape clears the selection', async ({ page }) => {
        await elementFrameInSection(page, 2).click({ position: { x: 4, y: 4 } });
        await expect(page.locator('#dashboard-canvas .is-selected')).toHaveCount(1);
        await page.keyboard.press('Escape');
        await expect(page.locator('#dashboard-canvas .is-selected')).toHaveCount(0);
        await expect(page.locator('#inspector')).toContainText('Overview');
    });
});
