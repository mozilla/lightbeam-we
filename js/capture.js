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
    this.queue = [];
    browser.webRequest.onResponseStarted.addListener((response) => {
      const eventDetails = {
        type: 'sendThirdParty',
        data: response
      };
      this.queue.push(eventDetails);
      this.processNextEvent();
    },
      {urls: ['<all_urls>']});
    // listen for tab updates
    browser.tabs.onUpdated.addListener(
      (tabId, changeInfo, tab) => {
        const eventDetails = {
          type: 'sendFirstParty',
          data: {
            tabId: tabId,
            changeInfo: changeInfo,
            tab: tab
          }
        };
        this.queue.push(eventDetails);
        this.processNextEvent();
      });
  },

  async processNextEvent(ignore = false) {
    if (this.processingQueue && !ignore) {
      return;
    }
    if (this.queue.length > 1) {
      const nextEvent = this.queue.shift();
      this.processingQueue = true;
      switch (nextEvent.type) {
        case 'sendFirstParty':
          await this.sendFirstParty(
            nextEvent.data.tabId,
            nextEvent.data.changeInfo,
            nextEvent.data.tab
          );
          break;
        case 'sendThirdParty':
          await this.sendThirdParty(nextEvent.data);
          break;
        default:
          break;
      }
      this.processNextEvent(true);
    } else {
      this.processingQueue = false;
    }
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

    if (targetUrl.hostname !== documentUrl.hostname
      && this.shouldStore(tab)) {
      // @todo figure out why Web Extensions sometimes gives us undefined URLs
      const originUrl = new URL(response.originUrl);
      const data = {
        document: documentUrl.hostname,
        target: targetUrl.hostname,
        origin: originUrl.hostname,
        requestTime: response.timeStamp,
        firstParty: false
      };
      await store.setThirdParty(
        documentUrl.hostname,
        targetUrl.hostname,
        data
      );
    }
  },

  // capture first party requests
  async sendFirstParty(tabId, changeInfo, tab) {
    const documentUrl = new URL(tab.url);
    if (tab.status === 'complete' && this.shouldStore(tab)) {
      const data = {
        faviconUrl: tab.favIconUrl,
        firstParty: true
      };
      await store.setFirstParty(documentUrl.hostname, data);
    }
  }
};

capture.init();
