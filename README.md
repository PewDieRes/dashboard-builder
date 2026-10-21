# Dashboard Builder

A drag-and-drop dashboard builder in the spirit of Canva / Figma blocks, built on a LAMP stack.
Add **sections** to a 12-column dashboard grid, then place **rich text**, **images** and **charts** inside them.
Every section and element can be moved and resized. The full layout (position, size and content) is stored in
MySQL and restored on reload.

**Live demo:** https://dashboard-builder-wxns.onrender.com (free tier: the first load after idle can take up to a minute)

## Features

- Sections: add, drag (by the header), resize, rename, delete. Snap to a 12-column grid.
- Rich text element: bold, italic and font size, edited in place.
- Image element: upload (PNG, JPEG, GIF, WEBP up to 5 MB) and replace.
- Chart element: bar or line (Chart.js), editable title, labels and values, plus **Generate random data** for a
  dynamically generated graph. New charts start with generated data.
- Every element is draggable and resizable inside its section (positions stored as percentages, so elements scale with the section).
- Autosave (debounced, never overlapping) with a save status indicator and a manual Save button.
- Multiple dashboards: switch between them or create new ones; the open dashboard is kept in the URL (`?dashboard=1`).
- Responsive: desktop editing; below 768px sections stack vertically in reading order and editing is disabled.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | PHP 8.3 (no framework), PDO, Composer PSR-4 autoload |
| Database | MySQL 8 / MariaDB 10.6+ |
| Frontend | Vanilla ES modules (no build step), interact.js 1.10.27, Chart.js 4.4.1 |
| Tests | PHPUnit 11 (unit + integration), bash API smoke test |

## Quick start (local PHP + MySQL)

Requirements: PHP 8.3 with `pdo_mysql`, `fileinfo`, `mbstring`, `dom`; Composer; MySQL 8 or MariaDB.

```bash
# 1. Install dependencies
composer install

# 2. Create the database and an application user (adjust root credentials as needed)
mysql -uroot -p -e "
  CREATE DATABASE dashboard_builder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE DATABASE dashboard_builder_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'dashboard_app'@'localhost' IDENTIFIED BY 'dashboard_app_password';
  GRANT ALL ON dashboard_builder.* TO 'dashboard_app'@'localhost';
  GRANT ALL ON dashboard_builder_test.* TO 'dashboard_app'@'localhost';"

# 3. Load the schema and the sample dashboard
mysql -udashboard_app -pdashboard_app_password dashboard_builder < database/schema.sql
mysql -udashboard_app -pdashboard_app_password dashboard_builder < database/seed.sql

# 4. Configure
cp .env.example .env

# 5. Run
php -d upload_max_filesize=5M -d post_max_size=8M -S 127.0.0.1:8080 -t public public/index.php
```

Open http://127.0.0.1:8080 — the seeded "Sales Overview" dashboard loads.

On Apache, point the document root at `public/`; `public/.htaccess` routes everything that is not a file to `public/index.php`.

## Quick start (Docker)

```bash
docker compose up --build
```

Open http://127.0.0.1:8080. MySQL is exposed on port 3307 and is initialised with `database/schema.sql` and `database/seed.sql`.

## Deploy for free (Render + Aiven MySQL)

