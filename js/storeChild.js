// eslint-disable-next-line no-unused-vars
const storeChild = {
  callbacks: new Set(),

  init() {
    browser.runtime.onMessage.addListener((m) => {
      this.messageHandler(m);
    });
  },

  update(data) {
    this.callbacks.forEach((callback) => {
      callback(data);
    });
  },

  register(callback) {
    this.callbacks.add(callback);
  },

  messageHandler(m) {
    if (m.type !== 'storeChildCall') {
      return;
    }

    const publicMethods = ['update'];

    if (publicMethods.includes(m['method'])) {
      const args = m.args;
      return this[m['method']](...args);
    }
  },

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

storeChild.init();
