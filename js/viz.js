// eslint-disable-next-line no-unused-vars
const viz = {
  draw(nodes_data, links_data, simulation) {
    // get graph area
    const svg = d3.select('svg');

    // separate first from third party nodes
    const nodes_firstParty = [];
    const nodes_thirdParty = [];

    for (let i = 0; i < nodes_data.length; i++) {
      if (nodes_data[i].party === 'first') {
        nodes_firstParty.push(nodes_data[i]);
      } else {
        nodes_data[i].type = d3.symbolTriangle;
        nodes_data[i].size = 100;
        nodes_thirdParty.push(nodes_data[i]);
      }
    }

    // draw circles for the firstParty nodes
    const nodeFirstParty = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes_firstParty)
      .enter()
      .append('circle')
      .attr('r', 5)
      .attr('fill', 'white');

    // draw triangles for the thirdParty nodes
    const nodeThirdParty = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('path')
      .data(nodes_thirdParty)
      .enter()
      .append('path')
      .attr('d', d3.symbol()
        .size(function(d) {
          return d.size;
        })
        .type(function(d) {
          return d.type;
        }))
      .attr('fill', 'white');

    // draw lines for the links between nodes
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links_data)
      .enter().append('line')
      .attr('stroke-width', 2);

    // @todo draw text labels for each node

    // update <circle> (x,y) positions to reflect node updates,
    // update each <line> endpoint (x, y) position to reflect link updates
    // on each tick of the simulation
    function tickActions() {
      nodeFirstParty
        .attr('cx', function(d) {
          return d.x;
        })
        .attr('cy', function(d) {
          return d.y;
        });

      // triangle SVGs have a transform attribute
      // instead of cx, cy like circles
      nodeThirdParty
        .attr('transform', function(d) {
          return `translate(${d.x}, ${d.y})`;
        });

      link
        .attr('x1', function(d) {
          return d.source.x;
        })
        .attr('y1', function(d) {
          return d.source.y;
        })
        .attr('x2', function(d) {
          return d.target.x;
        })
        .attr('y2', function(d) {
          return d.target.y;
        });
    }

    // after each tick of the simulation's internal timer, execute tickActions
    simulation.on('tick', tickActions);
  }
};
