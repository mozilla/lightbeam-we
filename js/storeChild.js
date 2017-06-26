// eslint-disable-next-line no-unused-vars
const storeChild = {
  async getAll() {
    return await this.parentMessage('getAll');
  },

  parentMessage(method, ...args) {
    return browser.runtime.sendMessage({
      type: 'storeCall',
      method,
      args
    });
  }
};
