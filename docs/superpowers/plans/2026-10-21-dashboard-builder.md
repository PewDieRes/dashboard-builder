# Dashboard Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LAMP dashboard builder: sections + draggable/resizable text, image and chart elements, layout persisted in MySQL via PHP JSON API.

**Architecture:** Framework-free PHP 8.3 backend (front controller, router, thin controllers, service + validator, PDO repository behind an interface, composition root in `bootstrap.php`). Vanilla ES-module frontend (store + views + renderer registry + interact.js + Chart.js), served from `public/` by the same PHP process.

**Tech Stack:** PHP 8.3, MariaDB/MySQL, Composer (PSR-4, PHPUnit 11), interact.js 1.10.27, Chart.js 4.4.1.

**Spec:** `docs/superpowers/specs/2026-10-21-dashboard-builder-design.md`

## Global Constraints

- Root namespace `DashboardBuilder\` mapped to `src/`; tests namespace `DashboardBuilder\Tests\` mapped to `tests/`.
- Every PHP file starts with `declare(strict_types=1);`. PSR-12 formatting. Classes `final` unless designed for extension; value objects `final readonly`.
- **No single-character or cryptic identifiers anywhere** (PHP or JS), including loop counters and callbacks: `$index`, `$sectionIndex`, `element =>`, `event =>`, never `$i`, `$e`, `e =>`, `x`, `cb`.
- API JSON keys camelCase; DB columns snake_case. Mapping only inside repository / domain `fromArray`/`toArray`.
- JS: ES2022 modules, one class per file, named exports, no globals except CDN `window.interact` and `window.Chart`. CDN URLs exactly:
  - `https://cdn.jsdelivr.net/npm/interactjs@1.10.27/dist/interact.min.js`
  - `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js`
- Comments only where intent is not obvious from names. No dead code, no `console.log` left behind.
- Tooling paths (Git Bash):
  - `PHP="/c/Users/vazem/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe"`
  - `COMPOSER="/c/Users/vazem/tools/composer.phar"` (run as `"$PHP" "$COMPOSER" ...`)
  - `MARIADB="/c/Program Files/MariaDB 13.0/bin/mariadb.exe"`
  - DB running on `127.0.0.1:3306`. App user `dashboard_app` / `dashboard_app_password`. Databases `dashboard_builder`, `dashboard_builder_test` already exist.
- Commits: Conventional Commits, one per feature step listed. Two agents share the working tree, so ALWAYS commit only your own paths: `git add <paths> && git commit -m "<message>" -- <paths>`. Retry once after 2 s if `index.lock` exists. Every message ends with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push, never amend, never rewrite history.
- Image URLs accepted by validator: start with `/uploads/`, `/assets/images/`, or `https://`.

## Review Focus

1. Text HTML containing `<script>`, `onclick=`, `style="position:fixed"` is saved: server strips all except allowed tags and `font-size` style (HtmlSanitizer test in Task 2).
2. Element dragged/resized past section edge: frontend clamps to 0–100 percent and `offset + size <= 100`; server rejects out-of-range with 422 (validator test in Task 2).
3. Non-image file renamed `.png` uploaded: 422 `validation_failed` via `finfo` (ImageUploadService test in Task 4).
4. Malformed JSON body on PUT: 400 `invalid_json`, not 500 (Request test in Task 1).
5. Rapid edits while a save is in flight: AutosaveScheduler never runs two saves at once; it runs one more save after the in-flight one finishes if changes arrived (Task 5 manual check + code structure).

---

## BACKEND TRACK (Tasks 1–4, one agent, sequential)

### Task 1: Scaffold, database schema, HTTP layer

**Files:**
- Create: `composer.json`, `phpunit.xml`, `.gitignore`, `.env.example`, `bootstrap.php`, `public/index.php`
- Create: `src/Infrastructure/Config.php`, `src/Infrastructure/DatabaseConnectionFactory.php`
- Create: `src/Http/Request.php`, `src/Http/JsonResponse.php`, `src/Http/Router.php`, `src/Http/HttpException.php`, `src/Http/NotFoundException.php`, `src/Http/ValidationException.php`, `src/Http/ApiErrorHandler.php`
- Create: `database/schema.sql`, `database/seed.sql`, `public/assets/images/sample-banner.svg`, `public/uploads/.gitkeep`
- Test: `tests/Unit/Http/RouterTest.php`, `tests/Unit/Http/RequestTest.php`

