async function renderGraph() {
  const websites = await store.getAll();

  // reformat data for D3
  const nodes_data = [];
  const links_data = [];
  // make first party nodes
  for (const firstParty in websites) {
    const node = {};
    node.hostname = firstParty;
    node.favicon = websites[firstParty].faviconUrl || '';
    node.party = 'first';
    nodes_data.push(node);
    // make third party nodes and links
    for (const thirdParty in websites[firstParty].thirdPartyRequests) {
      const node = {};
      const link = {};
      link.source = firstParty;
      link.target = thirdParty;
      node.hostname = thirdParty;
      // third parties likely don't have favicons
      node.favicon = '';
      node.party = 'third';
      nodes_data.push(node);
      links_data.push(link);
    }
  }

  // set up area of the page to put the graph
  const svg = d3.select('svg');
  const width = svg.attr('width');
  const height = svg.attr('height');

  // set up simulation
  const simulation = d3.forceSimulation().nodes(nodes_data);

  // add forces
  simulation
    // charge force treats each node as a charged particle,
    // so that nodes will repel each other when they get too close together
    .force('charge_force', d3.forceManyBody())
    // centering force drives all nodes torward the center of the canvas
    .force('center_force', d3.forceCenter(width/2, height/2))
    // link force constrains the nodes' motion based on how they are linked
    .force('links', d3.forceLink(links_data).id(function(d) {
      return d.hostname;
    }));

  // draw the elements onto the page
  viz.draw(nodes_data, links_data, simulation);
}

window.onload = renderGraph;
