/* eslint no-undef: "off" */
'use strict';

// When the user clicks browserAction icon in toolbar, run Lightbeam
browser.browserAction.onClicked.addListener(runLightbeam);

async function runLightbeam() {
  // Checks to see if Lightbeam is already open.
  // Returns true if it is, false if not.
  async function isOpen() {
    const tabs = await browser.tabs.query({});
    const fullUrl = browser.extension.getURL('index.html');
    const lightbeamTabs = tabs.filter((tab) => {
      return (tab.url === fullUrl);
    });
    return lightbeamTabs[0] || false;
  }

  const lightbeamTab = await isOpen();
  if (!lightbeamTab) {
    // only open a new Lightbeam instance if one isn't already open.
    browser.tabs.create({url: 'index.html'});
    capture.init();
  } else if (!lightbeamTab.active) {
     // re-focus Lightbeam if it is already open but lost focus
    browser.tabs.update(lightbeamTab.id, {active: true});
  }
}
