import { ApiError } from './ApiError.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export class DashboardApiClient {
    #baseUrl;

    constructor(baseUrl = '/api') {
        this.#baseUrl = baseUrl;
    }

    async listDashboards() {
        const body = await this.#request('/dashboards');
        return body.dashboards;
    }

    createDashboard(name) {
        return this.#request('/dashboards', this.#jsonRequest('POST', { name }));
    }

    getDashboard(dashboardId) {
        return this.#request(`/dashboards/${dashboardId}`);
    }

    saveLayout(dashboardId, layout) {
        return this.#request(`/dashboards/${dashboardId}/layout`, this.#jsonRequest('PUT', layout));
    }

    uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        return this.#request('/images', { method: 'POST', body: formData });
    }

    #jsonRequest(method, payload) {
        return { method, headers: JSON_HEADERS, body: JSON.stringify(payload) };
    }

    async #request(path, requestOptions = {}) {
        let response;
        try {
            response = await fetch(`${this.#baseUrl}${path}`, requestOptions);
        } catch {
            throw new ApiError('Network error', { status: 0, code: 'network_error' });
        }
        const body = await this.#readJsonBody(response);
        if (!response.ok) {
            throw this.#toApiError(response, body);
        }
        return body;
    }

    async #readJsonBody(response) {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }

    #toApiError(response, body) {
        const errorPayload = body?.error;
        return new ApiError(errorPayload?.message ?? `Request failed (${response.status})`, {
            status: response.status,
            code: errorPayload?.code ?? 'http_error',
            details: errorPayload?.details ?? {},
        });
    }
}