**Interfaces (Produces):**
- `HttpException extends \RuntimeException`: `__construct(int $statusCode, string $errorCode, string $message, array $details = [])`, `statusCode(): int`, `errorCode(): string`, `details(): array`.
- `NotFoundException extends HttpException`: `__construct(string $message = 'Resource not found')` → 404 `not_found`.
- `ValidationException extends HttpException`: `__construct(array $fieldErrors)` → 422 `validation_failed`, message `'The submitted data is invalid'`, details = field errors.
- `Request`: `__construct(string $method, string $path, ?string $rawBody = null, array $uploadedFiles = [])`; `static fromGlobals(): self`; `method(): string`; `path(): string` (no query string, no trailing slash except `/`); `jsonBody(): array` (empty body → `[]`; invalid JSON or non-object → `HttpException(400, 'invalid_json', 'Request body must be a valid JSON object')`); `uploadedFile(string $fieldName): ?array`.
- `JsonResponse`: `__construct(array $payload, int $statusCode = 200)`; `payload(): array`; `statusCode(): int`; `send(): void` (sets `Content-Type: application/json; charset=utf-8`, `JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR`).
- `Router`: `addRoute(string $method, string $pathPattern, callable $handler): void` — pattern placeholders `{id}` match `\d+`; `dispatch(Request $request): JsonResponse` — handler called as `$handler($request, $routeParameters)` where `$routeParameters` is `['id' => '12']`. No path match → `NotFoundException`. Path matches but method doesn't → `HttpException(405, 'method_not_allowed', 'Method not allowed')`.
- `ApiErrorHandler`: `handle(\Throwable $throwable): JsonResponse` — `HttpException` → its status + `{"error":{"code","message","details"}}` (details as `{}` object when empty: use `(object) []`); anything else → `error_log` + 500 `internal_error` `'An unexpected error occurred'`.
- `Config`: `static fromEnvironmentFile(string $filePath): self` — parses `KEY=VALUE` lines (ignore blanks and `#`), real environment variables (`getenv`) override file values; missing file allowed. Getters: `databaseHost()`, `databasePort(): int`, `databaseName()`, `databaseUser()`, `databasePassword()`, `uploadDirectory()` (default `<project>/public/uploads`).
- `DatabaseConnectionFactory`: `static create(Config $config): \PDO` — DSN `mysql:host=..;port=..;dbname=..;charset=utf8mb4`, `ERRMODE_EXCEPTION`, `DEFAULT_FETCH_MODE => FETCH_ASSOC`, `EMULATE_PREPARES => false`.
- `bootstrap.php`: `return function (): Router { ... }` composition root. In this task it only builds Router with no routes; Task 4 adds routes.
- `public/index.php`: if `PHP_SAPI === 'cli-server'` and the requested path is an existing file under `public/` → `return false`. If path starts with `/api/` → build router via bootstrap, dispatch inside `try`, on throwable use `ApiErrorHandler`, `send()`. Otherwise `readfile(__DIR__ . '/index.html')` with `Content-Type: text/html`.

- [ ] **Step 1: composer.json + install**

```json
{
  "name": "pewdieres/dashboard-builder",
  "description": "Drag-and-drop dashboard builder on PHP + MySQL",
  "type": "project",
  "license": "MIT",
  "require": { "php": ">=8.3", "ext-pdo": "*", "ext-fileinfo": "*", "ext-dom": "*", "ext-json": "*" },
  "require-dev": { "phpunit/phpunit": "^11.0" },
  "autoload": { "psr-4": { "DashboardBuilder\\": "src/" } },
  "autoload-dev": { "psr-4": { "DashboardBuilder\\Tests\\": "tests/" } },
  "scripts": { "test": "phpunit", "serve": "php -S 127.0.0.1:8080 -t public public/index.php" }
}
```

Run: `"$PHP" "$COMPOSER" install`. `.gitignore`: `/vendor/`, `.env`, `public/uploads/*`, `!public/uploads/.gitkeep`, `.phpunit.cache/`.
`.env.example`: `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_NAME=dashboard_builder`, `DB_USER=dashboard_app`, `DB_PASSWORD=dashboard_app_password`. Copy to `.env` locally.
`phpunit.xml`: bootstrap `vendor/autoload.php`, testsuites `Unit` (`tests/Unit`) and `Integration` (`tests/Integration`), `<php><env name="DB_NAME" value="dashboard_builder_test" force="true"/></php>`, cacheDirectory `.phpunit.cache`.

Commit: `chore: scaffold composer project with phpunit and env config` (composer.json, composer.lock, phpunit.xml, .gitignore, .env.example)

- [ ] **Step 2: Schema + seed**

`database/schema.sql`: `DROP TABLE IF EXISTS elements, sections, dashboards;` then the three tables from spec, InnoDB, utf8mb4, `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`, indexes `idx_sections_dashboard (dashboard_id, sort_order)`, `idx_elements_section (section_id)`, `CHECK (JSON_VALID(content))`.
`database/seed.sql`: dashboard 1 "Sales Overview" with sections:
1. "Highlights" (col 1, row 1, span 4×28): text element `<p><b>Q3 revenue up 18%</b></p><p><i>Driven by enterprise renewals.</i></p><p><span style="font-size: 20px">142 new customers</span></p>`.
2. "Monthly Revenue" (col 5, row 1, span 8×28): bar chart, labels Jan–Jun, values `[120, 150, 170, 140, 190, 210]`.
3. "Site Traffic" (col 1, row 29, span 7×28): line chart, labels Mon–Sun, values `[820, 932, 901, 934, 1290, 1330, 1320]`.
4. "Brand" (col 8, row 29, span 5×28): image `/assets/images/sample-banner.svg`, alt "Sample brand banner".
`sample-banner.svg`: simple 600×300 gradient rectangle with text "Dashboard Builder".

Verify: `"$MARIADB" -udashboard_app -pdashboard_app_password dashboard_builder < database/schema.sql && "$MARIADB" -udashboard_app -pdashboard_app_password dashboard_builder < database/seed.sql && "$MARIADB" -udashboard_app -pdashboard_app_password dashboard_builder -e "SELECT COUNT(*) FROM elements"` → 4.

Commit: `feat(database): add schema and sample dashboard seed` (database/, public/assets/images/sample-banner.svg, public/uploads/.gitkeep)

- [ ] **Step 3: Failing HTTP tests**

