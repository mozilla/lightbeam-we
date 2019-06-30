// eslint-disable-next-line no-unused-vars
const lightbeamVR = {
  init() {
    this.loadLightbeamVR();
  },

  loadLightbeamVR() {
    const vrView = document.getElementById('vr-view-button');
    vrView.addEventListener('click', async () => {
      await this.runLightbeam();
    });
  },

  async runLightbeam() {
    // Checks to see if LightbeamVR is already open.
    // Returns true if it is, false if not.
    const fullUrl = browser.extension.getURL('indexVR.html');
    async function isOpen() {
      const tabs = await browser.tabs.query({});
      const lightbeamTabs = tabs.filter((tab) => {
        return (tab.url === fullUrl);
      });
      return lightbeamTabs[0] || false;
    }

    const lightbeamTab = await isOpen();
    if (!lightbeamTab) {
      // only open a new LightbeamVR instance if one isn't already open.
      browser.tabs.create({ url: fullUrl });
    } else if (!lightbeamTab.active) {
      // re-focus LightbeamVR if it is already open but lost focus.
      browser.tabs.reload(lightbeamTab.id);
      browser.tabs.update(lightbeamTab.id, {active: true});
    }
  }
};
