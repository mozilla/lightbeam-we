/*
* Listens for HTTP request responses, sending first- and
* third-party requests to storage.
*/
const capture = {
  async init() {
    this.addListeners();
    // get Disconnect Entity List from shavar-prod-lists submodule
    let whiteList
      = await fetch('/shavar-prod-lists/disconnect-entitylist.json');
    whiteList = await whiteList.json();
    const { firstPartyWhiteList, thirdPartyWhiteList }
      = this.reformatList(whiteList);
    this.firstPartyWhiteList = firstPartyWhiteList;
    this.thirdPartyWhiteList = thirdPartyWhiteList;
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

/*
  disconnect-entitylist.json is expected to match this format, where:
    - 'properties' keys are first parties
    - 'resources' keys are third parties

  {
    "Facebook" : {
      "properties": [
        "facebook.com",
        "facebook.de",
        ...
        "messenger.com"
      ],
      "resources": [
        "facebook.com",
        "facebook.de",
        ...
        "akamaihd.net"
      ]
    }

    "Google" : {
      ...
    }
  }

  this.firstPartyWhiteList is expected to match this format:
  {
    "google.com": 1,
    "abc.xyz": 1
    ....
    "facebook.com": 2,
    ...
  }

  this.thirdPartyWhiteList is expected to match this format:
  {
    1: [
      "google.com",
      "googleanalytics.com",
      "weloveevilstuff.com"
    ]
  }
*/

  reformatList(whiteList) {
    const firstPartyWhiteList = {};
    const thirdPartyWhiteList = {};
    let counter = 0;
    for (const siteOwner in whiteList) {
      const firstParties = whiteList[siteOwner].properties;
      for (let i = 0; i < firstParties.length; i++) {
        firstPartyWhiteList[firstParties[i]] = counter;
      }
      const thirdParties = whiteList[siteOwner].resources;
      thirdPartyWhiteList[counter] = [];
      for (let i = 0; i < thirdParties.length; i++) {
        thirdPartyWhiteList[counter].push(thirdParties[i]);
      }
      counter++;
    }

    return {
      firstPartyWhiteList,
      thirdPartyWhiteList
    };
  },

  // Returns true if the request should be stored, otherwise false.
  shouldStore(tab, thirdPartyFromRequest) {
    const documentUrl = new URL(tab.url);
    const firstPartyFromRequest = documentUrl.hostname;
    // ignore about:*, moz-extension:* & non-visible tabs (like dev tools)
    // also ignore third parties owned by first parties
    if (documentUrl.protocol !== 'about:'
      && documentUrl.protocol !== 'moz-extension:'
      && tab.id !== browser.tabs.TAB_ID_NONE
      && !(this.onWhitelist(firstPartyFromRequest, thirdPartyFromRequest))) {
      return true;
    }
    return false;
  },

  // check if third party is on the whitelist (owned by the first party)
  // returns true if it is and false otherwise
  onWhitelist(firstPartyFromRequest, thirdPartyFromRequest) {
    if (thirdPartyFromRequest) {
      const hostnameVariantsFirstParty
        = this.getHostnameVariants(firstPartyFromRequest);
      for (let i = 0; i < hostnameVariantsFirstParty.length; i++) {
        if (this.firstPartyWhiteList
          .hasOwnProperty(hostnameVariantsFirstParty[i])) {
          // first party is in the whitelist
          const index = this.firstPartyWhiteList[hostnameVariantsFirstParty[i]];
          const hostnameVariantsThirdParty
            = this.getHostnameVariants(thirdPartyFromRequest);
          for (let j = 0; j < hostnameVariantsThirdParty.length; j++) {
            if (this.thirdPartyWhiteList[index]
              .includes(hostnameVariantsThirdParty[j])) {
              return true;
            }
          }
          return false;
        }
      }
    }
    return false;
  },

  getHostnameVariants(hostname) {
    const hostnameVariants = [hostname];
    const hostnameArr = hostname.split('.');
    const numDots = hostnameArr.length - 1;
    for (let i = 0; i < numDots - 1; i++) {
      hostnameArr.shift();
      hostname = hostnameArr.join('.');
      hostnameVariants.push(hostname);
    }
    return hostnameVariants;
  },

  // capture third party requests
  async sendThirdParty(response) {
    const tab = await browser.tabs.get(response.tabId);
    const documentUrl = new URL(tab.url);
    const targetUrl = new URL(response.url);
    const originUrl = new URL(response.originUrl);

    if (targetUrl.hostname !== documentUrl.hostname
      && this.shouldStore(tab, targetUrl.hostname)) {
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
    if (tab.status === 'complete' && this.shouldStore(tab)) {
      const data = { faviconUrl: tab.favIconUrl };
      store.setFirstParty(documentUrl.hostname, data);
    }
  }
};

capture.init();