```php
// tests/Unit/Http/RouterTest.php
final class RouterTest extends TestCase
{
    public function testDispatchesToMatchingRouteWithParameters(): void
    {
        $router = new Router();
        $router->addRoute('GET', '/api/dashboards/{id}', fn (Request $request, array $routeParameters) => new JsonResponse(['id' => (int) $routeParameters['id']]));
        $response = $router->dispatch(new Request('GET', '/api/dashboards/42'));
        self::assertSame(['id' => 42], $response->payload());
    }

    public function testUnknownPathThrowsNotFound(): void
    {
        $this->expectException(NotFoundException::class);
        (new Router())->dispatch(new Request('GET', '/api/missing'));
    }

    public function testWrongMethodThrowsMethodNotAllowed(): void
    {
        $router = new Router();
        $router->addRoute('GET', '/api/dashboards', fn () => new JsonResponse([]));
        try {
            $router->dispatch(new Request('DELETE', '/api/dashboards'));
            self::fail('Expected HttpException');
        } catch (HttpException $exception) {
            self::assertSame(405, $exception->statusCode());
            self::assertSame('method_not_allowed', $exception->errorCode());
        }
    }

    public function testNonNumericIdDoesNotMatch(): void
    {
        $router = new Router();
        $router->addRoute('GET', '/api/dashboards/{id}', fn () => new JsonResponse([]));
        $this->expectException(NotFoundException::class);
        $router->dispatch(new Request('GET', '/api/dashboards/abc'));
    }
}

// tests/Unit/Http/RequestTest.php
final class RequestTest extends TestCase
{
    public function testParsesJsonObjectBody(): void
    {
        self::assertSame(['name' => 'Sales'], (new Request('POST', '/api/dashboards', '{"name":"Sales"}'))->jsonBody());
    }

    public function testEmptyBodyIsEmptyArray(): void
    {
        self::assertSame([], (new Request('POST', '/api/dashboards', ''))->jsonBody());
    }

    public function testMalformedJsonThrowsInvalidJson(): void
    {
        try {
            (new Request('PUT', '/api/dashboards/1/layout', '{"name":'))->jsonBody();
            self::fail('Expected HttpException');
        } catch (HttpException $exception) {
            self::assertSame(400, $exception->statusCode());
            self::assertSame('invalid_json', $exception->errorCode());
        }
    }

    public function testJsonScalarThrowsInvalidJson(): void
    {
        $this->expectException(HttpException::class);
        (new Request('PUT', '/api/dashboards/1/layout', '"text"'))->jsonBody();
    }
}
```

Run: `"$PHP" vendor/bin/phpunit --testsuite Unit` → FAIL (classes missing).

- [ ] **Step 4: Implement HTTP + Infrastructure classes, bootstrap.php, public/index.php per Interfaces.** Also `ApiErrorHandlerTest`: HttpException maps to status/code/details; `new \RuntimeException('db down')` maps to 500 `internal_error` with message not containing `db down`.

- [ ] **Step 5: Run** `"$PHP" vendor/bin/phpunit --testsuite Unit` → PASS. Run `"$PHP" -S 127.0.0.1:8080 -t public public/index.php` in background; `curl -s localhost:8080/api/nothing` → `{"error":{"code":"not_found",...}}` with 404. Stop server.

Commit: `feat(http): add router, request, json responses and api error handling` (src/Http, src/Infrastructure, bootstrap.php, public/index.php, tests/Unit/Http)

---

### Task 2: Domain model, layout validator, HTML sanitizer

**Files:**
- Create: `src/Domain/ElementType.php`, `src/Domain/Element.php`, `src/Domain/Section.php`, `src/Domain/Dashboard.php`, `src/Domain/DashboardSummary.php`
- Create: `src/Service/LayoutValidator.php`, `src/Service/HtmlSanitizer.php`
- Test: `tests/Unit/Domain/DashboardTest.php`, `tests/Unit/Service/LayoutValidatorTest.php`, `tests/Unit/Service/HtmlSanitizerTest.php`

**Interfaces (Produces):**
- `enum ElementType: string { case Text = 'text'; case Image = 'image'; case Chart = 'chart'; }`
- `final readonly class Element(?int $id, ElementType $elementType, float $offsetXPercent, float $offsetYPercent, float $widthPercent, float $heightPercent, int $zIndex, array $content)`; `static fromArray(array $data): self` (camelCase keys, `id` optional); `toArray(): array` (keys `id, elementType, offsetXPercent, offsetYPercent, widthPercent, heightPercent, zIndex, content`); `withContent(array $content): self`.
- `final readonly class Section(?int $id, string $title, int $gridColumn, int $gridRow, int $columnSpan, int $rowSpan, array $elements)` (`list<Element>`); `fromArray`, `toArray` (`elements` key), `withElements(array $elements): self`.
- `final readonly class Dashboard(?int $id, string $name, array $sections, ?string $updatedAt = null)`; `fromArray`, `toArray` (keys `id, name, updatedAt, sections`), `withSections(array $sections): self`, `withId(int $id): self`.
- `final readonly class DashboardSummary(int $id, string $name, string $updatedAt)`; `toArray()`.
- `LayoutValidator::validate(array $layoutPayload): array` → `array<string, string>` path => message; empty = valid. Validates the raw decoded array (wrong types become errors, never TypeErrors). Rules:
  - `name`: string, trimmed length 1–120.
  - `sections`: list, max 50. Each: `title` string ≤120; `gridColumn` int 1–12; `columnSpan` int 1–12; `gridColumn + columnSpan - 1 <= 12` (error on `columnSpan`); `gridRow` int ≥1; `rowSpan` int 1–200; `elements` list, max 50.
  - Element: `elementType` one of enum values; `offsetXPercent`, `offsetYPercent` number 0–100; `widthPercent`, `heightPercent` number >0 and ≤100; `offsetXPercent + widthPercent <= 100.01` (error on `widthPercent`), same for Y/height; `zIndex` int 0–1000; `content` array; per type:
    - text: `content.html` string ≤ 20000 chars.
    - image: `content.imageUrl` string with allowed prefix (Global Constraints); `content.altText` string ≤ 200.
    - chart: `content.chartType` in `bar|line`; `content.title` string ≤ 120; `content.labels` list of strings, `content.values` list of numbers; equal lengths (error on `content.values`); 1–24 points.
  - Paths: `name`, `sections`, `sections.{sectionIndex}.gridColumn`, `sections.{sectionIndex}.elements.{elementIndex}.content.values`, etc.
  - Also `validateDashboardName(array $payload): array` used for create.
- `HtmlSanitizer::sanitize(string $html): string` — parse with `DOMDocument` (`LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD`, UTF-8 via `<?xml encoding="utf-8">` prefix, wrapped in a `<div>` root), walk tree: allowed tags `p, div, br, b, strong, i, em, span`; disallowed element with text (e.g. `<u>`, `<a>`) is unwrapped (children kept); `script`, `style`, `iframe`, `object` removed with contents; all attributes removed except `style` on `span` reduced to `font-size: <n>px` with n 8–72 integer (otherwise style removed). Return inner HTML of root.

