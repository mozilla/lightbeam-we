async function renderGraph() {
  const websites = await store.getAll();

  // reformat data for D3

  // nodes data to draw
  const nodes_data =  [
      {'name': 'Travis', 'sex': 'M'},
      {'name': 'Rake', 'sex': 'M'},
      {'name': 'Diana', 'sex': 'F'},
      {'name': 'Rachel', 'sex': 'F'},
      {'name': 'Shawn', 'sex': 'M'},
      {'name': 'Emerald', 'sex': 'F'}
  ];

  // links data to draw
  var links_data = [
      {'source': 'Travis', 'target': 'Rake'},
      {'source': 'Diana', 'target': 'Rake'},
      {'source': 'Diana', 'target': 'Rachel'},
      {'source': 'Rachel', 'target': 'Rake'},
      {'source': 'Rachel', 'target': 'Shawn'},
      {'source': 'Emerald', 'target': 'Rachel'}
  ];

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
      return d.name;
    }));

  // draw the elements onto the page
  viz.draw(nodes_data, links_data, simulation);
}

window.onload = renderGraph;
