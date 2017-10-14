// eslint-disable-next-line no-unused-vars
const lightbeamVR = {
  init() {
    this.loadLightbeamVR();
  },

  loadLightbeamVR() {
    const vrView = document.getElementById('vr-view-button');
    vrView.addEventListener('click', async () => {
      await this.getData();
      await this.runLightbeam();
    });
  },

  transformData(data) {
    const nodes = [];
    let links = [];
    for (const website in data) {
      const site = data[website];
      data[website].id = site.hostname;
      data[website].name = site.hostname;
      if (site.thirdParties) {
        const thirdPartyLinks = site.thirdParties.map((thirdParty) => {
          return {
            source: website,
            target: thirdParty
          };
        });
        links = links.concat(thirdPartyLinks);
      }
      nodes.push(data[website]);
    }

    return {
      nodes,
      links
    };
  },

  async getData() {
    const data = await storeChild.getAll();
    const transformedData = this.transformData(data);
    const blob = new Blob([JSON.stringify(transformedData ,' ' , 2)],
      {type : 'application/json'});
    const url = window.URL.createObjectURL(blob);
    const downloading = browser.downloads.download({
      url : url,
      filename : 'data.json',
      conflictAction : 'overwrite',
      saveAs: true
    });
    await downloading;
  },

  async runLightbeam() {
    // Checks to see if Lightbeam is already open.
    // Returns true if it is, false if not.
    let fullUrl = null;
    async function isOpen() {
      const tabs = await browser.tabs.query({});
      fullUrl = browser.extension.getURL('http://localhost:3000');
      const lightbeamTabs = tabs.filter((tab) => {
        return (tab.url === fullUrl);
      });
      return lightbeamTabs[0] || false;
    }

    const lightbeamTab = await isOpen();
    if (!lightbeamTab && fullUrl) {
      // only open a new LightbeamVR instance if one isn't already open.
      browser.tabs.create({ url: fullUrl });
    } else if (!lightbeamTab.active) {
       // re-focus LightbeamVR if it is already open but lost focus
      browser.tabs.update(lightbeamTab.id, {active: true});
    }
  }
};
