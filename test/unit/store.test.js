'use strict';

describe('store.js', function() {
  describe('store getAll', function() {
    it('should get all websites from the store', function() {
      return store.getAll()
        .then(websites => {
          expect(websites).to.equal({});
        });  
    });
  });
});
