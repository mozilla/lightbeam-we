// eslint-disable-next-line no-unused-vars
const viz = {
  init(nodes, links) {
    const svg = d3.select('svg');

    const nodesGroup = svg.append('g');
    nodesGroup.attr('class', 'nodes');

    const linksGroup = svg.append('g');
    linksGroup.attr('class', 'links');

    this.allCircles = nodesGroup.selectAll('.node');
    this.allLabels = nodesGroup.selectAll('.textLabel');
    this.allLines = linksGroup.selectAll('.link');

    this.update(nodes, links);
  },

  simulateForce(nodes, links) {
    const { width, height } = this.getDimensions();
    const linkForce = d3.forceLink(links);
    let simulation;

    if (!this.simulation) {
      simulation = d3.forceSimulation(nodes);
    } else {
      simulation = this.simulation;
      simulation.nodes(nodes);
    }

    linkForce.id((d) => d.hostname);
    simulation.force('link', linkForce);
    simulation.force('charge', d3.forceManyBody());
    simulation.force('center', d3.forceCenter(width/2, height/2));
    simulation.alphaTarget(1);

    return simulation;
  },

  getDimensions() {
    const visualization = document.getElementById('visualization');
    const { width, height } = visualization.getBoundingClientRect();

    return {
      width,
      height
    };
  },

  tick() {
    this.simulation.stop();

    this.allCircles
      .attr('cx', function(d) {
        return d.x;
      })
      .attr('cy', function(d) {
        return d.y;
      });

    this.allLabels
      .attr('x', function(d) {
        return d.x;
      })
      .attr('y', function(d) {
        return d.y;
      });

    this.allLines
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

    this.simulation.tick();
  },

  update(nodes, links) {
    this.simulation = this.simulateForce(nodes, links);
    this.tick();

    // determine which nodes to keep, remove and add: the update selection
    this.allCircles = this.allCircles.data(nodes, function(d) {
      return d.hostname;
    });

    // remove old nodes: the exit selection
    const oldNodes = this.allCircles.exit();
    oldNodes.remove();

    // add new nodes: the enter selection
    let newNodes = this.allCircles.enter();
    newNodes = newNodes.append('circle');
    newNodes.attr('class', 'node');
    newNodes.attr('fill', 'red');
    newNodes.attr('r', 5);

    this.allCircles = newNodes.merge(this.allCircles);

    this.allLabels = this.allLabels.data(nodes, function(d) {
      return d.hostname;
    });

    const oldText = this.allLabels.exit();
    oldText.remove();

    let newText = this.allLabels.enter();
    newText = newText.append('text');
    newText.attr('class', 'textLabel')
    .text( function (d) {
      return d.hostname;
    })
    .attr('fill', 'white');

    this.allLabels = newText.merge(this.allLabels);

    // determine which links to keep, remove and add, the update selection
    this.allLines = this.allLines
      .data(links, function(d) {
        return `${d.source.hostname}-${d.target.hostname}`;
      });

    // remove old links
    const oldLinks = this.allLines.exit();
    oldLinks.remove();

    // add new links
    let newLinks = this.allLines.enter();
    newLinks = newLinks.append('line');
    this.allLines = newLinks.merge(this.allLines);

    // Update and restart the simulation.
    this.simulation = this.simulateForce(nodes, links);
    this.tick();
  }
};
