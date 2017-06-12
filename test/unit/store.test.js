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
  const mockWebsites = {
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
  };

  const mockStore = {
    _websites: null,

    init() {
      this._websites = clone(mockWebsites);
    },

    _write(websites) {
      this._websites = clone(websites);
      return Promise.resolve();
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
        throw new Error('getFirstParty requires a valid hostname argument');
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
    }
  };

  describe('store get method', () => {
    it('should initialise _websites to mockWebsites', (done) => {
      mockStore.init();
      const websites = mockStore.getAll();
      assert.deepEqual(websites, mockWebsites);
      done();
    });

    it('should get all websites from store', (done) => {
      const websites = mockStore.getAll();
      assert.deepEqual(websites, mockWebsites);
      done();
    });

    it('should get website object for a1.com', (done) => {
      const website = mockStore.getFirstParty('a1.com');
      assert.deepEqual(website, mockWebsites['a1.com']);
      done();
    });

    it('error thrown when hostname is not passed for getFirstParty()',
      () => {
        try {
          mockStore.getFirstParty();
        } catch (err) {
          console.log('error from getFirstParty', err);
        }
      });

    it('should get thirdPartyRequests for a1.com', (done) => {
      const thirdParties = mockStore.getThirdParties('a1.com');
      const mockThirdParties = mockWebsites['a1.com'].thirdPartyRequests;
      assert.deepEqual(thirdParties, mockThirdParties);
      done();
    });

    it('error thrown when hostname is not passed for getThirdParties()',
      () => {
        try {
          mockStore.getThirdParties();
        } catch (err) {
          console.log('error from getThirdParties', err);
        }
      });

    it('should return null for getThirdParties()', (done) => {
      const thirdPartyRequests = mockStore.getThirdParties('a2.com');
      assert.equal(thirdPartyRequests, null);
      done();
    });
  });

  describe('store set method', () => {
    it('should set firstParty c1.com', (done) => {
      mockStore.setFirstParty('c1.com', { faviconUrl: '/ccc/ccc' });
      const website = mockStore.getFirstParty('c1.com');
      assert.deepEqual(website, mockStore._websites['c1.com']);
      done();
    });

    it('should set thirdParty for c1.com', (done) => {
      mockStore.setThirdParty('c1.com', 'c11.com', { faviconUrl: '/c1/c1' });
      const thirdParties = mockStore.getThirdParties('c1.com');
      const mockThirdParties = mockStore._websites['c1.com'].thirdPartyRequests;
      assert.deepEqual(thirdParties, mockThirdParties);
      done();
    });
  });
});
