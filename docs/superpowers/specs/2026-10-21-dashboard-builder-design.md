# Dashboard Builder — Design Spec

Date: 2026-10-21

## Goal

A dynamic dashboard builder (Canva/Figma-style blocks) on a LAMP stack. Users add, move and resize
**sections** on a dashboard, and place **elements** (rich text, images, charts) inside sections. Every
element is draggable and resizable. The full layout (position, size, content) is stored in MySQL through
PHP APIs and rendered again on reload.

Deliverables: working prototype with dummy data, SQL schema + sample data, short README.

## Non-goals

Authentication, multi-user collaboration, undo/redo, version history, mobile editing (mobile is view-friendly).

## Stack

- Backend: PHP 8.3, no framework, Composer PSR-4 autoload, PDO (MySQL/MariaDB).
- Frontend: vanilla ES modules, no build step. Libraries via CDN with pinned versions:
  interact.js (drag/resize), Chart.js (charts).
- Tests: PHPUnit for backend; shell smoke test for the HTTP API.
- Runtime: `php -S` built-in server with `public/index.php` as router; `docker-compose.yml` for reviewers.

## Repository layout

```
public/            web root
  index.php        front controller: /api/* to router, otherwise static files / index.html
  index.html
  assets/css/      app.css
  assets/js/       ES modules (see Frontend)
  uploads/         uploaded images (gitignored except .gitkeep)
src/
  Http/            Request, JsonResponse, Router, HttpException
  Controller/      DashboardController, ImageUploadController
  Domain/          Dashboard, Section, Element, ElementType
  Repository/      DashboardRepositoryInterface, PdoDashboardRepository
  Service/         DashboardService, LayoutValidator, HtmlSanitizer, ImageUploadService
  Infrastructure/  Config, DatabaseConnectionFactory
bootstrap.php      composition root (wires dependencies)
database/          schema.sql, seed.sql
tests/             PHPUnit tests (Unit/, Integration/)
scripts/           api-smoke-test.sh
```

## Data model

```sql
dashboards(id PK, name VARCHAR(120), created_at, updated_at)
sections(id PK, dashboard_id FK -> dashboards ON DELETE CASCADE, title VARCHAR(120),
         grid_column TINYINT, grid_row SMALLINT, column_span TINYINT, row_span SMALLINT, sort_order INT)
elements(id PK, section_id FK -> sections ON DELETE CASCADE,
         element_type ENUM('text','image','chart'),
         offset_x_percent DECIMAL(6,2), offset_y_percent DECIMAL(6,2),
         width_percent DECIMAL(6,2), height_percent DECIMAL(6,2), z_index INT,
         content JSON)
```

- Sections live on a 12-column grid: `grid_column` 1–12, `column_span` 1–12, `grid_column + column_span - 1 <= 12`;
  `grid_row` >= 1, `row_span` 1–200. Row unit = 10px on desktop.
- Elements are positioned in percent of their section (0–100), so they scale with the section.
- `content` by type:
  - text: `{ "html": string }` (sanitized; allowlist `p, div, br, b, strong, i, em, span[style=font-size]`)
  - image: `{ "imageUrl": string, "altText": string }` (`imageUrl` must start with `/uploads/` or `https://`)
  - chart: `{ "chartType": "bar"|"line", "title": string, "labels": string[], "values": number[] }`
    (`labels.length == values.length`, 1–24 points)

## HTTP API

All responses are JSON. Errors use `{ "error": { "code": string, "message": string, "details": object } }`.

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | `/api/dashboards` | list `{id, name, updatedAt}` | 200 |
| POST | `/api/dashboards` | create `{name}` | 201 + dashboard |
| GET | `/api/dashboards/{id}` | full layout tree | 200 |
| PUT | `/api/dashboards/{id}/layout` | replace name + sections + elements atomically (single transaction) | 200 + saved tree |
| POST | `/api/images` | multipart `image` field; PNG/JPEG/GIF/WEBP by `finfo` MIME, max 5 MB, random filename | 201 `{imageUrl}` |

Error codes: `not_found` (404), `validation_failed` (422, `details` maps field path to message, e.g.
`sections.0.elements.2.content.values`), `invalid_json` (400), `method_not_allowed` (405), `internal_error` (500, generic message, real error logged).

Layout JSON (request and response):

