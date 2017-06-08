const store = {
  _websites: null,

  init() {
    this._read();
  },

  async _read() {
    const data = await browser.storage.local.get('websites');
    this._websites = clone(data.websites);

    return this._websites;
  },

  async _write(websites) {
    this._websites = clone(websites);

    return await browser.storage.local.set({ websites });
  },

  async getAll() {
    return await this._read();
  },

  async getFirstParty(hostname) {
    if (!hostname) {
      throw new Error('getFirstParty requires a valid hostname argument');
    }

    const storage = await this.getAll();
    return storage.websites[hostname];
  },

  async getThirdParties(hostname) {
    if (!hostname) {
      throw new Error('getThirdParties requires a valid hostname argument');
    }

    const firstParty = await this.getFirstParty(hostname);
    if ('thirdPartyRequests' in firstParty) {
      return firstParty.thirdPartyRequests;
    }

    return null;
  },

  setFirstParty(hostname, data) {
    if (!hostname) {
      throw new Error('setFirstParty requires a valid domain argument');
    }

    const websites = clone(this._websites);
    websites[hostname] = data;
    this._write(websites);
  },

  setThirdParty(origin, target, data) {
    if (!origin) {
      throw new Error('setThirdParty requires a valid parent argument');
    }

    const firstParty = clone(this._websites[origin]);

    if (!('thirdPartyRequests' in firstParty)) {
      firstParty['thirdPartyRequests'] = {};
    }
    firstParty['thirdPartyRequests'][target] = data;

    this.setFirstParty(origin, firstParty);
  },

  async remove() {
    return await browser.storage.local.remove('websites');
  }
};

// @todo move this function to utils
function clone(obj) {
  return Object.assign({}, obj);
}

store.init();
