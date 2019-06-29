# Firefox Lightbeam
This is the web extension version of the Firefox Lightbeam add-on for visualizing HTTP requests between websites in real time.

The Firefox Lightbeam extension by Mozilla is a key tool for Mozilla to educate the public about privacy.

![lightbeam-screenshot](/docs/images/lightbeam.gif)

## Quick Start

### Clone the repository

**Note** This repository uses a [submodule](https://github.com/mozilla-services/shavar-prod-lists) to allow some third party requests. To ensure the submodule is cloned along with this repository, use a modified `clone` command:
`git clone --recursive https://github.com/mozilla/lightbeam-we.git`

### Run the web extension

There are a couple ways to try out this web extension:

1. Open Firefox and load `about:debugging` in the URL bar.
    - Click the [Load Temporary Add-on](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Temporary_Installation_in_Firefox) button and select the `manifest.json` file within the directory of this repository.
    - You should now see the Lightbeam icon on the top right bar of the browser.
    - Click the Lightbeam icon to launch the web extension.

2. Install the [web-ext](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Getting_started_with_web-ext) tool, change into the `src` directory of this repository, and type `web-ext run`.
    - This will launch Firefox and install the extension automatically.
    - This tool gives you some additional development features such as [automatic reloading](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Getting_started_with_web-ext#Automatic_extension_reloading).

## Development Guide

### Download dependencies
Run `npm run build`.

### Update the submodule
To manually update the submodule at any time during development, run `git submodule update`.

### Testing
Run `npm run test` to check that everything is OK.

* If you have installed `eslint` globally, you will have to install globally the following `eslint` plugins too:
    - `eslint-plugin-json`
    - `eslint-plugin-mocha`
* Test suites include lint and unit testing. You can individually run lint or unit tests using the following commands:
    * `npm run lint:eslint`
    * `npm run test:karma`

Eslint is used for linting. Karma, Mocha & Chai are used for unit testing. Additionally the test suites are run on the Travis service providing continuous integration support.
