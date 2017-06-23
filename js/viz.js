// eslint-disable-next-line no-unused-vars
const viz = {
  draw() {
    const a = { id: 'a' };
    const b = { id: 'b' };
    const c = { id: 'c' };
    const d = { id: 'd' };
    const e = { id: 'e' };
    const f = { id: 'f' };
    const g = { id: 'g' };
    const h = { id: 'h' };
    const i = { id: 'i' };
    const j = { id: 'j' };
    let nodes = [a, b, c, d, e, f, g, h, i, j];
    let links = [
      { source: a, target: b },
      { source: b, target: c },
      { source: c, target: d },
      { source: d, target: e },
      { source: e, target: f },
      { source: f, target: g },
      { source: g, target: h },
      { source: h, target: i },
      { source: i, target: j },
      { source: j, target: a }
    ];

    const svg = d3.select('svg');

    // D3 needs explicit pixel values for 'center_force'
    const visualization = document.getElementById('visualization');
    const width = visualization.getBoundingClientRect().width;
    const height = visualization.getBoundingClientRect().height;

    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody())
      .force('link', d3.forceLink(links).distance(50))
      .force('center', d3.forceCenter(width/2, height/2))
      .alphaTarget(1)
      .on('tick', ticked);

    let link = svg.append('g').attr('class', 'links').selectAll('.link');
    let node = svg.append('g').attr('class', 'nodes').selectAll('.node');

    // initial render
    update();

    // when data changes, update
    // this could be from the browser.storage.onchange event for
    // `websites`
    d3.interval(function() {
      const d = { id: 'd'};
      nodes = [a, b, c, d, e];
      links = [
        { source: a, target: b },
        { source: b, target: c },
        { source: c, target: d },
        { source: d, target: e },
        { source: e, target: a }
      ];
      update();
    }, 2000, d3.now());

    d3.interval(function() {
      nodes = [a, b, c, d, e, f, g, h, i, j];
      links = [
        { source: a, target: b },
        { source: b, target: c },
        { source: c, target: d },
        { source: d, target: e },
        { source: e, target: f },
        { source: f, target: g },
        { source: g, target: h },
        { source: h, target: i },
        { source: i, target: j },
        { source: j, target: a }
      ];
      update();
    }, 2000, d3.now() + 1000);

    function update() {
      // Apply the general update pattern to the nodes.
      node = node.data(nodes, function(d) { return d.id; });
      node.exit().remove();
      node = node
        .enter()
        .append('circle')
        .attr('fill', 'red')
        .attr('r', 5)
        .merge(node);

      // Apply the general update pattern to the links.
      link = link
        .data(links, function(d) { return `${d.source.id}-${d.target.id}`;});
      link.exit().remove();
      link = link.enter().append('line').merge(link);

      // Update and restart the simulation.
      simulation.nodes(nodes);
      simulation.force('link').links(links);
      simulation.alpha(1).restart();
    }

    function ticked() {
      node.attr('cx', function(d) { return d.x; })
          .attr('cy', function(d) { return d.y; });

      link.attr('x1', function(d) { return d.source.x; })
          .attr('y1', function(d) { return d.source.y; })
          .attr('x2', function(d) { return d.target.x; })
          .attr('y2', function(d) { return d.target.y; });
    }
  }
};
