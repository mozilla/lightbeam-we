'use strict';

describe('store.js', function() {
  describe('store get method', function() {
    it('should get an empty object', () => {
      store.getEmptyObject((result) => {
        expect(result).to.equal({});
      });
    });

    it('should get all websites from store', async function(done) {
      try {
        const websites = await store.getAll();
        expect(websites).to.equal({});
        done();
      } catch (err) {
        done(err);
      }
    });
  });
});
