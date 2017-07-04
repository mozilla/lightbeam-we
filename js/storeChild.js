const storeChildObject = {
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

  onUpdate(callback) {
    this.callbacks.add(callback);
  },

  messageHandler(m) {
    if (m.type !== 'storeChildCall') {
      return;
    }

    const args = m.args;
    return this.update(...args);
  },

  parentMessage(method, ...args) {
    return browser.runtime.sendMessage({
      type: 'storeCall',
      method,
      args
    });
  }
};

const storeChild = new Proxy(storeChildObject, {
  get(target, prop) {
    if (target[prop] === undefined) {
      return async function(...args)  {
        return await this.parentMessage(prop, ...args);
      };
    } else {
      return target[prop];
    }
  }
});

storeChild.init();
