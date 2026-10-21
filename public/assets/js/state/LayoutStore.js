const EMPTY_SELECTION = Object.freeze({ sectionClientId: null, elementClientId: null });

export class LayoutStore extends EventTarget {
    #dashboardId = null;
    #name = '';
    #sections = [];
    #selection = EMPTY_SELECTION;

    load(dashboard) {
        this.#dashboardId = dashboard.id;
        this.#name = dashboard.name;
        this.#sections = (dashboard.sections ?? []).map(section => this.#assignClientIds(section));
        this.#selection = EMPTY_SELECTION;
        this.#emitChange('load');
    }

    getDashboardId() {
        return this.#dashboardId;
    }

    getDashboardName() {
        return this.#name;
    }

    getLayout() {
        const sections = this.#sections.map(section => {
            const payloadSection = this.#withoutClientId(section);
            payloadSection.elements = payloadSection.elements.map(element => this.#withoutClientId(element));
            return payloadSection;
        });
        return { name: this.#name, sections };
    }

    getSections() {
        return [...this.#sections];
    }

    findSection(sectionClientId) {
        return this.#sections.find(section => section.clientId === sectionClientId);
    }

    findElement(sectionClientId, elementClientId) {
        return this.findSection(sectionClientId)?.elements.find(element => element.clientId === elementClientId);
    }

    addSection(sectionFields) {
        const section = { title: '', elements: [], ...sectionFields, clientId: crypto.randomUUID() };
        this.#sections.push(section);
        this.#emitChange('structure');
        return section.clientId;
    }

    updateSection(sectionClientId, changedFields, reason = 'geometry') {
        Object.assign(this.#requireSection(sectionClientId), changedFields);
        this.#emitChange(reason);
    }

    removeSection(sectionClientId) {
        this.#requireSection(sectionClientId);
        this.#sections = this.#sections.filter(section => section.clientId !== sectionClientId);
        if (this.#selection.sectionClientId === sectionClientId) {
            this.#selection = EMPTY_SELECTION;
        }
        this.#emitChange('structure');
    }

    addElement(sectionClientId, elementFields) {
        const section = this.#requireSection(sectionClientId);
        const highestZIndex = section.elements.reduce((highest, element) => Math.max(highest, element.zIndex), 0);
        const element = { ...elementFields, zIndex: highestZIndex + 1, clientId: crypto.randomUUID() };
        section.elements.push(element);
        this.#emitChange('structure');
        return element.clientId;
    }

    updateElement(sectionClientId, elementClientId, changedFields, reason = 'geometry') {
        Object.assign(this.#requireElement(sectionClientId, elementClientId), changedFields);
        this.#emitChange(reason, { sectionClientId, elementClientId });
    }

    removeElement(sectionClientId, elementClientId) {
        const section = this.#requireSection(sectionClientId);
        this.#requireElement(sectionClientId, elementClientId);
        section.elements = section.elements.filter(element => element.clientId !== elementClientId);
        if (this.#selection.elementClientId === elementClientId) {
            this.#selection = { sectionClientId, elementClientId: null };
        }
        this.#emitChange('structure');
    }

    renameDashboard(name) {
        this.#name = name;
        this.#emitChange('rename');
    }

    select(sectionClientId, elementClientId = null) {
        const isUnchanged = this.#selection.sectionClientId === sectionClientId
            && this.#selection.elementClientId === elementClientId;
        if (isUnchanged) {
            return;
        }
        this.#selection = { sectionClientId, elementClientId };
        this.#emitChange('selection');
    }

    getSelection() {
        return { ...this.#selection };
    }

    #assignClientIds(section) {
        return {
            ...structuredClone(section),
            clientId: crypto.randomUUID(),
            elements: (section.elements ?? []).map(element => ({
                ...structuredClone(element),
                clientId: crypto.randomUUID(),
            })),
        };
    }

    #withoutClientId(record) {
        const copy = structuredClone(record);
        delete copy.clientId;
        return copy;
    }

    #requireSection(sectionClientId) {
        const section = this.findSection(sectionClientId);
        if (!section) {
            throw new Error(`Unknown section: ${sectionClientId}`);
        }
        return section;
    }

    #requireElement(sectionClientId, elementClientId) {
        const element = this.findElement(sectionClientId, elementClientId);
        if (!element) {
            throw new Error(`Unknown element: ${elementClientId}`);
        }
        return element;
    }

    #emitChange(reason, subject = {}) {
        this.dispatchEvent(new CustomEvent('change', { detail: { reason, ...subject } }));
    }
}
