import { createNode } from '../dom/createNode.js';
import { createIcon } from './icons.js';

const DEVICES = [
    { name: 'desktop', label: 'Desktop', iconName: 'desktop', isStacked: false },
    { name: 'tablet', label: 'Tablet', iconName: 'tablet', isStacked: true },
    { name: 'mobile', label: 'Mobile', iconName: 'mobile', isStacked: true },
];
const DEFAULT_DEVICE_NAME = 'desktop';
const BLOCKING_REASON = 'device-frame';

export class DeviceSwitcher {
    #frameColumnNode;
    #frameNode;
    #interactionGate;
    #buttonNodesByDevice = new Map();

    constructor(rootNode, { frameColumnNode, frameNode, interactionGate }) {
        this.#frameColumnNode = frameColumnNode;
        this.#frameNode = frameNode;
        this.#interactionGate = interactionGate;
        const groupNode = createNode('div', {
            className: 'segmented-control device-switcher',
            attributes: { role: 'group', 'aria-label': 'Device preview' },
        }, DEVICES.map(device => this.#createButton(device)));
        rootNode.append(groupNode);
        this.#select(DEFAULT_DEVICE_NAME);
    }

    #createButton(device) {
        const buttonNode = createNode('button', {
            className: 'segment segment-icon',
            attributes: { type: 'button', 'aria-label': device.label, title: device.label },
        }, [createIcon(device.iconName)]);
        buttonNode.addEventListener('click', () => this.#select(device.name));
        this.#buttonNodesByDevice.set(device.name, buttonNode);
        return buttonNode;
    }

    #select(deviceName) {
        const selectedDevice = DEVICES.find(device => device.name === deviceName);
        for (const [name, buttonNode] of this.#buttonNodesByDevice) {
            buttonNode.setAttribute('aria-pressed', String(name === deviceName));
        }
        this.#frameColumnNode.dataset.device = deviceName;
        this.#frameNode.classList.toggle('is-stacked', selectedDevice.isStacked);
        this.#interactionGate.setBlocked(BLOCKING_REASON, selectedDevice.isStacked);
    }
}
