// transforms the object of nested objects 'websites' into a
// usable format for d3
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
  viz.update(transformedData.nodes, transformedData.links);
});