- [ ] **Step 1: Failing tests**

```php
// tests/Unit/Service/LayoutValidatorTest.php
final class LayoutValidatorTest extends TestCase
{
    private LayoutValidator $layoutValidator;

    protected function setUp(): void
    {
        $this->layoutValidator = new LayoutValidator();
    }

    public static function validLayout(): array
    {
        return [
            'name' => 'Sales Overview',
            'sections' => [[
                'title' => 'Revenue', 'gridColumn' => 1, 'gridRow' => 1, 'columnSpan' => 8, 'rowSpan' => 30,
                'elements' => [
                    ['elementType' => 'chart', 'offsetXPercent' => 0, 'offsetYPercent' => 0, 'widthPercent' => 100, 'heightPercent' => 100, 'zIndex' => 1,
                     'content' => ['chartType' => 'bar', 'title' => 'Revenue', 'labels' => ['Jan', 'Feb'], 'values' => [10, 20.5]]],
                    ['elementType' => 'text', 'offsetXPercent' => 10, 'offsetYPercent' => 10, 'widthPercent' => 50, 'heightPercent' => 20, 'zIndex' => 2,
                     'content' => ['html' => '<p>Hello</p>']],
                    ['elementType' => 'image', 'offsetXPercent' => 0, 'offsetYPercent' => 50, 'widthPercent' => 40, 'heightPercent' => 50, 'zIndex' => 3,
                     'content' => ['imageUrl' => '/uploads/abc.png', 'altText' => 'Logo']],
                ],
            ]],
        ];
    }

    public function testValidLayoutHasNoErrors(): void
    {
        self::assertSame([], $this->layoutValidator->validate(self::validLayout()));
    }

    public function testMissingNameIsReported(): void
    {
        $layout = self::validLayout();
        $layout['name'] = '   ';
        self::assertArrayHasKey('name', $this->layoutValidator->validate($layout));
    }

    public function testSectionOverflowingGridIsReported(): void
    {
        $layout = self::validLayout();
        $layout['sections'][0]['gridColumn'] = 6;
        $layout['sections'][0]['columnSpan'] = 8;
        self::assertArrayHasKey('sections.0.columnSpan', $this->layoutValidator->validate($layout));
    }

    public function testElementOutsideSectionIsReported(): void
    {
        $layout = self::validLayout();
        $layout['sections'][0]['elements'][1]['offsetXPercent'] = 70;
        self::assertArrayHasKey('sections.0.elements.1.widthPercent', $this->layoutValidator->validate($layout));
    }

    public function testNegativeOffsetIsReported(): void
    {
        $layout = self::validLayout();
        $layout['sections'][0]['elements'][1]['offsetYPercent'] = -5;
        self::assertArrayHasKey('sections.0.elements.1.offsetYPercent', $this->layoutValidator->validate($layout));
    }

    public function testChartLabelValueMismatchIsReported(): void
    {
        $layout = self::validLayout();
        $layout['sections'][0]['elements'][0]['content']['values'] = [1];
        self::assertArrayHasKey('sections.0.elements.0.content.values', $this->layoutValidator->validate($layout));
    }

    public function testUnknownElementTypeIsReported(): void
    {
        $layout = self::validLayout();
        $layout['sections'][0]['elements'][0]['elementType'] = 'video';
        self::assertArrayHasKey('sections.0.elements.0.elementType', $this->layoutValidator->validate($layout));
    }

    public function testExternalHttpImageUrlIsRejected(): void
    {
        $layout = self::validLayout();
        $layout['sections'][0]['elements'][2]['content']['imageUrl'] = 'javascript:alert(1)';
        self::assertArrayHasKey('sections.0.elements.2.content.imageUrl', $this->layoutValidator->validate($layout));
    }

    public function testWrongTypesProduceErrorsInsteadOfExceptions(): void
    {
        $errors = $this->layoutValidator->validate(['name' => 42, 'sections' => 'nope']);
        self::assertArrayHasKey('name', $errors);
        self::assertArrayHasKey('sections', $errors);
    }
}

// tests/Unit/Service/HtmlSanitizerTest.php
final class HtmlSanitizerTest extends TestCase
{
    private HtmlSanitizer $htmlSanitizer;

    protected function setUp(): void
    {
        $this->htmlSanitizer = new HtmlSanitizer();
    }

    public function testKeepsAllowedFormatting(): void
    {
        $html = '<p><b>Bold</b> <i>italic</i> <span style="font-size: 24px">big</span></p>';
        self::assertSame($html, $this->htmlSanitizer->sanitize($html));
    }

    public function testRemovesScriptsAndEventHandlers(): void
    {
        $sanitized = $this->htmlSanitizer->sanitize('<p onclick="steal()">Hi<script>alert(1)</script></p>');
        self::assertSame('<p>Hi</p>', $sanitized);
    }

    public function testStripsDangerousStylesButKeepsFontSize(): void
    {
        $sanitized = $this->htmlSanitizer->sanitize('<span style="position: fixed; font-size: 18px">x</span>');
        self::assertSame('<span style="font-size: 18px">x</span>', $sanitized);
    }

    public function testUnwrapsDisallowedTagsKeepingText(): void
    {
        self::assertSame('<p>link text</p>', $this->htmlSanitizer->sanitize('<p><a href="https://evil">link text</a></p>'));
    }

    public function testKeepsUnicodeText(): void
    {
        self::assertSame('<p>Café ✓</p>', $this->htmlSanitizer->sanitize('<p>Café ✓</p>'));
    }
}
```

