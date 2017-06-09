/* eslint no-undef: "off" */
/* eslint no-console: "off" */

/*
* @todo resolve 'assert' is undefined and turn 'on' the above eslint rules
* @todo use eslint-plugin-chai to resolve 'assert'
*/
'use strict';

function clone(obj) {
  return Object.assign({}, obj);
}

describe('store.js', () => {
  const mockStore = {
    _websites: {
      'a1.com': {
        faviconUrl: '/link/to/url',
        firstAccess: 1234,
        lastAccess: 5678,
        thirdPartyRequests: {
          'a.com': { requestTime: 9012 },
          'b.com': {},
          'c.com': {}
        }
      },
      'a2.com': {}
    },

    _read() {
      return Promise.resolve(this._websites);
    },

    _write(websites) {
      this._websites = websites;
      return this._read();
    },

    async getAll() {
      return await this._read();
    },

    async getFirstParty(hostname) {
      if (!hostname) {
        throw new Error('getFirstParty requires a valid hostname argument');
      }

      const websites = await this.getAll();
      return websites[hostname];
    },

    async getThirdParties(hostname) {
      if (!hostname) {
        throw new Error('getFirstParty requires a valid hostname argument');
      }

      const firstParty = await this.getFirstParty(hostname);
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

      const firstParty = clone(this._websites[origin]);

      if (!('thirdPartyRequests' in firstParty)) {
        firstParty['thirdPartyRequests'] = {};
      }
      firstParty['thirdPartyRequests'][target] = data;

      this.setFirstParty(origin, firstParty);
    }
  };

  describe('store get method', () => {
    it('should get all websites from store', async () => {
      const websites = await mockStore.getAll();
      assert.deepEqual(websites, mockStore._websites);
    });

    it('should get website object for a1.com', async () => {
      const website = await mockStore.getFirstParty('a1.com');
      assert.deepEqual(website, mockStore._websites['a1.com']);
    });

    it('error thrown when hostname is not passed for getFirstParty()',
      async () => {
        try {
          await mockStore.getFirstParty();
        } catch (err) {
          console.log('error from getFirstParty', err);
        }
      });

    it('should get thirdPartyRequests for a1.com', async () => {
      const thirdParties = await mockStore.getThirdParties('a1.com');
      const mockThirdParties = mockStore._websites['a1.com'].thirdPartyRequests;
      assert.deepEqual(thirdParties, mockThirdParties);
    });

    it('error thrown when hostname is not passed for getThirdParties()',
      async () => {
        try {
          await mockStore.getThirdParties();
        } catch (err) {
          console.log('error from getThirdParties', err);
        }
      });

    it('should return null for getThirdParties()', async () => {
      const thirdPartyRequests = await mockStore.getThirdParties('a2.com');
      assert.equal(thirdPartyRequests, null);
    });
  });

  describe('store set method', () => {
    it('should set firstParty c1.com', async () => {
      mockStore.setFirstParty('c1.com', { faviconUrl: '/ccc/ccc' });
      const website = await mockStore.getFirstParty('c1.com');
      assert.deepEqual(website, mockStore._websites['c1.com']);
    });

    it('should set thirdParty for c1.com', async () => {
      mockStore.setThirdParty('c1.com', 'c11.com', { faviconUrl: '/c1/c1' });
      const thirdParties = await mockStore.getThirdParties('c1.com');
      const mockThirdParties = mockStore._websites['c1.com'].thirdPartyRequests;
      assert.deepEqual(thirdParties, mockThirdParties);
    });
  });
});
