const store = {
  init() {
    this.addListeners();
  },

  getAll() {
    return this.get();
  },

  getFirstParties() {
    /*
    * similar to getAll() without the thirPartyRequests
    */
  },

  async getFirstParty(hostname) {
    if (!hostname) {
      return null;
    }

    const storage = await this.get();
    return storage.websites[`${hostname}`];
  },

  async getThirdParties(hostname) {
    if (!hostname) {
      return null;
    }

    const storage = await this.get();

    return storage.websites[`${hostname}`] ?
      storage.websites[`${hostname}`].thirdPartyRequests :
      null;
  },

  setFirstParty(param) {
    /**
     * @param object with hostname as key
     * @todo validate the param
     */
    return this.set(param);
  },

  async get(params) {
    /**
     * @params null, string, object or array of strings
     * @return websites object
     */
    const websites = await browser.storage.local.get(params);
    return websites || null;
  },

  async set(websites) {
    return await browser.storage.local.set({ websites });
  },

  async remove() {
    return await browser.storage.local.remove('websites');
  },

  addListeners() {
    browser.storage.onChanged.addListener((changes, area) => {
      /*
      * @todo update the code
      */
    });
  }
};

store.getAll()
  .then(websites => {
    console.log('get all websites:', websites);
  });

const params = {
  'a4.com': {
    faviconUrl: '/link/to/url',
    firstAccess: 123456,
    lastAccess: 7890123,
    thirdPartyRequests: {
      'doubleclick.net': {
        requestTime: 123456,
      },
      '2mdn.net': {
        requestTime: 123456,
        loadedBy: 'doubleclick.net'
      },
      'b.com': {},
      'c.com': {}
    }
  }
};

store.setFirstParty(params)
  .then(() => console.log('store set'))
  .catch((error) => console.log('error from set:', error));

store.getFirstParty('a1.com')
  .then(websites => {
    console.log('get a1.com:', websites);
  });

store.getThirdParties('a2.com')
  .then(websites => {
    console.log('thirdPartyRequests for a2.com:', websites);
  });

//store.remove();