`DashboardTest`: `Dashboard::fromArray(LayoutValidatorTest::validLayout())->toArray()` round-trips names, numbers (floats) and content; `elementType` becomes enum `ElementType::Chart`.

- [ ] **Step 2: Run** `"$PHP" vendor/bin/phpunit --testsuite Unit` → FAIL.
- [ ] **Step 3: Implement** per Interfaces. Split `LayoutValidator` into small private methods (`validateSection`, `validateElement`, `validateTextContent`, `validateImageContent`, `validateChartContent`, numeric range helpers).
- [ ] **Step 4: Run** → PASS.

Commits:
- `feat(domain): add dashboard, section and element value objects` (src/Domain, tests/Unit/Domain)
- `feat(validation): validate layout payloads and sanitize rich text html` (src/Service/LayoutValidator.php, src/Service/HtmlSanitizer.php, tests/Unit/Service)

---

### Task 3: Repository and dashboard service

**Files:**
- Create: `src/Repository/DashboardRepositoryInterface.php`, `src/Repository/PdoDashboardRepository.php`, `src/Service/DashboardService.php`
- Test: `tests/Support/InMemoryDashboardRepository.php`, `tests/Unit/Service/DashboardServiceTest.php`, `tests/Integration/PdoDashboardRepositoryTest.php`

**Interfaces:**
- Consumes: Task 2 domain classes, `LayoutValidator`, `HtmlSanitizer`, `NotFoundException`, `ValidationException`, `Config`, `DatabaseConnectionFactory`.
- `DashboardRepositoryInterface`:
  - `findAllSummaries(): array` (`list<DashboardSummary>`, newest `updated_at` first)
  - `findById(int $dashboardId): ?Dashboard` (sections by `sort_order`, elements by `z_index` then id)
  - `create(string $name): Dashboard`
  - `replaceLayout(Dashboard $dashboard): Dashboard` — requires id; in a transaction: update name (and `updated_at = CURRENT_TIMESTAMP`), delete sections (cascade elements), insert sections in array order (`sort_order` = index) and elements, commit, return `findById`. Rollback and rethrow on failure.
  - `exists(int $dashboardId): bool`
- `DashboardService(DashboardRepositoryInterface $dashboardRepository, LayoutValidator $layoutValidator, HtmlSanitizer $htmlSanitizer)`:
  - `listDashboards(): array` (`list<DashboardSummary>`)
  - `getDashboard(int $dashboardId): Dashboard` (throws `NotFoundException('Dashboard not found')`)
  - `createDashboard(array $payload): Dashboard` (validates name via `validateDashboardName`, trims)
  - `saveLayout(int $dashboardId, array $layoutPayload): Dashboard` — not exists → NotFound; validate → `ValidationException`; hydrate `Dashboard::fromArray`; sanitize every text element's `content.html`; set id; `replaceLayout`.

- [ ] **Step 1: Failing tests.** `InMemoryDashboardRepository implements DashboardRepositoryInterface` (array storage, auto-increment ids, assigns ids to sections/elements on replace). `DashboardServiceTest`:
  - `testSaveLayoutSanitizesTextHtml`: create, save layout whose text html is `<p>Hi<script>x</script></p>`, returned text content html === `<p>Hi</p>`.
  - `testSaveLayoutRejectsInvalidPayload`: expect `ValidationException`, `details()` has `sections.0.gridColumn` when gridColumn = 0.
  - `testSaveLayoutForMissingDashboardThrowsNotFound`.
  - `testGetDashboardForMissingIdThrowsNotFound`.
  - `testCreateDashboardTrimsName`: `'  Ops  '` → `'Ops'`.
  - `testCreateDashboardRejectsEmptyName` → `ValidationException` with key `name`.
  `PdoDashboardRepositoryTest` (Integration): `setUp` creates PDO from `Config::fromEnvironmentFile(dirname(__DIR__, 2) . '/.env')` (phpunit forces `DB_NAME=dashboard_builder_test`), runs `database/schema.sql` (split on `;` at line end, skip empty). Tests: create returns id and empty sections; replaceLayout persists 1 section with 2 elements and `findById` returns equal geometry + content (floats compare with `assertEqualsWithDelta`); second replaceLayout with 0 sections leaves `SELECT COUNT(*) FROM elements` = 0; `findAllSummaries` contains created dashboard; `findById(999999)` null.
- [ ] **Step 2: Run** `"$PHP" vendor/bin/phpunit` → FAIL.
- [ ] **Step 3: Implement.** Repository: prepared statements only, `json_encode($content, JSON_THROW_ON_ERROR)` / `json_decode(..., true, 512, JSON_THROW_ON_ERROR)`, cast DECIMAL strings to float, private row-mapper methods `mapSectionRow`, `mapElementRow`. Load elements for all sections in one query (`WHERE section_id IN (...)`), not N+1.
- [ ] **Step 4: Run** `"$PHP" vendor/bin/phpunit` → PASS (Unit + Integration).

Commits:
- `feat(repository): persist dashboard layouts with pdo in a single transaction` (src/Repository, tests/Integration)
- `feat(service): add dashboard service with validation and sanitizing` (src/Service/DashboardService.php, tests/Support, tests/Unit/Service/DashboardServiceTest.php)

---

### Task 4: API controllers, image upload, smoke test

**Files:**
- Create: `src/Controller/DashboardController.php`, `src/Controller/ImageUploadController.php`, `src/Service/ImageUploadService.php`, `scripts/api-smoke-test.sh`
- Modify: `bootstrap.php` (wire routes)
- Test: `tests/Unit/Service/ImageUploadServiceTest.php`

