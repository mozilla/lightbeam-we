const store = {
  ALLOWLIST_URL: '/shavar-prod-lists/disconnect-entitylist.json',
  db: null,

  async init() {
    if (!this.db) {
      this.makeNewDatabase();
    }
    browser.runtime.onMessage.addListener((m) => store.messageHandler(m));
    await this.getAllowList();
  },

  makeNewDatabase() {
    this.db = new Dexie('websites_database');
    this.db.version(1).stores({
      // store: 'primaryKey, index1, index2, ...'
      websites: 'hostname, requestTime, isVisible, firstParty'
      // websites is a table
    });
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
      'getOldestDate',
      'getNumSitesVisited',
      'getNumThirdParties'
    ];

    if (publicMethods.includes(m['method'])) {
      const args = m.args;
      return this[m['method']](...args);
    } else {
      return new Error(`Unsupported method ${m.method}`);
    }
  },

  async _write(website) {
    return await this.db.websites.put(website);
  },

  outputWebsite(hostname, website) {
    const output = {
      hostname: hostname,
      favicon: website.faviconUrl || '',
      firstPartyHostnames: website.firstPartyHostnames || false,
      firstParty: 0,
      thirdParties: []
    };
    if (website.firstPartyHostnames === undefined) {
      output.firstParty = 1;
      if ('thirdPartyHostnames' in website) {
        output.thirdParties = website.thirdPartyHostnames;
      } else {
        output.thirdParties = [];
      }
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
      return website;
    } else {
      return {};
    }
  },

  async setWebsite(hostname, data) {

    const website = await this.getWebsite(hostname);

    if (!('hostname' in website)) {
      website['hostname'] = hostname;
    }

    for (const key in data) {
      website[key] = data[key];
    }

    await this._write(website);
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

    await this.setWebsite(hostname, data);

    if (isNewWebsite) {
      this.updateChild(this.outputWebsite(hostname, data));
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
          thirdParty['isVisible'] = 0;
        } else {
          // show third party; it either became visible or is brand new
          thirdParty['isVisible'] = 1;
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
    // @todo restructure storage to use data from capture for graph filtering
    for (const key in data) {
      thirdParty[key] = data[key];
    }

    await this.setWebsite(target, thirdParty);

    if (shouldUpdate) {
      this.updateChild(this.outputWebsite(target, thirdParty));
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

  async getOldestDate() {
    const oldestSite = await this.db.websites.orderBy('requestTime').first();
    if (!oldestSite) {
      return '';
    }
    return oldestSite.requestTime;
  },

  async getNumSitesVisited() {
    // Dexie does not accept boolean values; using 0/1 instead
    // http://dexie.org/docs/WhereClause/WhereClause.equals().html
    return await this.db.websites.where('firstParty').equals(1).count();
  },

  async getNumThirdParties() {
    // Dexie does not accept boolean values; using 0/1 instead
    // http://dexie.org/docs/WhereClause/WhereClause.equals().html
    return await this.db.websites
      .where('firstParty').equals(0).and((website) => {
        return website.isVisible;
      }).count();
  }
};

store.init();
