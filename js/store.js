// eslint-disable-next-line no-unused-vars
const store = {
  _websites: null,

  async init() {
    if (!this._websites) {
      const data = await browser.storage.local.get('websites');

      if (data.websites) {
        this._websites = clone(data.websites);
      }
    }
    browser.runtime.onMessage.addListener((m) => store.messageHandler(m));
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

  outputWebsite(hostname, website, firstPartyHostname) {
    const output = {
      hostname: hostname,
      favicon: website.faviconUrl || '',
      firstPartyHostname: firstPartyHostname || false,
      firstParty: false
    };
    if (firstPartyHostname === undefined) {
      output.firstParty = true;
      if ('thirdPartyRequests' in website) {
        output.thirdParties = Object.keys(website.thirdPartyRequests);
      } else {
        output.thirdParties = [];
      }
    }
    return output;
  },

  getAll() {
    const output = {};
    for (const firstParty in this._websites) {
      const website = this._websites[firstParty];
      output[firstParty] = this.outputWebsite(firstParty, website);
      if (website.thirdPartyRequests) {
        for (const thirdParty in website.thirdPartyRequests) {
          output[thirdParty] = this.outputWebsite(thirdParty,
            website.thirdPartyRequests[thirdParty],
            firstParty);
        }
      }
    }
    return Promise.resolve(output);
  },

  getFirstParty(hostname) {
    if (!hostname) {
      throw new Error('getFirstParty requires a valid hostname argument');
    }

    return this._websites[hostname];
  },

  getThirdParties(hostname) {
    if (!hostname) {
      throw new Error('getThirdParties requires a valid hostname argument');
    }

    const firstParty = this.getFirstParty(hostname);
    if ('thirdPartyRequests' in firstParty) {
      return firstParty.thirdPartyRequests;
    }

    return null;
  },

  setFirstParty(hostname, data) {
    let newSite = false;
    if (!hostname) {
      throw new Error('setFirstParty requires a valid hostname argument');
    }

    const websites = clone(this._websites);

    if (!websites[hostname]) {
      newSite = true;
      websites[hostname] = {};
    }

    for (const key in data) {
      websites[hostname][key] = data[key];
    }

    this._write(websites);

    if (newSite) {
      this.updateChild(this.outputWebsite(hostname, websites[hostname]));
    }
  },

  setThirdParty(origin, target, data) {
    let newThirdParty = false;
    if (!origin) {
      throw new Error('setThirdParty requires a valid origin argument');
    }

    let firstParty = this.getFirstParty(origin);
    if (!firstParty) {
      firstParty = {};
    }
    if (!('thirdPartyRequests' in firstParty)) {
      firstParty['thirdPartyRequests'] = {};
    }
    if (!(target in firstParty['thirdPartyRequests'])) {
      newThirdParty = true;
    }
    firstParty['thirdPartyRequests'][target] = data;

    this.setFirstParty(origin, firstParty);

    if (newThirdParty) {
      this.updateChild(this.outputWebsite(target, data, origin));
    }
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
// @todo end

store.init();