```json
{
  "id": 1, "name": "Sales Overview",
  "sections": [
    { "id": 10, "title": "Revenue", "gridColumn": 1, "gridRow": 1, "columnSpan": 8, "rowSpan": 30,
      "elements": [
        { "id": 100, "elementType": "chart", "offsetXPercent": 2, "offsetYPercent": 5,
          "widthPercent": 96, "heightPercent": 90, "zIndex": 1,
          "content": { "chartType": "bar", "title": "Monthly revenue", "labels": ["Jan"], "values": [120] } }
      ] }
  ]
}
```

Section/element ids in a PUT are ignored; the server re-inserts and returns new ids (replace semantics keep
the save path simple and atomic). `sort_order` follows array order.

## Backend design (SOLID)

- `Router` maps method + path pattern to a callable; controllers stay thin (parse request, call service, return `JsonResponse`).
- `DashboardService` depends on `DashboardRepositoryInterface`, `LayoutValidator`, `HtmlSanitizer` (constructor injection).
- `LayoutValidator` returns an error map; service throws `ValidationException` (422) if non-empty.
- `PdoDashboardRepository` owns all SQL; `replaceLayout` runs delete + inserts in one transaction.
- Domain objects are immutable readonly classes with `fromArray` / `toArray`.
- `ImageUploadService` validates size + MIME via `finfo`, stores under `public/uploads/`, returns URL.
- `Config` reads `.env` (DB host/port/name/user/password); `.env.example` committed.
- Front controller catches `HttpException` and `Throwable` and renders the error envelope.

## Frontend design

Modules under `public/assets/js/`:

- `api/DashboardApiClient.js` — fetch wrapper, throws `ApiError` with server error payload.
- `state/LayoutStore.js` — single source of truth; methods `addSection`, `updateSection`, `removeSection`,
  `addElement`, `updateElement`, `removeElement`, `selectElement`; emits `change` events.
- `canvas/DashboardCanvas.js` — renders sections into a CSS grid (12 columns, 10px rows).
- `canvas/SectionView.js` — section frame, title, delete button, element layer.
- `elements/ElementRendererRegistry.js` — maps `elementType` to renderer; renderers implement
  `render(container, element, context)` and `destroy()`. New element type = new renderer + registration.
- `elements/TextElementRenderer.js` — `contenteditable`, saves sanitized-on-server HTML on input.
- `elements/ImageElementRenderer.js` — shows image; empty state opens file picker, uploads via API.
- `elements/ChartElementRenderer.js` — Chart.js bar/line; double-click opens `ChartEditorDialog`.
- `interaction/DragResizeController.js` — interact.js; sections snap to grid cells, elements move/resize in
  percent within section bounds.
- `ui/Toolbar.js` — dashboard picker, new dashboard, add section, add text/image/chart (into selected
  section), save button + save status.
- `ui/RichTextToolbar.js` — bold, italic, font-size select for the focused text element.
- `ui/ChartEditorDialog.js` — chart type toggle, title, labels/values editing, "Generate random data".
- `ui/Notifier.js` — toast messages for errors/success.
- `persistence/AutosaveScheduler.js` — debounced (1.5 s) save on store changes; status: Saved / Saving / Unsaved / Error.
- `app.js` — composition root.

Dynamic graph: chart data generated in the browser by `DummyDataGenerator` (random series, month labels) on
"Generate random data" and when a new chart is added.

Responsive: desktop editing on the 12-column grid. Below 768px sections stack full-width in reading order
(grid row, then column) and drag/resize is disabled.

## Testing

- Unit: `LayoutValidator` (valid layout, grid bounds, percent bounds, chart label/value mismatch, bad type),
  `HtmlSanitizer` (strips script/attrs, keeps allowed font-size), `DashboardService` with an in-memory repository,
  `ImageUploadService` (rejects oversize and non-image).
- Integration: `PdoDashboardRepository` against `dashboard_builder_test` (create, replace layout, find).
- `scripts/api-smoke-test.sh`: create dashboard, PUT layout, GET and compare, 404 + 422 cases.
- Manual browser check of drag, resize, text formatting, image upload, chart edit, reload persistence.

## Error handling

- Backend: validation 422 with field paths; unknown routes 404; generic 500 with server-side `error_log`.
- Frontend: `ApiError` surfaced through `Notifier`; autosave shows Error state and retries on next change.
