// transforms the object of nested objects 'websites' into a
// usable format for d3
function transformData(websites) {
  const nodes = [];
  const links = [];
  const firstParties = new Set();
  const thirdParties = new Set();
  // make first party nodes
  for (const firstParty in websites) {
    const firstPartyNode = createWebsite(firstParty);
    firstParties.add(firstPartyNode);
    nodes.push(firstPartyNode);
    // make third party nodes and links
    if (websites[firstParty].thirdPartyRequests) {
      for (const thirdParty in websites[firstParty].thirdPartyRequests) {
        const thirdPartyNode = createWebsite(thirdParty);
        thirdParties.add(thirdPartyNode);
        if (!firstParties.has(thirdPartyNode)) {
          nodes.push(thirdPartyNode);
        }
        const link = {};
        link.source = firstParty;
        link.target = thirdParty;
        links.push(link);
      }

    }
  }

  function createWebsite(website) {
    const websiteOutput = {
      hostname: website,
      favicon: websites[website] ? websites[website].faviconUrl : '',
      party: websites[website] ? 'first' : 'third'
    };
    return websiteOutput;
  }

  return {
    nodes: nodes,
    links: links
  };
}

async function renderGraph() {
  const websites = await storeChild.getAll();
  const transformedData = transformData(websites);
  viz.init(transformedData.nodes, transformedData.links);
}

window.onload = renderGraph;

storeChild.register((data) => {
  console.log(data);
});
