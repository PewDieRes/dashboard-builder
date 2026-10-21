# Editor Redesign — Spec and Plan

Date: 2026-10-21. Frontend only; the API and database do not change.

## Goal

The hiring team shared Figma and Webflow screenshots as the target layout, visual style and UX. Restyle the
builder as a three-pane design tool: top bar, left Add/Layers sidebar, centre canvas frame, right inspector.
Light Figma-style chrome.

## Layout

```
┌───────────────────────────── top bar (48px) ─────────────────────────────┐
│ logo · dashboard select · New · name │ Desktop Tablet Mobile │ status Save Preview │
├──────────────┬──────────────────────────────────────────┬────────────────┤
│ Add | Layers │  grey workspace                          │ Inspector      │
│ (260px)      │    "Sales Overview" label                │ (288px)        │
│              │    ┌ white dashboard frame ┐             │                │
│              │    │ 12-col grid sections  │             │                │
└──────────────┴──────────────────────────────────────────┴────────────────┘
```

- **Top bar:** brand, dashboard `<select>` + New, dashboard name input; centred device switcher (Desktop =
  frame fills the workspace up to 1200px, Tablet = 768px, Mobile = 390px); save status, Save, Preview toggle.
- **Left sidebar, tab "Add":** icon cards in a 2-column grid: Section, Text, Image, Bar chart, Line chart.
  Accessible names: `Add section`, `Add text`, `Add image`, `Add bar chart`, `Add line chart`. Element cards add to
  the selected section; with no section selected they first create a section, then add into it, and select the
  new element. Line chart = chart default with `chartType: 'line'`.
- **Left sidebar, tab "Layers":** tree of sections (title) and their elements (type icon + short label: text
  snippet, image alt, chart title). Click a row selects it; the selected row is highlighted and kept in sync with
  canvas selection.
- **Canvas:** grey workspace, centred white frame with the dashboard name as a small label above it (Figma
  style). Selection: 2px accent outline, four square corner handles, and a type chip at the top-left
  (`Section`, `Text`, `Image`, `Chart`).
- **Inspector**, by selection:
  - none: dashboard name, number of sections and elements, short hint.
  - section: Title; Position (Column 1–12, Row ≥1); Size (Columns 1–12, Height in rows 4–200); Delete section.
  - element: Position X/Y and Size W/H in percent (number inputs, clamped with the same `geometry.js` helpers the
    drag code uses); Arrange (Bring forward / Send backward via zIndex); Delete element; then type section:
    - text: Bold, Italic, Font size — the existing `RichTextToolbar` mounted inside the inspector, active while
      the text element is focused (hint when not focused: "Click into the text to format it").
    - image: thumbnail, Replace (same upload path as the canvas), Alt text input.
    - chart: Type (bar/line segmented control), Title, Data source select (Manual + server metrics), Edit data
      (opens existing `ChartEditorDialog`), Generate random data.
  - Inspector edits update the store immediately; the canvas reflects them without a full re-render; autosave
    persists them.
- **Preview toggle:** hides both sidebars and all selection chrome, disables drag/resize and makes text
  non-editable. Toggling back restores editing.
- **Keyboard:** `Delete`/`Backspace` removes the selected element (or section when only a section is selected)
  when focus is not in an input, select, textarea or contenteditable; `Escape` clears the selection.
- **Responsive:** viewport < 1024px hides the sidebars (canvas fills width, editing still allowed); viewport
  < 768px also stacks sections and is view-only (existing behaviour). Tablet/Mobile device modes stack sections
  inside the frame via a class on the frame (not the viewport) and disable drag/resize.
- **Style:** Inter (Google Fonts), neutral greys (`#f5f5f7` workspace, white panels, `#e5e7eb` borders), accent
  `#6d5dfc`, 13px UI text, 8px radii, soft shadows; all colours as CSS custom properties.

## Implementation notes

- Keep existing modules and contracts; add new ones, one class per file:
  `ui/AddPanel.js`, `ui/LayersPanel.js`, `ui/SidebarTabs.js`, `ui/DeviceSwitcher.js`, `ui/PreviewMode.js`,
  `ui/inspector/InspectorPanel.js` plus `DashboardInspector.js`, `SectionInspector.js`,
  `ElementGeometryInspector.js`, `TextInspector.js`, `ImageInspector.js`, `ChartInspector.js`,
  `interaction/KeyboardShortcuts.js`, and a small `ui/formControls.js` for labelled number/text inputs.
- Store reasons: inspector geometry edits use `'geometry'`; the canvas must re-apply element boxes and section
  placements from the store on `'geometry'`. Inspector content edits that need the element redrawn (chart type,
  title, data source, image URL/alt) use a new reason `'element-content'`, on which the canvas re-renders only
  that element frame; autosave treats it as a layout change. Text edits keep using `'content'`.
- Move element-adding logic out of `Toolbar` into a reusable `ElementInserter` (or equivalent) used by the Add
  panel, so there is one implementation.
- `app.js` stays the composition root.

## Testing

- Update `tests/e2e/dashboardBuilder.spec.mjs` to the new controls (keep accessible names stable where
  possible; `Add chart` becomes `Add bar chart` / `Add line chart`).
- New e2e tests: inspector width input changes the element's on-canvas width and persists; inspector section
  column/span persists; Layers row click selects the canvas element (and vice versa); Add text with no section
  selected creates a section; device switcher Mobile stacks sections inside the frame; Preview hides sidebars
  and blocks dragging; Delete key removes the selected element; Escape clears selection.
- All existing PHPUnit and e2e tests keep passing.

## Commits (feature-scoped)

`feat(ui): three-pane editor shell with top bar and design tokens`, `feat(ui): add panel with element cards`,
`feat(ui): layers panel synced with canvas selection`, `feat(ui): context inspector for dashboard, sections and
elements`, `feat(ui): device preview widths and preview mode`, `feat(ui): keyboard shortcuts for delete and
deselect`, `test(e2e): cover the redesigned editor`, `docs: describe the editor layout`.