**Interfaces:**
- `DashboardController(DashboardService $dashboardService)`: `list(Request $request, array $routeParameters): JsonResponse` → `{"dashboards":[summary...]}`; `show` → dashboard `toArray()`; `create` → 201 dashboard; `saveLayout` → 200 dashboard. Route id cast with `(int)`.
- `ImageUploadService(string $uploadDirectory, string $publicUrlPrefix = '/uploads/', int $maximumBytes = 5_242_880)`: `store(string $temporaryFilePath, int $fileSizeInBytes): string` returns public URL. Size > max → `ValidationException(['image' => 'Image must be 5 MB or smaller'])`; MIME from `(new \finfo(FILEINFO_MIME_TYPE))->file(...)` must map `image/png→png, image/jpeg→jpg, image/gif→gif, image/webp→webp` else `ValidationException(['image' => 'Only PNG, JPEG, GIF or WEBP images are allowed'])`. Filename `bin2hex(random_bytes(16)) . '.' . $extension`; `copy()` into upload directory (create if missing).
- `ImageUploadController(ImageUploadService $imageUploadService)`: `upload(Request $request, array $routeParameters): JsonResponse` — missing file or `error !== UPLOAD_ERR_OK` → `ValidationException(['image' => 'Please choose an image to upload'])` (`UPLOAD_ERR_INI_SIZE`/`FORM_SIZE` → size message); require `is_uploaded_file($file['tmp_name'])`; 201 `{"imageUrl": url}`.
- Routes in `bootstrap.php`: `GET /api/dashboards`, `POST /api/dashboards`, `GET /api/dashboards/{id}`, `PUT /api/dashboards/{id}/layout`, `POST /api/images`.

- [ ] **Step 1: Failing `ImageUploadServiceTest`** (temp dir via `sys_get_temp_dir()`): stores real 1×1 PNG (write bytes from `base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')`) → URL matches `#^/uploads/[a-f0-9]{32}\.png$#` and file exists; text file named `fake.png` with `"not an image"` → `ValidationException`; size 6_000_000 → `ValidationException`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** controllers, service, routes. **Step 4: Run** `"$PHP" vendor/bin/phpunit` → PASS.
- [ ] **Step 5: Smoke script** `scripts/api-smoke-test.sh` (bash, `set -euo pipefail`, `BASE_URL=${BASE_URL:-http://127.0.0.1:8080}`, helper `expect_status <expected> <actual> <label>`): POST dashboard (201, capture id with `php -r` or `grep -o '"id":[0-9]*'`), PUT layout with one chart section (200), GET it and check body contains `"chartType":"bar"`, GET `/api/dashboards/999999` → 404, PUT invalid (`gridColumn: 0`) → 422, PUT body `{bad` → 400, POST `/api/images` with `-F image=@public/assets/images/sample-banner.svg` → 422 (svg not allowed). Prints `All smoke checks passed`. Run against `"$PHP" -S 127.0.0.1:8080 -t public public/index.php` (re-seed test data is fine since script creates its own dashboard).

Commits:
- `feat(api): expose dashboard list, create, load and save layout endpoints` (src/Controller/DashboardController.php, bootstrap.php)
- `feat(api): add validated image upload endpoint` (src/Controller/ImageUploadController.php, src/Service/ImageUploadService.php, tests/Unit/Service/ImageUploadServiceTest.php)
- `test(api): add end-to-end api smoke test script` (scripts/)

---

## FRONTEND TRACK (Tasks 5–6, one agent, sequential; runs in parallel with backend)

Backend contract = spec "HTTP API" section. Until backend is ready, verify modules by loading `public/index.html` from the PHP server; API calls may 404 early on, that's expected.

### Task 5: Builder shell — store, canvas, sections, drag/resize, autosave

**Files:**
- Create: `public/index.html`, `public/assets/css/app.css`, `public/assets/js/app.js`
- Create: `public/assets/js/api/DashboardApiClient.js`, `public/assets/js/api/ApiError.js`
- Create: `public/assets/js/state/LayoutStore.js`
- Create: `public/assets/js/canvas/DashboardCanvas.js`, `public/assets/js/canvas/SectionView.js`, `public/assets/js/canvas/ElementFrameView.js`
- Create: `public/assets/js/interaction/DragResizeController.js`, `public/assets/js/interaction/geometry.js`
- Create: `public/assets/js/elements/ElementRendererRegistry.js`, `public/assets/js/elements/elementDefaults.js` (text default only in this task; chart/image added in Task 6)
- Create: `public/assets/js/ui/Toolbar.js`, `public/assets/js/ui/Notifier.js`
- Create: `public/assets/js/persistence/AutosaveScheduler.js`

**Interfaces (Produces):**
- `ApiError extends Error`: `constructor(message, { status, code, details })`, fields `status`, `code`, `details`.
- `DashboardApiClient(baseUrl = '/api')`: `listDashboards(): Promise<Array<{id,name,updatedAt}>>` (unwraps `.dashboards`), `createDashboard(name)`, `getDashboard(dashboardId)`, `saveLayout(dashboardId, layout)`, `uploadImage(file): Promise<{imageUrl}>` (FormData field `image`). Non-2xx → throws `ApiError` from `error` envelope; network failure → `ApiError('Network error', {status: 0, code: 'network_error'})`.
- `LayoutStore extends EventTarget`:
  - `load(dashboard)` — assigns `clientId = crypto.randomUUID()` to every section and element; emits `change` `{reason: 'load'}`.
  - `getDashboardId()`, `getLayout()` → deep copy `{name, sections}` with `clientId` removed (API payload).
  - `getSections()` (read-only view), `findSection(sectionClientId)`, `findElement(sectionClientId, elementClientId)`.
  - `addSection(sectionFields)` → clientId; `updateSection(sectionClientId, changedFields, reason = 'geometry')`; `removeSection(sectionClientId)`.
  - `addElement(sectionClientId, elementFields)` → clientId (zIndex = max in section + 1); `updateElement(sectionClientId, elementClientId, changedFields, reason = 'geometry')`; `removeElement(sectionClientId, elementClientId)`.
  - `renameDashboard(name)`.
  - `select(sectionClientId, elementClientId = null)`, `getSelection()` → `{sectionClientId, elementClientId}`.
  - Every mutation emits `change` with `detail.reason` ∈ `'load'|'structure'|'geometry'|'content'|'selection'|'rename'`. `'structure'` for add/remove. Selection is not a layout change (autosave ignores it).
