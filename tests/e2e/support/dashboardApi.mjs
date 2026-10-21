import { expect } from '@playwright/test';

export const SAMPLE_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export function buildTestLayout(name) {
    return {
        name,
        sections: [
            {
                title: 'Notes',
                gridColumn: 1,
                gridRow: 1,
                columnSpan: 6,
                rowSpan: 30,
                elements: [
                    {
                        elementType: 'text',
                        offsetXPercent: 10,
                        offsetYPercent: 10,
                        widthPercent: 50,
                        heightPercent: 40,
                        zIndex: 1,
                        content: { html: '<p>Editable note</p>' },
                    },
                ],
            },
            {
                title: 'Revenue',
                gridColumn: 7,
                gridRow: 1,
                columnSpan: 6,
                rowSpan: 30,
                elements: [
                    {
                        elementType: 'chart',
                        offsetXPercent: 0,
                        offsetYPercent: 0,
                        widthPercent: 100,
                        heightPercent: 100,
                        zIndex: 1,
                        content: { chartType: 'bar', title: 'Revenue', labels: ['Jan', 'Feb', 'Mar'], values: [10, 20, 30] },
                    },
                ],
            },
            {
                title: 'Logo',
                gridColumn: 1,
                gridRow: 31,
                columnSpan: 4,
                rowSpan: 24,
                elements: [
                    {
                        elementType: 'image',
                        offsetXPercent: 0,
                        offsetYPercent: 0,
                        widthPercent: 100,
                        heightPercent: 100,
                        zIndex: 1,
                        content: { imageUrl: '/assets/images/sample-banner.svg', altText: 'Sample banner' },
                    },
                ],
            },
        ],
    };
}

export async function createTestDashboard(request, name = `E2E ${Date.now()}`) {
    const createResponse = await request.post('/api/dashboards', { data: { name } });
    expect(createResponse.status()).toBe(201);
    const { id: dashboardId } = await createResponse.json();
    const saveResponse = await request.put(`/api/dashboards/${dashboardId}/layout`, { data: buildTestLayout(name) });
    expect(saveResponse.status()).toBe(200);
    return dashboardId;
}

export async function fetchDashboard(request, dashboardId) {
    const response = await request.get(`/api/dashboards/${dashboardId}`);
    expect(response.status()).toBe(200);
    return response.json();
}

export async function openDashboard(page, dashboardId) {
    await page.goto(`/?dashboard=${dashboardId}`);
    await expect(page.locator('.section')).toHaveCount(3);
    await expect(page.locator('#save-status')).toHaveAttribute('data-status', 'saved');
}

export async function dragBy(page, locator, deltaX, deltaY) {
    const box = await locator.boundingBox();
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 12 });
    await page.mouse.up();
}

export async function dragFromPoint(page, startX, startY, deltaX, deltaY) {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 12 });
    await page.mouse.up();
}
