/* eslint no-undef: "off" */

const store = {
  _websites: null,

  async init() {
    const data = await browser.storage.local.get('websites');
    this._websites = clone(data.websites);

    this.addListeners();
  },

  async _write(websites) {
    this._websites = clone(websites);

    return await browser.storage.local.set({ websites });
  },

  getAll() {
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
    websites[hostname] = data;
    this._write(websites);
  },

  setThirdParty(origin, target, data) {
    if (!origin) {
      throw new Error('setThirdParty requires a valid origin argument');
    }

    const websites = clone(this._websites);
    const firstParty = clone(websites[origin]);

    if (!('thirdPartyRequests' in firstParty)) {
      firstParty['thirdPartyRequests'] = {};
    }
    firstParty['thirdPartyRequests'][target] = data;

    this.setFirstParty(origin, firstParty);
  },

  async remove() {
    return await browser.storage.local.remove('websites');
  },

  addListeners() {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.hasOwnProperty('websites')) {
        viz.draw(changes['websites']['newValue']);
      }
    });
  }
};

// @todo move this function to utils
function clone(obj) {
  return Object.assign({}, obj);
}

store.init();