- `geometry.js` exports pure functions: `clampElementBox({offsetXPercent, offsetYPercent, widthPercent, heightPercent})` (min size 5%, stays inside 0–100, rounds to 2 decimals); `pixelsToPercent(pixels, totalPixels)`; `clampSectionPlacement({gridColumn, columnSpan, gridRow, rowSpan})` (columns 1–12, span fits, rows ≥1, rowSpan 4–200); `findNextFreeRow(sections)` (max of `gridRow + rowSpan`).
- `DragResizeController(layoutStore, { columnCount = 12, rowHeightPixels = 10 })`: `attachSection(sectionNode, sectionClientId, gridNode)` — drag by `.section-header`, resize from right/bottom edges; snaps to grid cells computed from `gridNode.getBoundingClientRect()`; live preview via CSS grid properties; commits via `updateSection` on `end`. `attachElement(frameNode, sectionClientId, elementClientId, sectionBodyNode)` — drag (ignore drags starting inside `[contenteditable]` text when element is focused for editing, allow via `.element-drag-handle`), resize all edges; restrict to parent; converts to percent with `clampElementBox`; commits on `end`. `setEnabled(isEnabled)`; `detach(node)`.
- `ElementRendererRegistry`: `register(elementType, renderer)`; `render(containerNode, element, context)` → returns cleanup function; unknown type renders "Unsupported element" text. Renderer contract: `render(containerNode, element, context) => cleanupFunction`. `context = { layoutStore, apiClient, notifier, sectionClientId, elementClientId }`.
- `elementDefaults.js`: `createDefaultElement(elementType)` returns `{elementType, offsetXPercent: 5, offsetYPercent: 5, widthPercent: 60, heightPercent: 40, content}`; text content `{html: '<p>Double-click to edit text</p>'}`. Task 6 adds image/chart cases.
- `ElementFrameView`: wraps renderer output in `.element-frame` (absolute, `left/top/width/height` in %), drag handle `.element-drag-handle`, delete button, selected outline; click selects.
- `SectionView`: `.section` positioned with `grid-column: {gridColumn} / span {columnSpan}; grid-row: {gridRow} / span {rowSpan}`; header with editable title input (updates store `reason 'content'`), delete button; `.section-body` (position relative) holding element frames; click selects section.
- `DashboardCanvas(rootNode, { layoutStore, rendererRegistry, dragResizeController, apiClient, notifier })`: full re-render on `load`/`structure`; on `selection` only toggles `.is-selected` classes; `geometry`/`content` changes are already reflected in the DOM (no re-render, keeps caret and charts).
- `Toolbar(rootNode, { layoutStore, apiClient, notifier, onDashboardChange })`: dashboard `<select>` (from `listDashboards`), "New dashboard" (prompt name → create → load), editable dashboard name input, "Add section" (placed at `findNextFreeRow`, column 1, span 6, rowSpan 24), "Add text" / "Add image" / "Add chart" buttons (disabled unless a section is selected; Task 6 wires image/chart defaults), save status label `#save-status`, "Save" button. Registers elements via `layoutStore.addElement(selectedSection, createDefaultElement(type))`.
- `Notifier(rootNode)`: `success(message)`, `error(message)`; toasts auto-hide after 4 s; `aria-live="polite"`.
- `AutosaveScheduler(layoutStore, apiClient, { delayMilliseconds = 1500, onStatusChange })`: listens to `change` with reasons `structure|geometry|content|rename`; debounce; `saveNow()`; never overlapping saves (if a save is in flight, mark pending and run once more after it finishes); statuses `'saved'|'unsaved'|'saving'|'error'`; on `beforeunload` with unsaved changes, sets `event.preventDefault()`. Validation errors (422) → notifier shows first detail message.
- `app.js`: composition root. On start: list dashboards, load `?dashboard=<id>` from URL or first dashboard (create "My Dashboard" if none), keep URL in sync with `history.replaceState`. Responsive: `matchMedia('(max-width: 767px)')` → `dragResizeController.setEnabled(false)` and body class `is-compact`.
- `index.html`: semantic layout — `<header class="toolbar">`, `<div class="rich-text-toolbar" hidden>` placeholder (Task 6), `<main id="dashboard-canvas">`, `<div id="toast-region">`, `<dialog id="chart-editor-dialog">` placeholder (Task 6). Loads CDN scripts (Global Constraints) then `<script type="module" src="/assets/js/app.js">`.
- `app.css`: CSS custom properties on `:root` (colors, spacing, radius), `.dashboard-grid { display: grid; grid-template-columns: repeat(12, 1fr); grid-auto-rows: 10px; gap: 0 12px; }`, sections as cards, element frames, handles visible on hover/selected, toolbar wraps on narrow screens. `@media (max-width: 767px)`: `.dashboard-grid { display: flex; flex-direction: column; gap: 12px }`, sections `min-height: calc(var(--row-span) * 10px)` (set `--row-span` inline) and order by grid row/column (set `order` inline), handles hidden.

- [ ] **Step 1:** Write `geometry.js` first with a tiny self-check page? No — keep it pure and verify in Step 4 via browser console: `clampElementBox({offsetXPercent: 90, offsetYPercent: -3, widthPercent: 30, heightPercent: 2})` → `{offsetXPercent: 70, offsetYPercent: 0, widthPercent: 30, heightPercent: 5}`.
- [ ] **Step 2:** Implement API client, store, notifier, autosave. Commit: `feat(frontend): add api client, layout store and debounced autosave`
- [ ] **Step 3:** Implement index.html, css, canvas, section view, element frame, drag/resize, toolbar, registry, text default, app.js. Commit: `feat(frontend): add dashboard canvas with draggable and resizable sections`
- [ ] **Step 4: Verify** with `"$PHP" -S 127.0.0.1:8080 -t public public/index.php`: page loads with no console errors (check with `curl -s localhost:8080/ | grep dashboard-canvas` and `node --check` on every JS file: `for moduleFile in public/assets/js/**/*.js; do node --check "$moduleFile"; done` with `shopt -s globstar`).
- [ ] **Step 5:** Responsive CSS. Commit: `feat(frontend): stack sections on small screens and disable editing there` (only if done as a separate change; otherwise included in Step 3 commit).

