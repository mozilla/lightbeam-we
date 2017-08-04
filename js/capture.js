/*
* Listens for HTTP request responses, sending first- and
* third-party requests to storage.
*/
const capture = {
  init() {
    this.addListeners();
  },

  addListeners() {
    // listen for each HTTP response
    browser.webRequest.onResponseStarted.addListener(
      (response) => this.sendThirdParty(response),
      {urls: ['<all_urls>']});
    // listen for tab updates
    browser.tabs.onUpdated.addListener(
      (tabId, changeInfo, tab) => {
        this.sendFirstParty(tabId, changeInfo, tab);
      });
  },

  // Returns true if the request should be stored, otherwise false.
  shouldStore(tab) {
    const documentUrl = new URL(tab.url);
    // ignore about:*, moz-extension:* & non-visible tabs (like dev tools)
    // also ignore private browsing tabs
    if (documentUrl.protocol !== 'about:'
      && documentUrl.protocol !== 'moz-extension:'
      && tab.id !== browser.tabs.TAB_ID_NONE
      && !tab.incognito) {
      return true;
    }
    return false;
  },

  // capture third party requests
  async sendThirdParty(response) {
    const tab = await browser.tabs.get(response.tabId);
    const documentUrl = new URL(tab.url);
    const targetUrl = new URL(response.url);
    const originUrl = new URL(response.originUrl);

    if (targetUrl.hostname !== documentUrl.hostname
      && this.shouldStore(tab)) {
      const data = {
        document: documentUrl.hostname,
        target: targetUrl.hostname,
        origin: originUrl.hostname,
        requestTime: response.timeStamp,
        firstParty: false
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
    if (tab.status === 'complete' && this.shouldStore(tab)) {
      const data = {
        faviconUrl: tab.favIconUrl,
        firstParty: true
      };
      store.setFirstParty(documentUrl.hostname, data);
    }
  }
};

capture.init();
