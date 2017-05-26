const store = {
  init() {
    this.addListeners();
  },

  async getAll() {
    return await browser.storage.local.get();
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

  setFirstParty(param) {
    /**
     * @param object with hostname as key
     * @todo validate the param.-
     * @todo code to be updated in next PR
     */
    return this.set(param);
  },

  async set(websites) {
    /**
      * @todo rewrite this method so that websites object is updated with additional hostnames
      * @todo code to be updated in next PR
    */
    return await browser.storage.local.set({ websites });
  },

  async remove() {
    return await browser.storage.local.remove('websites');
  },

  addListeners() {
    /*
    * @todo update the code
    */
  }
};

store.init();
/*
store.getAll()
  .then(websites => {
    console.log('get all websites:', websites);
  });

store.getFirstParty('a4.com')
  .then(firtParty => {
    console.log('firtParty:', firtParty);
  })
  .catch(error => {
    console.log('error from getFirstParty:', error.message);
  });

store.getThirdParties('a4.com')
  .then(thirdParties => {
    console.log('thirdParties:', thirdParties);
  })
  .catch(error => {
    console.log('error from getThirdParties:', error.message);
  });
*/