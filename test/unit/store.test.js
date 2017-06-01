/* eslint no-undef: "off" */
/* eslint no-console: "off" */

/*
* @todo resolve 'assert' is undefined and turn 'on' the above eslint rules
* @todo use eslint-plugin-chai to resolve 'assert'
*/

'use strict';

describe('store.js', () => {
  describe('store get method', () => {
    const mockStore = {
      _websites: {
        'a1.com': {
          faviconUrl: '/link/to/url',
          firstAccess: 1234,
          lastAccess: 5678,
          thirdPartyRequests: {
            'a.com': {
              requestTime: 9012,
              cookies: []
            },
            'b.com': {},
            'c.com': {}
          }
        },
        'a2.com': {}
      },

      getAll() {
        return Promise.resolve(this._websites);
      },

      getFirstParty(hostname) {
        if (!hostname) {
          throw new Error('getFirstParty requires a valid hostname argument');
        }

        return Promise.resolve(this._websites[hostname]);
      },

      getThirdParties(hostname) {
        if (!hostname) {
          throw new Error('getFirstParty requires a valid hostname argument');
        }

        const firstParty = this._websites[hostname];
        if ('thirdPartyRequests' in firstParty) {
          return Promise.resolve(firstParty.thirdPartyRequests);
        }

        return Promise.resolve(null);
      }
    };

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
});
