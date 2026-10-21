const MINIMUM_ELEMENT_SIZE_PERCENT = 5;
const MAXIMUM_PERCENT = 100;
const GRID_COLUMN_COUNT = 12;
const MINIMUM_ROW_SPAN = 4;
const MAXIMUM_ROW_SPAN = 200;

function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}

function roundToTwoDecimals(value) {
    return Math.round(value * 100) / 100;
}

export function pixelsToPercent(pixels, totalPixels) {
    if (totalPixels <= 0) {
        return 0;
    }
    return (pixels / totalPixels) * MAXIMUM_PERCENT;
}

export function clampElementBox({ offsetXPercent, offsetYPercent, widthPercent, heightPercent }) {
    const clampedWidth = clamp(widthPercent, MINIMUM_ELEMENT_SIZE_PERCENT, MAXIMUM_PERCENT);
    const clampedHeight = clamp(heightPercent, MINIMUM_ELEMENT_SIZE_PERCENT, MAXIMUM_PERCENT);
    return {
        offsetXPercent: roundToTwoDecimals(clamp(offsetXPercent, 0, MAXIMUM_PERCENT - clampedWidth)),
        offsetYPercent: roundToTwoDecimals(clamp(offsetYPercent, 0, MAXIMUM_PERCENT - clampedHeight)),
        widthPercent: roundToTwoDecimals(clampedWidth),
        heightPercent: roundToTwoDecimals(clampedHeight),
    };
}

export function clampSectionPlacement({ gridColumn, columnSpan, gridRow, rowSpan }) {
    const clampedColumnSpan = clamp(Math.round(columnSpan), 1, GRID_COLUMN_COUNT);
    return {
        gridColumn: clamp(Math.round(gridColumn), 1, GRID_COLUMN_COUNT - clampedColumnSpan + 1),
        columnSpan: clampedColumnSpan,
        gridRow: Math.max(Math.round(gridRow), 1),
        rowSpan: clamp(Math.round(rowSpan), MINIMUM_ROW_SPAN, MAXIMUM_ROW_SPAN),
    };
}

export function findNextFreeRow(sections) {
    return sections.reduce((nextRow, section) => Math.max(nextRow, section.gridRow + section.rowSpan), 1);
}
