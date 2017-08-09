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
function transformData(websites) {
  const nodes = [];
  let links = [];
  for (const website in websites) {
    const site = websites[website];
    if (site.firstParty) {
      const thirdPartyLinks = site.thirdParties.map((thirdParty) => {
        return {
          source: website,
          target: thirdParty
        };
      });
      links = links.concat(thirdPartyLinks);
    }
    nodes.push(websites[website]);
  }

  return {
    nodes,
    links
  };
}

function renderGraph(websites) {
  const transformedData = transformData(websites);
  viz.init(transformedData.nodes, transformedData.links);
}

let websites;

async function initLightBeam() {
  websites = await storeChild.getAll();
  renderGraph(websites);

  const saveData = document.getElementById('save-data-button');
  saveData.addEventListener('click', () => {
    storeChild.getAll().then( data => {
      const blob = new Blob([JSON.stringify(data,' ',2)],
        {type : 'application/json'});
      const url = window.URL.createObjectURL(blob);
      browser.tabs.create({url: url});
    });
  });

  const resetData = document.getElementById('reset-data-button');
  resetData.addEventListener('click', () => {
    storeChild.reset().then(() => {
      window.location.reload();
    });
  });
}

window.onload = initLightBeam;

storeChild.onUpdate((data) => {
  if (!(data.hostname in websites)) {
    websites[data.hostname] = data;
  }
  if (!data.firstParty) {
    // if we have the first parties make the link if they don't exist
    data.firstPartyHostnames.forEach((firstPartyHostname) => {
      if (websites[firstPartyHostname]) {
        const firstPartyWebsite = websites[firstPartyHostname];
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
  const transformedData = transformData(websites);
  viz.draw(transformedData.nodes, transformedData.links);
});
