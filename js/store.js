const store = {
  _websites: null,

  async init() {
    if(!this._websites || isObjectEmpty(this._websites)) {
      const data = await browser.storage.local.get('websites');

      if(!data.websites) {
        await this._write({});
      } else {
        this._websites = clone(data.websites);
      }
    }
  },

  async _write(websites) {
    this._websites = clone(websites);

    return await browser.storage.local.set({ websites });
  },

  async getAll() {
    await this.init();
    return clone(this._websites);
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
    if (!hostname) {
      throw new Error('setFirstParty requires a valid hostname argument');
    }

    const websites = clone(this._websites);

    if(!websites[hostname]) {
      websites[hostname] = {};
    }

    for(const key in data) {
      websites[hostname][key] = data[key];
    }

    this._write(websites);
  },

  setThirdParty(origin, target, data) {
    if (!origin) {
      throw new Error('setThirdParty requires a valid origin argument');
    }

    const firstParty = this.getFirstParty(origin);

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

function isObjectEmpty(obj) {
  return Object.keys(obj).length === 0;
}

store.init();
