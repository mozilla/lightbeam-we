'use strict';

describe('store.js', function() {
  describe('store get method', function() {
    it('should get an empty object', () => {
      store.getEmptyObject((result) => {
        expect(result).to.equal({});
      });
    });
  });
});