### Task 6: Elements — rich text, image upload, charts

**Files:**
- Create: `public/assets/js/elements/TextElementRenderer.js`, `public/assets/js/elements/ImageElementRenderer.js`, `public/assets/js/elements/ChartElementRenderer.js`, `public/assets/js/elements/DummyDataGenerator.js`
- Create: `public/assets/js/ui/RichTextToolbar.js`, `public/assets/js/ui/ChartEditorDialog.js`
- Modify: `public/assets/js/elements/elementDefaults.js`, `public/assets/js/app.js` (register renderers), `public/index.html`, `public/assets/css/app.css`

**Interfaces:**
- Consumes: Task 5 registry contract, `context`, `LayoutStore.updateElement(..., 'content')`, `DashboardApiClient.uploadImage`, `Notifier`.
- `TextElementRenderer`: `div.text-element[contenteditable=true]` with `innerHTML = content.html`; on `input` → `updateElement(..., {content: {html}}, 'content')`; on `focus` → `richTextToolbar.attachTo(editableNode)`; on `blur` → detach after 150 ms (so toolbar clicks still work). Constructor `(richTextToolbar)`.
- `RichTextToolbar(rootNode)`: buttons Bold (`document.execCommand('bold')`), Italic (`'italic'`), font-size `<select>` (12, 14, 16, 20, 24, 32, 48 px): wraps selection in `<span style="font-size: Npx">` using `Range.surroundContents` fallback to `extractContents` + insert; then dispatches `input` event on the editable so the store updates. Buttons use `mousedown` + `preventDefault()` to keep the selection. Shows `aria-pressed` for bold/italic via `document.queryCommandState`. `attachTo(editableNode)`, `detach()`.
- `ImageElementRenderer`: if `content.imageUrl` → `<img src alt style="object-fit: contain; width:100%; height:100%" draggable=false>`, plus small "Replace" button; else empty state button "Upload image" opening hidden `<input type=file accept="image/png,image/jpeg,image/gif,image/webp">`. Client-side pre-check: type in allowed list and size ≤ 5 MB → `notifier.error(...)`. Upload via `apiClient.uploadImage` → `updateElement(..., {content: {imageUrl, altText: file.name}}, 'content')` and re-render node. Errors → `notifier.error(apiError.message)`.
- `DummyDataGenerator`: `static generateSeries({ pointCount = 6, minimumValue = 50, maximumValue = 250 } = {})` → `{labels: ['Jan',...], values: [...]}` (month names cycle; integers).
- `ChartElementRenderer(chartEditorDialog)`: creates `<canvas>` in a wrapper; `new window.Chart(canvas, { type: content.chartType, data: { labels, datasets: [{ label: content.title, data: values }] }, options: { responsive: true, maintainAspectRatio: false, animation: false } })`; `ResizeObserver` → `chart.resize()`; header button "Edit chart" and double-click open `chartEditorDialog.open(content)` → on save `updateElement(..., {content: newContent}, 'content')` then update chart in place (`chart.config.type` change → destroy + recreate). Cleanup destroys chart and observer.
- `ChartEditorDialog(dialogNode)`: `open(content): Promise<content | null>`; form fields: title, chart type radio (bar/line), rows of label + value inputs with add/remove row (1–24), "Generate random data" (uses `DummyDataGenerator`, keeps point count), Cancel/Save. Save validates numbers (non-number → inline error, no resolve).
- `elementDefaults.js`: image `{imageUrl: '', altText: ''}` — NOTE validator requires an allowed URL prefix, so an empty image must not be saved invalid: default image element content is `{imageUrl: '/assets/images/sample-banner.svg', altText: 'Placeholder image'}` and the renderer shows the "Replace" button on top. Chart default: `{chartType: 'bar', title: 'New chart', ...DummyDataGenerator.generateSeries()}` (dynamically generated data).

- [ ] **Step 1:** Rich text renderer + toolbar. Verify `node --check`. Commit: `feat(elements): add rich text element with bold, italic and font size`
- [ ] **Step 2:** Image renderer + defaults. Commit: `feat(elements): add image element with upload and replace`
- [ ] **Step 3:** Dummy data, chart renderer, chart editor dialog. Commit: `feat(elements): add bar and line chart element with data editor`
- [ ] **Step 4: Verify** all JS passes `node --check`; served page loads seeded dashboard (`curl -s localhost:8080/api/dashboards/1` returns 4 elements once backend Task 4 is done).

---

## FINAL (coordinator)

### Task 7: Docs, docker, verification, review, push

- Create `README.md` (features, stack, quick start with local PHP + MySQL, docker-compose quick start, API table, project structure, design decisions: replace-layout semantics, percent/grid geometry, renderer registry, sanitizing; running tests).
- Create `docker-compose.yml` (`php:8.3-apache` built from `docker/Dockerfile` installing `pdo_mysql`, DocumentRoot `public/` with rewrite to `index.php`; `mysql:8.0` with `database/schema.sql` + `seed.sql` mounted in `/docker-entrypoint-initdb.d`).
- Run full `phpunit`, smoke script, manual browser check.
- Whole-branch review; fix findings in focused commits.
- Create public GitHub repo `dashboard-builder`, push `main`.

Commits: `docs: add setup guide and architecture notes`, `chore(docker): add docker compose setup for apache, php and mysql`.
