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
  childMessage(method, ...args) {
    return browser.runtime.sendMessage({
      type: 'storeChildCall',
      method,
      args
    });
  },

  messageHandler(m) {
    if (m.type !== 'storeCall') {
      return;
    }

    const publicMethods = ['getAll'];

    if (publicMethods.includes(m['method'])) {
      const args = m.args;
      return this[m['method']](...args);
    }
  },

  async _write(websites) {
    this._websites = clone(websites);

    return await browser.storage.local.set({ websites });
  },

  async getAll() {
    return this._websites;
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

    if (!websites[hostname]) {
      websites[hostname] = {};
    }

    for (const key in data) {
      websites[hostname][key] = data[key];
    }

    this._write(websites);

    // update visualization with changes
    // @todo: update only when new sites or links are added to the store
    const updatedData = {
      hostname: hostname,
      data: data,
      party: 'first'
    };
    this.childMessage('update', updatedData);
  },

  setThirdParty(origin, target, data) {
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
    firstParty['thirdPartyRequests'][target] = data;

    this.setFirstParty(origin, firstParty);

    // update visualization with changes
    // @todo update only when new sites or links are added to the store
    const updatedData = {
      hostname: target,
      data: data,
      party: 'third'
    };
    this.childMessage('update', updatedData);
  },

  async remove() {
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
