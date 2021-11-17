![social preview](/social-preview.png)

# v-no

![version](https://img.shields.io/github/package-json/v/akrisrn/v-no) ![Release](https://github.com/akrisrn/v-no/workflows/Release/badge.svg) ![Prerender](https://github.com/akrisrn/v-no-doc/workflows/Prerender/badge.svg)

[中文版](/README.zh.md)

v-no is a lightweight static site renderer / generator for Markdown, and also a pure static single page application powered by Vue.js at the same time.

Demo and documentation：https://akrisrn.github.io/v-no-doc/?conf=en

(It is a work in progress, and English edition is just an empty shell for now. I will translate it when Chinese edition has done.)

## Main features

- Switchable multiple config group.
- Embeddable snippets and templates.
- Executable inline scripts.
- Dynamic imports custom scripts / styles.
- A ton of API for inline / custom scripts.
- Bi-directional links between Markdown files.
- Extended Markdown syntax.
- Added mark syntax.
- Nestable tags syntax.
- Highlightable site-wide search.
- Dark / zen mode.

## Who will be interested in?

- Hope Markdown could program page content.
- Hope to increase Markdown reuse, and create links between them.

## Who will not be interested in?

- Want to use custom themes, or change layout.
- ...

## Related repos

- [v-no-script](https://github.com/akrisrn/v-no-script)
- [v-no-doc](https://github.com/akrisrn/v-no-doc)
- [v-no-doc-script](https://github.com/akrisrn/v-no-doc-script)
- [v-no-page-component](https://github.com/akrisrn/v-no-page-component)
- Templates:
    - [v-no-template](https://github.com/akrisrn/v-no-template)
    - [v-no-hash-template](https://github.com/akrisrn/v-no-hash-template)
    - [v-no-script-template](https://github.com/akrisrn/v-no-script-template)

## Project setup

Install dependencies:

```shell
yarn install
```

Run a hot reload server for development:

```shell
yarn run serve
```

Build minimized files for production:

```shell
yarn run build
# build in modern mode
yarn run build-modern
```

Unit test：

```shell
yarn run serve
yarn run test:install-browser
yarn run test:unit
```

## API

Generate by typedoc: https://akrisrn.github.io/v-no/

中文 API 文档（转换自 [vno.d.ts](/src/vno.d.ts)）：https://akrisrn.github.io/v-no-doc/-/#/zh/api/
