/* eslint no-console: "off" */
/* eslint no-unused-vars: "off" */

const capture = {
  init() {
    console.log('init');
    this.addListeners();
  },

  addListeners() {
    // listen for each HTTP response
    browser.webRequest.onResponseStarted.addListener(
      this.sendThirdParty,
      {urls: ['<all_urls>']});
    // listen for tab updates
    browser.tabs.onUpdated.addListener(this.sendFirstParty);
  },

  // capture third party requests
  async sendThirdParty(response) {
    const tab = await browser.tabs.get(response.tabId);
    const tabUrl = new URL(tab.url);
    const targetUrl = new URL(response.url);
    const originUrl = new URL(response.originUrl);

    if (targetUrl.hostname !== tabUrl.hostname) {
      const thirdPartyData = {
        document: tabUrl.hostname,
        target: targetUrl.hostname,
        origin: originUrl.hostname,
        requestTime: response.timeStamp
      };
      console.log('storage.thirdPartyRequest:', tabUrl, thirdPartyData);
    }
  },

  // capture first party requests
  sendFirstParty(tabId, changeInfo, tab) {
    const tabUrl = new URL(tab.url);
    // ignore about:* pages and non-visible tabs
    if (tab.status === 'complete'
      && tabUrl.protocol !== 'about:'
      && tabId !== browser.tabs.TAB_ID_NONE) {
      const firstPartyData = { faviconUrl: tab.favIconUrl };
      console.log('storage.firstPartyRequest:',
        tabUrl.hostname, firstPartyData);
    }
  }
};