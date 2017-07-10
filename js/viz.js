// eslint-disable-next-line no-unused-vars
const viz = {
  radius: 5,

  init(nodes, links) {
    const { width, height } = this.getDimensions();
    const svg = d3.select('svg');
    const nodesGroup = svg.append('g');
    const linksGroup = svg.append('g');
    nodesGroup.attr('class', 'nodes');
    linksGroup.attr('class', 'links');

    this.width = width;
    this.height = height;
    this.allCircles = nodesGroup.selectAll('circle');
    this.allLabels = nodesGroup.selectAll('text');
    this.allLines = linksGroup.selectAll('line');
    this.simulation = this.simulationStart(nodes, links);

    this.updatePositions();
    this.simulation.tick();
    this.draw(nodes, links);
  },

  simulationStart(nodes, links) {
    const linkForce = d3.forceLink(links);
    let simulation;

    if (!this.simulation) {
      simulation = d3.forceSimulation(nodes);
    } else {
      simulation = this.simulation;
      this.simulation.stop();
      simulation.nodes(nodes);
    }

    linkForce.id((d) => d.hostname);
    linkForce.distance(100);
    simulation.force('charge', d3.forceManyBody());
    simulation.force('link', linkForce);
    simulation.force('center', d3.forceCenter(this.width/2, this.height/2));
    simulation.force('collide', d3.forceCollide(5));
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

  getX(x) {
    // forces the nodes to be contained within the bounding box's x coordinate
    return Math.max(this.radius, Math.min(this.width - this.radius, x));
  },

  getY(y) {
    // forces the nodes to be contained within the bounding box's y coordinate
    return Math.max(this.radius, Math.min(this.height - this.radius, y));
  },

  updatePositions() {
    this.allCircles
      .attr('cx', (d) => this.getX(d.x))
      .attr('cy', (d) => this.getY(d.y));
    this.allLabels
      .attr('x', (d) => this.getX(d.x))
      .attr('y', (d) => this.getY(d.y));
    this.allLines
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);
  },

  drawNodes(nodes) {
    this.allCircles = this.allCircles.data(nodes, (d) => d.hostname);
    this.allCircles.exit().remove();

    let newNodes = this.allCircles.enter();
    newNodes = newNodes.append('circle');
    newNodes.attr('fill', (d) => {
      if (d.firstParty) {
        return 'red';
      }
      return 'blue';
    });
    newNodes.attr('r', this.radius);

    this.allCircles = newNodes.merge(this.allCircles);
  },

  drawLabels(nodes) {
    this.allLabels = this.allLabels.data(nodes, (d) => d.hostname);
    this.allLabels.exit().remove();

    let newText = this.allLabels.enter();
    newText = newText.append('text');
    newText.attr('class', 'textLabel')
    .text((d) => d.hostname)
    .attr('fill', 'white');

    this.allLabels = newText.merge(this.allLabels);
  },

  drawLinks(links) {
    this.allLines = this.allLines
      .data(links, (d) => `${d.source.hostname}-${d.target.hostname}`);

    this.allLines.exit().remove();

    let newLinks = this.allLines.enter();
    newLinks = newLinks.append('line');

    this.allLines = newLinks.merge(this.allLines);
  },

  draw(nodes, links) {
    this.drawNodes(nodes);
    this.drawLabels(nodes);
    this.drawLinks(links);

    this.simulation = this.simulationStart(nodes, links);
    this.updatePositions();
    this.simulation.tick();
  }
};
