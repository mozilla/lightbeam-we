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
      output[hostname] = this.outputWebsite(hostname, website);
    }
    return Promise.resolve(output);
  },

  getWebsite(hostname) {
    if (!hostname) {
      throw new Error('getWebsite requires a valid hostname argument');
    }

    return this._websites[hostname];
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
    let newSite = false;

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

  setFirstParty(hostname, data) {
    if (!hostname) {
      throw new Error('setFirstParty requires a valid hostname argument');
    }
    this.setWebsite(hostname, data);
  },

  setThirdParty(origin, target, data) {
    let newThirdParty = false;
    if (!origin) {
      throw new Error('setThirdParty requires a valid origin argument');
    }

    const firstParty = this.getWebsite(origin) || {};
    const thirdParty = this.getWebsite(target) || {};
    if (!('thirdPartyHostnames' in firstParty)) {
      firstParty['thirdPartyHostnames'] = [];
    }
    if (!firstParty['thirdPartyHostnames'].includes(target)) {
      firstParty['thirdPartyHostnames'].push(target);
      newThirdParty = true;
    }
    if (!('firstPartyHostnames' in firstParty)) {
      thirdParty['firstPartyHostnames'] = [];
    }
    if (!thirdParty['firstPartyHostnames'].includes(origin)) {
      thirdParty['firstPartyHostnames'].push(origin);
      newThirdParty = true;
    }

    this.setWebsite(origin, firstParty);
    this.setWebsite(target, thirdParty);

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
