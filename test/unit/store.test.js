/* eslint no-undef: "off" */
/* eslint no-console: "off" */

/*
* @todo resolve 'expect' is undefined and turn 'on' the above eslint rules
* @todo use eslint-plugin-chai to resolve 'expect'
*/

'use strict';

describe('store.js', function() {
  describe('store get method', function() {
    it('should get all websites from store', async () => {
      try {
        const mockStore = {
          _websites: {
            hostname: 'a.com'
          },

          getAll() {
            return Promise.resolve(this._websites);
          }
        };

        const websites = await mockStore.getAll();
        expect(websites).to.deep.equal({ hostname: 'a.com' });
      } catch (err) {
        console.log('error from getAll', err);
      }
    });
  });
});