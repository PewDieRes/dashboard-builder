export function applyBoxStyle(frameNode, { offsetXPercent, offsetYPercent, widthPercent, heightPercent }) {
    frameNode.style.left = `${offsetXPercent}%`;
    frameNode.style.top = `${offsetYPercent}%`;
    frameNode.style.width = `${widthPercent}%`;
    frameNode.style.height = `${heightPercent}%`;
}
