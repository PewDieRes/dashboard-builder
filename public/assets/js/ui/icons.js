import { createNode } from '../dom/createNode.js';

const ICON_MARKUP = Object.freeze({
    section: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/>',
    text: '<path d="M5 6h14M12 6v13M9 19h6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/>',
    'bar-chart': '<path d="M5 20v-8M12 20V5M19 20v-5"/>',
    'line-chart': '<path d="M3 17l5-6 4 3 8-9"/><path d="M3 21h18"/>',
    desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    tablet: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>',
    mobile: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
});

export const ELEMENT_ICON_NAMES = Object.freeze({
    text: 'text',
    image: 'image',
    chart: 'bar-chart',
});

export function createIcon(iconName) {
    const iconNode = createNode('span', { className: 'icon', attributes: { 'aria-hidden': 'true' } });
    iconNode.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" `
        + `stroke-linecap="round" stroke-linejoin="round">${ICON_MARKUP[iconName]}</svg>`;
    return iconNode;
}
