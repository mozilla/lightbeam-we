// eslint-disable-next-line no-unused-vars

// website = {
//   firstPartyDomain: {
//     favicon: faviconUrl,
//     thirdPartyRequests: {
//       thirdPartySite1: {
//         document: documentUrl,
//         origin: originUrl,
//         requestTime: requestTimeNum,
//         target: targetUrl
//       }
//       thirdPartySite2: {
//         document: documentUrl,
//         origin: originUrl,
//         requestTime: requestTimeNum,
//         target: targetUrl
//       }
//     }
//   }
// }

const viz = {
  draw(nodes_data, links_data, simulation) {
    // get graph area
    const svg = d3.select('svg');

    // draw circles for the nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes_data)
      .enter()
      .append('circle')
      .attr('r', 5)
      .attr('fill', 'red');

    // draw lines for the links between nodes
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links_data)
      .enter().append('line')
      .attr('stroke-width', 2);

    // update <circle> (x,y) positions to reflect node updates,
    // update each <line> endpoint (x, y) position to reflect link updates
    // on each tick of the simulation
    function tickActions() {
      node
        .attr('cx', function(d) {
          return d.x;
        })
        .attr('cy', function(d) {
          return d.y;
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
