const store = {
  async init() {
    const data = await this._read();
    this._websites = data || null;
    this.addListeners();
  },

  async _read() {
    return await browser.storage.local.get('websites');
  },

  async _write(websites) {
    this._websites = websites;

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

  async setFirstParty(domain, data) {
    const websites = await this._read();
    websites[domain] = data;

    this._write(websites);
  },

  async setThirdParty(parent, domain, data) {
    const websites = await this._read();
    const firstParty = websites[parent];
    firstParty['thirdPartyRequests'][domain] = data;

    this.setFirstParty(parent, firstParty);
  },

  async remove() {
    return await browser.storage.local.remove('websites');
  },

  addListeners() {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.hasOwnProperty('website')) {
        this._websites = changes['websites'];
      }
    });
  }
};

store.init();
