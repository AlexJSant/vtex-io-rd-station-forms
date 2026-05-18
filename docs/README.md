📢 Use this project, [contribute](https://github.com/AlexJSant/vtex-io-rd-station-forms) to it or open issues to help evolve it using [Store Discussion](https://github.com/vtex-apps/store-discussion).

# RD Station Forms

<!-- DOCS-IGNORE:start -->
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-0-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
<!-- DOCS-IGNORE:end -->

**RD Station Forms** is a VTEX IO Store Framework app that embeds [RD Station](https://www.rdstation.com/) lead-capture forms directly into your storefront DOM—without iframes, inline scripts, or `dangerouslySetInnerHTML`.

When installed, the app exposes a single store block that:

- Loads the official RD Station Forms script once per page (`rdstation-forms.min.js`).
- Mounts a container element whose `id` matches the embed code generated in the RD Station panel.
- Calls `new RDStationForms(formId, identifier).createForm()` so fields and validation behave exactly as configured in RD Station.
- Shows optional loading and user-friendly error states while keeping technical error details available to screen readers.
- Cleans up injected DOM on unmount, which keeps behavior predictable during VTEX SPA navigation.

Use it on landing pages, footers, or any template where you already rely on RD Station forms and want them rendered natively inside your theme layout.

![Media Placeholder](https://user-images.githubusercontent.com/52087100/71204177-42ca4f80-227e-11ea-89e6-e92e65370c69.png)

## Configuration

### 1. Install the app

Add the app as a dependency in your **store theme** `manifest.json`:

```json
{
  "dependencies": {
    "{vendor}.rd-station-forms": "0.x"
  }
}
```

Then link or publish the app in your account (`vtex link` during development, or install from the VTEX App Store / workspace when available).

### 2. Add the block to a template

Declare the block in a theme template (for example `store/blocks/landing.jsonc`) or inside another block:

```json
{
  "rd-station-form#newsletter": {
    "props": {
      "formId": "your-rd-embed-element-id",
      "identifier": "",
      "showLoading": true,
      "loadingLabel": "Loading form…",
      "errorFallbackLabel": "Unable to load the form. Please try again shortly."
    }
  }
}
```

You can also configure the block through **Site Editor**; the block schema is defined on the React component.

### 3. Match RD Station embed settings

In the RD Station panel, copy the **element id** used as the first argument of `new RDStationForms('…', …)` and paste it into the block `formId` prop. If your snippet includes a second constructor argument (for example a UA identifier), set it in `identifier`.

> **Important:** Each block on the same page must use a **unique** `formId`. Duplicate ids break `getElementById` and may cause undefined RD Station behavior; the component logs a console warning when duplicates are detected.

### Blocks

| Block name | Description |
| ---------- | ----------- |
| `rd-station-form` | Embeds one RD Station form in the storefront DOM. Loads the RD script once, mounts `#formId`, and runs `createForm()`. Supports loading/error UI and optional `className` on the wrapper. |

### `rd-station-form` props

| Prop name | Type | Description | Default value |
| --------- | ---- | ----------- | ------------- |
| `formId` | `string` | RD embed element id—the first argument of `new RDStationForms(...)`. Must match the id from your RD snippet and be unique per block on the page. | `""` |
| `identifier` | `string` | Optional second argument of the RD constructor (for example UA), when your account snippet uses it. | `""` |
| `className` | `string` | Extra CSS classes applied to the root `<section>` wrapper. Useful in theme JSON; not exposed in Site Editor schema. | — |
| `showLoading` | `boolean` | When `true`, shows a loading message until `createForm()` completes. | `true` |
| `loadingLabel` | `string` | Text shown while the form is loading. | `Carregando formulário…` |
| `errorFallbackLabel` | `string` | User-facing message when script load or initialization fails. Technical details are exposed in a screen-reader-only element. | `Não foi possível carregar o formulário. Tente novamente em instantes.` |
| `onSuccess` | `function` | Callback invoked after a successful `createForm()`. For programmatic use only—not configurable in Site Editor. | — |

Prop types are:

- `string`
- `enum`
- `number`
- `boolean`
- `object`
- `array`

> **Disclaimer:** Default loading and error copy ship in Portuguese to match the initial store locale. Override `loadingLabel` and `errorFallbackLabel` in the theme or Site Editor for other languages.

> **Disclaimer:** A local `title` prop above the form is intentionally disabled—the RD form already includes headings. The prop and schema entry remain commented in source for a possible future release.

## Modus Operandi

### Script loading

The app injects a single async script from RD Station’s stable CDN:

`https://d335luupugsy2.cloudfront.net/js/rdstation-forms/stable/rdstation-forms.min.js`

- If the tag already exists in the document, the loader reuses it.
- A global promise (`window.__rdStationFormsScriptPromise`) prevents duplicate downloads when multiple blocks mount on the same page.
- After load, the app polls until `window.RDStationForms` is available (15s timeout).

### Form lifecycle

1. The block renders a `<section>` with an inner `<div id={formId} role="main">` where RD Station injects the form.
2. After the script is ready, children of that container are cleared and `new RDStationForms(formId, identifier ?? '').createForm()` runs.
3. On unmount (route change or block removal), injected children are removed from the container.
4. A per-`formId` mount counter tolerates React Strict Mode double-mounting without breaking cleanup.

### CORS and environments

RD Station’s integrated script fetches template data from `forms.rdstation.com.br`. The browser enforces CORS on that origin. Common situations:

- **Development workspace** (`*.myvtex.com`) and **production domain** are different origins; RD must allow each origin you use.
- Admin login does not change the storefront origin—only the URL the customer visits matters.
- Placeholder or invalid `formId` values may return 404 from RD APIs; always use the real id from your RD Station account.
- If requests are blocked, confirm with RD Station support that your VTEX origins are allowed, or evaluate RD’s alternative embed options (for example iframe-based embeds trade off DOM integration for different origin behavior).

### Site Editor vs theme JSON

Props listed in the component **schema** (`formId`, `identifier`, `showLoading`, `loadingLabel`, `errorFallbackLabel`) appear in Site Editor. Use theme JSON for `className` and any future programmatic hooks such as `onSuccess`.

## Customization

In order to apply CSS customizations in this and other blocks, follow the instructions given in the recipe on [Using CSS Handles for store customization](https://vtex.io/docs/recipes/style/using-css-handles-for-store-customization).

No CSS Handles are available yet for the app customization.

The block uses **CSS Modules** instead of VTEX CSS handles. You can still style it by:

- Passing `className` on the block in your theme to target the root wrapper.
- Using the stable attribute `data-rd-station-form-wrapper` on the root `<section>`.
- Overriding global selectors for RD-injected markup under the block container (the app ships baseline `:global` rules for `form`, `input`, `textarea`, `select`, and `button` inside `.container`).

<!-- DOCS-IGNORE:start -->

## Contributors ✨

Thanks goes to these wonderful people:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind are welcome!

<!-- DOCS-IGNORE:end -->
