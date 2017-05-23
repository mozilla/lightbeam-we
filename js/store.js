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
    /**
      *@todo rewrite this method so that websites object is updated with additional hostnames
    */
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