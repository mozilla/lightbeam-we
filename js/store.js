const store = {
  _websites: null,
  WHITELIST_URL: '/shavar-prod-lists/disconnect-entitylist.json',

  async init() {
    if (!this._websites) {
      const data = await browser.storage.local.get('websites');

      if (data.websites) {
        this._websites = clone(data.websites);
      }
    }
    browser.runtime.onMessage.addListener((m) => store.messageHandler(m));
    await this.getWhiteList();
  },

  // get Disconnect Entity List from shavar-prod-lists submodule
  async getWhiteList() {
    let whiteList;
    try {
      whiteList = await fetch(this.WHITELIST_URL);
      whiteList = await whiteList.json();
    } catch (error) {
      whiteList = {};
      const explanation = 'See README.md for how to import submodule file';
      // eslint-disable-next-line no-console
      console.error(`${error.message} ${explanation} ${this.WHITELIST_URL}`);
    }
    const { firstPartyWhiteList, thirdPartyWhiteList }
      = this.reformatList(whiteList);
    this.firstPartyWhiteList = firstPartyWhiteList;
    this.thirdPartyWhiteList = thirdPartyWhiteList;
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

  // send message to storeChild when data in store is changed
  updateChild(...args) {
    return browser.runtime.sendMessage({
      type: 'storeChildCall',
      args
    });
  },

  messageHandler(m) {
    if (m.type !== 'storeCall') {
      return;
    }

    const publicMethods = [
      'getAll',
      'reset',
    ];

    if (publicMethods.includes(m['method'])) {
      const args = m.args;
      return this[m['method']](...args);
    } else {
      return new Error(`Unsupported method ${m.method}`);
    }
  },

  async _write(websites) {
    this._websites = clone(websites);

    return await browser.storage.local.set({ websites });
  },

  outputWebsite(hostname, website) {
    const output = {
      hostname: hostname,
      favicon: website.faviconUrl || '',
      firstPartyHostnames: website.firstPartyHostnames || false,
      firstParty: false,
      thirdParties: []
    };
    if (website.firstPartyHostnames === undefined) {
      output.firstParty = true;
      if ('thirdPartyHostnames' in website) {
        output.thirdParties = website.thirdPartyHostnames;
      } else {
        output.thirdParties = [];
      }
    }
    return output;
  },

  getAll() {
    const output = {};
    for (const hostname in this._websites) {
      const website = this._websites[hostname];
      // if it's a visible third party or a first party
      if (website['isVisible'] || !('isVisible' in website)) {
        output[hostname] = this.outputWebsite(hostname, website);
      }
    }
    return Promise.resolve(output);
  },

  /*
  if not {}, getWebsite returns an object:
  - in this format for first parties:
    {
      thirdPartyHostnames: [
        "www.thirdpartydomain.com",
        ...
      ]
    }
  and in this format for third parties:
    {
      firstPartyHostnames: [
        "www.firstpartydomain.com",
        ...
      ],
      isVisible: false,
    }
  */
  getWebsite(hostname) {
    if (!hostname) {
      throw new Error('getWebsite requires a valid hostname argument');
    }
    if (this._websites && this._websites[hostname]) {
      return this._websites[hostname];
    } else {
      return {};
    }
  },

  getThirdParties(hostname) {
    if (!hostname) {
      throw new Error('getThirdParties requires a valid hostname argument');
    }

    const firstParty = this.getWebsite(hostname);
    if ('thirdPartyHostnames' in firstParty) {
      return firstParty.thirdPartyHostnames;
    }

    return null;
  },

  setWebsite(hostname, data) {
    const websites = clone(this._websites);

    if (this.isNewWebsite(hostname)) {
      websites[hostname] = {};
    }

    for (const key in data) {
      websites[hostname][key] = data[key];
    }

    this._write(websites);
  },

  isNewWebsite(hostname) {

    if (!this._websites || !this._websites[hostname]) {
      return true;
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

  // check if third party is on the whitelist (owned by the first party)
  // returns true if it is and false otherwise
  onWhiteList(firstPartyFromRequest, thirdPartyFromRequest) {
    if (thirdPartyFromRequest && this.firstPartyWhiteList) {
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

  setFirstParty(hostname, data) {
    if (!hostname) {
      throw new Error('setFirstParty requires a valid hostname argument');
    }
    const isNewWebsite = this.isNewWebsite(hostname);

    this.setWebsite(hostname, data);

    if (isNewWebsite) {
      this.updateChild(this.outputWebsite(hostname, data));
    }
  },

  // @todo restructure storage to use data from capture for graph filtering
  setThirdParty(origin, target, data) {
    if (!origin) {
      throw new Error('setThirdParty requires a valid origin argument');
    }

    let isNewThirdParty = false;
    let isNewFirstParty = false;

    const firstParty = this.getWebsite(origin);
    const thirdParty = this.getWebsite(target);

    // add link in third party if it doesn't exist yet
    if (!('firstPartyHostnames' in thirdParty)) {
      thirdParty['firstPartyHostnames'] = [];
    }
    if (!thirdParty['firstPartyHostnames'].includes(origin)) {
      thirdParty['firstPartyHostnames'].push(origin);
      isNewFirstParty = true;
    }

    // add link in first party if it doesn't exist yet
    // and the third party is visible (i.e. not whitelisted)
    if (!('thirdPartyHostnames' in  firstParty)
      || !firstParty['thirdPartyHostnames'].includes(target)) {
      if (!('isVisible' in thirdParty) || !thirdParty['isVisible']) {
        if (!(this.onWhiteList(origin, target))) {
          // show third party
          thirdParty['isVisible'] = true;
          isNewThirdParty = true;
        } else {
          // hide third party
          thirdParty['isVisible'] = false;
        }
      }
      if (thirdParty['isVisible'] && isNewFirstParty) {
        // an existing visible third party links to a new first party
        thirdParty['firstPartyHostnames'].forEach((firstPartyHostname) => {
          this.addFirstPartyLink(firstPartyHostname, target);
        });
      }
    }

    // merge data with thirdParty website object
    for (const key in data) {
      thirdParty[key] = data[key];
    }

    this.setWebsite(target, thirdParty);

    // should update if:
    //   - there is a new third party, OR
    //   - there is a new link between an old third party and a new first party
    //   AND
    //   - the third party is visible (i.e. not whitelisted)
    const shouldUpdate = (isNewThirdParty || isNewFirstParty)
      && thirdParty['isVisible'];

    if (shouldUpdate) {
      this.updateChild(this.outputWebsite(target, thirdParty));
    }
  },

  addFirstPartyLink(firstPartyHostname, thirdPartyHostname) {
    const firstParty = this.getWebsite(firstPartyHostname);
    if (!('thirdPartyHostnames' in firstParty)) {
      firstParty['thirdPartyHostnames'] = [];
    }
    firstParty['thirdPartyHostnames'].push(thirdPartyHostname);
    this.setFirstParty(firstPartyHostname, firstParty);
  },

  async reset() {
    this._websites = null;

    return await browser.storage.local.remove('websites');
  }
};

// @todo move this function to utils
function clone(obj) {
  return Object.assign({}, obj);
}

store.init();
