/*
* Listens for HTTP request responses, sending first- and
* third-party requests to storage.
*/

capture.init();

const capture = {
  init() {
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
    const documentUrl = new URL(tab.url);
    const targetUrl = new URL(response.url);
    const originUrl = new URL(response.originUrl);

    if (targetUrl.hostname !== documentUrl.hostname) {
      const data = {
        document: documentUrl.hostname,
        target: targetUrl.hostname,
        origin: originUrl.hostname,
        requestTime: response.timeStamp
      };
      store.setThirdParty(
        documentUrl.hostname,
        targetUrl.hostname,
        data
      );
    }
  },

  // capture first party requests
  sendFirstParty(tabId, changeInfo, tab) {
    const documentUrl = new URL(tab.url);
    // ignore about:* pages and non-visible tabs
    if (tab.status === 'complete'
      && documentUrl.protocol !== 'about:'
      && tabId !== browser.tabs.TAB_ID_NONE) {
      const data = { faviconUrl: tab.favIconUrl };
      store.setFirstParty(documentUrl.hostname, data);
    }
  }
};