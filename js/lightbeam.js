const lightbeam = {
  websites: {},
  dataGatheredSince: '',
  numSitesVisited: 0,
  numThirdParties: 0,

  async init() {
    this.websites = await storeChild.getAll();
    this.renderGraph();
    this.addListeners();
    this.updateVars();
  },

  renderGraph() {
    const transformedData = this.transformData();
    viz.init(transformedData.nodes, transformedData.links);
  },

  addListeners() {
    this.downloadData();
    this.resetData();
    storeChild.onUpdate((data) => {
      this.redraw(data);
    });
  },

  // Called from init() (isFirstParty = undefined)
  // and redraw() (isFirstParty = 1 or 0).
  async updateVars(isFirstParty) {
    const numSitesVisited = document.getElementById('num-sites-visited');
    const numThirdParties = document.getElementById('num-third-parties');

    // initialize dynamic vars from storage
    if (!this.dataGatheredSince) {
      this.dataGatheredSince = await this.getDataGatheredSince();
      const dataGatheredSince = document.getElementById('data-gathered-since');
      dataGatheredSince.textContent = this.dataGatheredSince;
    }
    if (isFirstParty === undefined) {
      this.numSitesVisited = await this.getNumSitesVisited();
      numSitesVisited.textContent = this.numSitesVisited;
      this.numThirdParties = await this.getNumThirdParties();
      numThirdParties.textContent = this.numThirdParties;
      return;
    }

    // update on redraw
    if (isFirstParty) {
      this.numSitesVisited++;
      numSitesVisited.textContent = this.numSitesVisited;
    } else {
      this.numThirdParties++;
      numThirdParties.textContent = this.numThirdParties;
    }
  },

  async getDataGatheredSince() {
    const oldestDateUnixTime = await storeChild.getOldestDate();
    if (!oldestDateUnixTime) {
      return '';
    }
    // reformat unix time
    const fullDateTime = new Date(oldestDateUnixTime);
    return fullDateTime.toDateString();
  },

  async getNumSitesVisited() {
    return await storeChild.getNumSitesVisited();
  },

  async getNumThirdParties() {
    return await storeChild.getNumThirdParties();
  },

  // transforms the object of nested objects 'websites' into a
  // usable format for d3
  /*
    websites is expected to match this format:
    {
      "www.firstpartydomain.com": {
        favicon: "http://blah...",
        firstParty: true,
        firstPartyHostnames: false,
        hostname: "www.firstpartydomain.com",
        thirdParties: [
          "www.thirdpartydomain.com",
          ...
        ]
      },
      "www.thirdpartydomain.com": {
        favicon: "",
        firstParty: false,
        firstPartyHostnames: [
          "www.firstpartydomain.com",
          ...
        ],
        hostname: "www.thirdpartydomain.com",
        thirdParties: []
      },
      ...
    }

    nodes is expected to match this format:
    [
      {
        favicon: "http://blah...",
        firstParty: true,
        firstPartyHostnames: false,
        hostname: "www.firstpartydomain.com",
        thirdParties: [
          "www.thirdpartydomain.com",
          ...
        ]
      },
      {
        favicon: "",
        firstParty: false,
        firstPartyHostnames: [
          "www.firstpartydomain.com",
          ...
        ],
        hostname: "www.thirdpartydomain.com",
        thirdParties: []
      },
      ...
    ]

    links is expected to match this format:
    [
      {
        source: {
          favicon: "http://blah...",
          firstParty: true,
          firstPartyHostnames: false,
          hostname: "www.firstpartydomain.com",
          thirdParties: [
            "www.thirdpartydomain.com",
            ...
          ]
        },
        target: {
          favicon: "",
          firstParty: false,
          firstPartyHostnames: [
            "www.firstpartydomain.com",
            ...
          ],
          hostname: "www.thirdpartydomain.com",
          thirdParties: []
        }
      },
      ...
    ]
  */
  transformData() {
    const nodes = [];
    let links = [];
    for (const website in this.websites) {
      const site = this.websites[website];
      if (site.firstParty) {
        const thirdPartyLinks = site.thirdParties.map((thirdParty) => {
          return {
            source: website,
            target: thirdParty
          };
        });
        links = links.concat(thirdPartyLinks);
      }
      nodes.push(this.websites[website]);
    }

    return {
      nodes,
      links
    };
  },

  downloadData() {
    const saveData = document.getElementById('save-data-button');
    saveData.addEventListener('click', async () => {
      const data = await storeChild.getAll();
      const blob = new Blob([JSON.stringify(data ,' ' , 2)],
        {type : 'application/json'});
      const url = window.URL.createObjectURL(blob);
      const downloading = browser.downloads.download({
        url : url,
        filename : 'lightbeamData.json',
        conflictAction : 'uniquify'
      });
      await downloading;
    });
  },

  resetData() {
    const resetData = document.getElementById('reset-data-button');
    resetData.addEventListener('click', async () => {
      await storeChild.reset();
      window.location.reload();
    });
  },

  redraw(data) {
    if (!(data.hostname in this.websites)) {
      this.websites[data.hostname] = data;
      this.updateVars(data.firstParty);
    }
    if (!data.firstParty) {
      // if we have the first parties make the link if they don't exist
      data.firstPartyHostnames.forEach((firstPartyHostname) => {
        if (this.websites[firstPartyHostname]) {
          const firstPartyWebsite = this.websites[firstPartyHostname];
          if (!('thirdParties' in firstPartyWebsite)) {
            firstPartyWebsite.thirdParties = [];
            firstPartyWebsite.firstParty = true;
          }
          if (!(firstPartyWebsite.thirdParties.includes(data.hostname))) {
            firstPartyWebsite.thirdParties.push(data.hostname);
          }
        }
      });
    }
    const transformedData = this.transformData(this.websites);
    viz.draw(transformedData.nodes, transformedData.links);
  }
};

window.onload = () => {
  lightbeam.init();
};