1. Create a free MySQL service on [Aiven](https://console.aiven.io) and note host, port, user, password, database
   name and the CA certificate.
2. On [Render](https://dashboard.render.com), choose **New > Blueprint** and select this repository. Render reads
   `render.yaml` and asks for `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` and `DB_SSL_CA`
   (paste the full PEM certificate, including the `BEGIN`/`END` lines).
3. On first boot the container runs `scripts/install-database.php`, which creates the schema and sample dashboard
   when the database is empty, then starts Apache on Render's `PORT`.

Free-tier notes: the Render service sleeps after 15 minutes idle (the first request takes up to a minute), and
uploaded images live on the container disk, so they are lost on redeploy.

## Using the builder

1. **Add section** places a new section below the existing ones. Drag it by its header; resize from its right or bottom edge.
2. Click a section to select it, then use **Add text**, **Add image** or **Add chart**.
3. Drag an element by its handle (the ☰ pill that appears on hover, top-left); resize from any edge or corner.
4. Text: click into the text and type. Select some text, then use the formatting bar that appears while the
   text is focused: **B** (bold), **I** (italic) or the **Size** dropdown (font size).
5. Image: **Replace** uploads a new image.
6. Chart: **Edit chart** (or double-click) to change type, title and data, or press **Generate random data**.
7. Changes save automatically; reload the page to see the layout restored from MySQL.

## API

All responses are JSON. Errors use `{ "error": { "code", "message", "details" } }`.

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | `/api/dashboards` | List dashboards `{ dashboards: [{ id, name, updatedAt }] }` | 200 |
| POST | `/api/dashboards` | Create `{ name }` | 201 |
| GET | `/api/dashboards/{id}` | Full layout tree | 200 |
| PUT | `/api/dashboards/{id}/layout` | Replace name, sections and elements atomically | 200 |
| POST | `/api/images` | Multipart upload, field `image` | 201 `{ imageUrl }` |

Error codes: `invalid_json` (400), `not_found` (404), `method_not_allowed` (405), `validation_failed` (422, `details` maps
field paths such as `sections.0.elements.2.content.values` to messages), `internal_error` (500).

Example layout payload:

```json
{
  "name": "Sales Overview",
  "sections": [
    {
      "title": "Revenue", "gridColumn": 1, "gridRow": 1, "columnSpan": 8, "rowSpan": 30,
      "elements": [
        {
          "elementType": "chart", "offsetXPercent": 2, "offsetYPercent": 5,
          "widthPercent": 96, "heightPercent": 90, "zIndex": 1,
          "content": { "chartType": "bar", "title": "Monthly revenue", "labels": ["Jan", "Feb"], "values": [120, 150] }
        }
      ]
    }
  ]
}
```

## Database

- `database/schema.sql` — tables `dashboards`, `sections`, `elements` (cascade deletes; element `content` is a validated JSON column).
- `database/seed.sql` — a sample "Sales Overview" dashboard with a rich text block, a bar chart, a line chart and an image.

## Project structure

```
public/                 web root
  index.php             front controller (/api/* to the router, everything else to index.html)
  index.html, assets/   frontend (ES modules, CSS, sample image)
  uploads/              uploaded images
src/
  Http/                 Request, JsonResponse, Router, exceptions, ApiErrorHandler
  Controller/           DashboardController, ImageUploadController
  Domain/               Dashboard, Section, Element, ElementType, DashboardSummary
  Repository/           DashboardRepositoryInterface, PdoDashboardRepository
  Service/              DashboardService, LayoutValidator, HtmlSanitizer, ImageUploadService
  Infrastructure/       Config, DatabaseConnectionFactory
bootstrap.php           composition root (wires dependencies and routes)
database/               schema and seed data
tests/                  PHPUnit unit and integration tests
scripts/                API smoke test
docker/, docker-compose.yml
```

## Design decisions

- **Replace-layout saves.** `PUT /layout` replaces the whole section/element tree inside one transaction. Saves are atomic and the API stays small; the frontend keeps its own client ids, so a save never re-renders the canvas.
- **Responsive geometry.** Sections are placed on a 12-column grid (column, span, row, row span); elements are stored as percentages of their section. Layouts scale with the viewport without per-breakpoint data.
- **Open/closed element types.** The frontend `ElementRendererRegistry` maps an element type to a renderer. Adding a new element type means a new renderer and a validator rule, without touching the canvas.
- **Dependency inversion.** Controllers depend on services; `DashboardService` depends on `DashboardRepositoryInterface`, so the unit tests run against an in-memory repository.
- **Security.** Rich text HTML is sanitised server-side against an allowlist (only `font-size` styles survive). Uploads are checked by real MIME type (`finfo`) and size and get random file names. All SQL uses prepared statements. Unexpected errors return a generic 500 and are logged server-side.

## Tests

```bash
vendor/bin/phpunit                 # unit + integration (integration uses dashboard_builder_test)
vendor/bin/phpunit --testsuite Unit

# API smoke test against a running server
php -d upload_max_filesize=5M -d post_max_size=8M -S 127.0.0.1:8080 -t public public/index.php &
bash scripts/api-smoke-test.sh

# Browser end-to-end tests (Playwright, uses the installed Google Chrome) against a running server
npm install
npm run test:e2e
```

The end-to-end suite covers adding, moving, resizing, renaming and deleting sections; adding, moving, resizing and
deleting elements; rich text formatting; image upload and rejection; chart editing and random data; creating and
switching dashboards; and the stacked phone layout. Every test also fails on any uncaught error in the page.
