const store = {
  ALLOWLIST_URL: '/ext-libs/disconnect-entitylist.json',
  db: null,

  async init() {
    if (!this.db) {
      this.makeNewDatabase();
    }
    browser.runtime.onMessage.addListener((m) => {
      return store.messageHandler(m);
    });
    await this.getAllowList();
  },

  async isFirstRun() {
    let isFirstRun = await browser.storage.local.get('isFirstRun');
    if (! ('isFirstRun' in isFirstRun)) {
      isFirstRun = true;
    } else if (isFirstRun) {
      isFirstRun = false;
    }
    await browser.storage.local.set({ isFirstRun });
    return isFirstRun;
  },

  indexes: [
    'hostname', // Primary key
    'firstRequestTime',
    'lastRequestTime',
    'isVisible',
    'firstParty'
  ],

  makeNewDatabase() {
    this.db = new Dexie('websites_database');
    const websites = this.indexes.join(', ');
    this.db.version(1).stores({websites});
    this.db.open();
  },

  // get Disconnect Entity List from shavar-prod-lists submodule
  async getAllowList() {
    let allowList;
    try {
      allowList = await fetch(this.ALLOWLIST_URL);
      allowList = await allowList.json();
    } catch (error) {
      allowList = {};
      const explanation = 'See README.md for how to import submodule file';
      // eslint-disable-next-line no-console
      console.error(`${error.message} ${explanation} ${this.ALLOWLIST_URL}`);
    }
    const { firstPartyAllowList, thirdPartyAllowList }
      = this.reformatList(allowList);
    this.firstPartyAllowList = firstPartyAllowList;
    this.thirdPartyAllowList = thirdPartyAllowList;
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

  this.firstPartyAllowList is expected to match this format:
  {
    "google.com": 1,
    "abc.xyz": 1
    ....
    "facebook.com": 2,
    ...
  }

  this.thirdPartyAllowList is expected to match this format:
  {
    1: [
      "google.com",
      "googleanalytics.com",
      "weloveevilstuff.com"
    ]
  }
*/

  reformatList(allowList) {
    const firstPartyAllowList = {};
    const thirdPartyAllowList = {};
    let counter = 0;
    for (const siteOwner in allowList) {
      const firstParties = allowList[siteOwner].properties;
      for (let i = 0; i < firstParties.length; i++) {
        firstPartyAllowList[firstParties[i]] = counter;
      }
      const thirdParties = allowList[siteOwner].resources;
      thirdPartyAllowList[counter] = [];
      for (let i = 0; i < thirdParties.length; i++) {
        thirdPartyAllowList[counter].push(thirdParties[i]);
      }
      counter++;
    }

    return {
      firstPartyAllowList,
      thirdPartyAllowList
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
      'getFirstRequestTime',
      'getNumFirstParties',
      'getNumThirdParties',
      'isFirstRun'
    ];

    if (publicMethods.includes(m['method'])) {
      const args = m.args;
      return this[m['method']](...args);
    } else {
      return new Error(`Unsupported method ${m.method}`);
    }
  },

  async _write(website) {
    for (const key in website) {
      website[key] = this.mungeDataInbound(key, website[key]);
    }
    return await this.db.websites.put(website);
  },

  outputWebsite(hostname, website) {
    const output = {
      hostname: hostname,
      favicon: website.faviconUrl || '',
      firstPartyHostnames: website.firstPartyHostnames || false,
      firstParty: !!website.firstParty,
      thirdParties: []
    };
    if ('thirdPartyHostnames' in website) {
      output.thirdParties = website.thirdPartyHostnames;
    }
    return output;
  },

  async getAll() {
    const websites = await this.db.websites.filter((website) => {
      return website.isVisible || website.firstParty;
    }).toArray();
    const output = {};
    for (const website of websites) {
      output[website.hostname]
        = this.outputWebsite(website.hostname, website);
    }
    return output;
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
  async getWebsite(hostname) {
    if (!hostname) {
      throw new Error('getWebsite requires a valid hostname argument');
    }

    const website = await this.db.websites.get(hostname);
    if (website) {
      const websiteOutput = {};
      Object.keys(website).forEach((key) => {
        websiteOutput[key] = this.mungeDataOutbound(key, website[key]);
      });
      return websiteOutput;
    } else {
      return {};
    }
  },

  mungeDataInbound(key, value) {
    if (this.indexes.includes(key)) {
      // IndexedDB does not accept boolean values for indexes; using 0/1 instead
      if (value === true) {
        value = 1;
      }
      if (value === false) {
        value = 0;
      }
    }
    return value;
  },

  mungeDataOutbound(key, value) {
    if (this.indexes.includes(key)) {
      // IndexedDB does not accept boolean values for indexes; using 0/1 instead
      if (value === 1) {
        value = true;
      }
      if (value === 0) {
        value = false;
      }
    }
    return value;
  },

  async setWebsite(hostname, data) {
    const website = await this.getWebsite(hostname);

    if (!('hostname' in website)) {
      website['hostname'] = hostname;
    }

    for (const key in data) {
      const value = data[key];
      switch (key) {
        case 'requestTime':
          // store first and last request times for clearing data every X days
          if (!('firstRequestTime' in website)) {
            website.firstRequestTime = value;
          } else {
            website.lastRequestTime = value;
          }
          break;
        case 'isVisible':
          if ('isVisible' in website
              && website.isVisible === true) {
            // once a website is visible, it will always be visible
            break;
          }
          website.isVisible = value;
          break;
        case 'firstParty':
          if ('firstParty' in website
              && website.firstParty === true) {
            // once a website is a first party, it will always be drawn as one
            break;
          }
          website.firstParty = value;
          if (value) {
            website.isVisible = value;
          }
          break;
        default:
          website[key] = value;
          break;
      }
    }

    await this._write(website);

    return website;
  },


  async isNewWebsite(hostname) {
    if (!(await this.db.websites.get(hostname))) {
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

  // check if third party is on the allowlist (owned by the first party)
  // returns true if it is and false otherwise
  onAllowList(firstPartyFromRequest, thirdPartyFromRequest) {
    if (thirdPartyFromRequest && this.firstPartyAllowList) {
      const hostnameVariantsFirstParty
        = this.getHostnameVariants(firstPartyFromRequest);
      for (let i = 0; i < hostnameVariantsFirstParty.length; i++) {
        if (this.firstPartyAllowList
          .hasOwnProperty(hostnameVariantsFirstParty[i])) {
          // first party is in the allowlist
          const index = this.firstPartyAllowList[hostnameVariantsFirstParty[i]];
          const hostnameVariantsThirdParty
            = this.getHostnameVariants(thirdPartyFromRequest);
          for (let j = 0; j < hostnameVariantsThirdParty.length; j++) {
            if (this.thirdPartyAllowList[index]
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

  async setFirstParty(hostname, data) {
    if (!hostname) {
      throw new Error('setFirstParty requires a valid hostname argument');
    }

    const isNewWebsite = await this.isNewWebsite(hostname);

    const responseData = await this.setWebsite(hostname, data);

    if (isNewWebsite) {
      this.updateChild(this.outputWebsite(hostname, responseData));
    }
  },

  async setThirdParty(origin, target, data) {
    if (!origin) {
      throw new Error('setThirdParty requires a valid origin argument');
    }

    let isNewThirdParty = false;
    let shouldUpdate = false;

    const firstParty = await this.getWebsite(origin);
    const thirdParty = await this.getWebsite(target);

    // add link in third party if it doesn't exist yet
    if (!('firstPartyHostnames' in thirdParty)) {
      thirdParty['firstPartyHostnames'] = [];
    }
    if (!thirdParty['firstPartyHostnames'].includes(origin)) {
      thirdParty['firstPartyHostnames'].push(origin);
    }

    // add link in first party if it doesn't exist yet
    // and the third party is visible (i.e. not allowlisted)
    if (!this.isFirstPartyLinkedToThirdParty(firstParty, target)) {
      if (!this.isVisibleThirdParty(thirdParty)) {
        if (this.onAllowList(origin, target)) {
          // hide third party
          thirdParty['isVisible'] = false;
        } else {
          // show third party; it either became visible or is brand new
          thirdParty['isVisible'] = true;
          isNewThirdParty = true;
          for (let i = 0; i < thirdParty['firstPartyHostnames'].length; i++) {
            const firstPartyHostname = thirdParty['firstPartyHostnames'][i];
            await this.addFirstPartyLink(firstPartyHostname, target);
          }
          shouldUpdate = true;
        }
      }
      if (this.isVisibleThirdParty(thirdParty) && !isNewThirdParty) {
        // an existing visible third party links to a new first party
        await this.addFirstPartyLink(origin, target);
        shouldUpdate = true;
      }
    }

    // merge data with thirdParty
    for (const key in data) {
      thirdParty[key] = data[key];
    }

    const responseData = await this.setWebsite(target, thirdParty);

    if (shouldUpdate) {
      this.updateChild(this.outputWebsite(target, responseData));
    }
  },

  isFirstPartyLinkedToThirdParty(firstParty, thirdPartyHostname) {
    if (!('thirdPartyHostnames' in firstParty)
      || !firstParty['thirdPartyHostnames'].includes(thirdPartyHostname)) {
      return false;
    }
    return true;
  },

  isVisibleThirdParty(thirdParty) {
    if (!('isVisible' in thirdParty) || !thirdParty['isVisible']) {
      return false;
    }
    return true;
  },

  async addFirstPartyLink(firstPartyHostname, thirdPartyHostname) {
    const firstParty = await this.getWebsite(firstPartyHostname);
    // We are likely storing the tp first, lets account for that
    if (!('firstParty' in firstParty)) {
      firstParty.firstParty = true;
    }
    if (!('thirdPartyHostnames' in firstParty)) {
      firstParty['thirdPartyHostnames'] = [];
    }
    if (!this.isFirstPartyLinkedToThirdParty(firstParty, thirdPartyHostname)) {
      firstParty['thirdPartyHostnames'].push(thirdPartyHostname);
      await this.setFirstParty(firstPartyHostname, firstParty);
    }
  },

  async reset() {
    // empty out request processing queue
    capture.queue = [];
    return await this.db.websites.clear();
  },

  async getFirstRequestTime() {
    const oldestSite
      = await this.db.websites.orderBy('firstRequestTime').first();
    if (!oldestSite) {
      return false;
    }
    return oldestSite.firstRequestTime;
  },

  async getNumFirstParties() {
    return await this.db.websites.where('firstParty').equals(1).count();
  },

  async getNumThirdParties() {
    return await this.db.websites
      .where('firstParty').equals(0).and((website) => {
        return website.isVisible;
      }).count();
  }
};

store.init();
