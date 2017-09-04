const lightbeam = {
  websites: {},

  async init() {
    this.websites = await storeChild.getAll();
    this.renderGraph();
    this.addListeners();
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
      const msgBegin = 'Pressing OK will delete all Lightbeam data. ';
      const msgEnd = 'Are you sure?';
      const confirmation = confirm(`${msgBegin + msgEnd}`);
      if (confirmation) {
        await storeChild.reset();
        window.location.reload();
      }
    });
  },

  redraw(data) {
    if (!(data.hostname in this.websites)) {
      this.websites[data.hostname] = data;
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
  },
};

window.onload = () => {
  lightbeam.init();
};
