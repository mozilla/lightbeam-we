'use strict';

// When the user clicks browserAction icon in toolbar, execute runLightbeam function
browser.browserAction.onClicked.addListener(runLightbeam);

async function runLightbeam() {

  // Checks to see if Lightbeam is already open. Returns true if it is, false if not.
  async function isOpen() {
    const tabs = await browser.tabs.query({});
    const fullUrl = browser.extension.getURL('index.html');
    const lightbeamTabs = tabs.filter((tab) => {
      return (tab.url === fullUrl);
    });
    return lightbeamTabs[0] || false;
  }

  // Only open a new Lightbeam instance if one isn't already open.
  const lightbeamTab = await isOpen();
  if (!lightbeamTab) {
    browser.tabs.create({url: 'index.html'});
  }
}
