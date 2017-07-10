// eslint-disable-next-line no-unused-vars
const viz = {
  radius: 5,

  init(nodes, links) {
    const svg = d3.select('svg');
    const nodesGroup = svg.append('g');
    const linksGroup = svg.append('g');

    nodesGroup.attr('class', 'nodes');
    linksGroup.attr('class', 'links');

    this.allCircles = nodesGroup.selectAll('circle');
    this.allLabels = nodesGroup.selectAll('text');
    this.allLines = linksGroup.selectAll('line');
    this.simulation = this.simulationStart(nodes, links);

    this.draw(nodes, links);
    this.updatePositions();
    this.simulation.tick();
  },

  simulationStart(nodes, links) {
    const { width, height } = this.getDimensions();
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
    linkForce.distance(80);
    simulation.force('charge', d3.forceManyBody());
    simulation.force('link', linkForce);
    simulation.force('center', d3.forceCenter(width/2, height/2));
    simulation.force('collide', d3.forceCollide(5));
    simulation.alphaTarget(1);

    return simulation;
  },

  simulationRestart(nodes, links) {
    this.simulation.nodes(nodes);
    const linkForce = this.simulation.force('link');
    linkForce.id((d) => d.hostname);
    linkForce.distance(80);
    linkForce.links(links);
    this.simulation.force('link', linkForce);
    this.simulation.alpha(1);
    this.simulation.restart();

    return this.simulation;
  },

  getDimensions() {
    const visualization = document.getElementById('visualization');
    const { width, height } = visualization.getBoundingClientRect();

    return {
      width,
      height
    };
  },

  updatePositions() {
    const { width, height } = this.getDimensions();
    this.allCircles
      .attr('cx', (d) => (
        d.x = Math.max(this.radius, Math.min(width - this.radius, d.x))
      ))
      .attr('cy', (d) => (
        d.y = Math.max(this.radius, Math.min(height - this.radius, d.y))
      ));
    this.allLabels
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y);
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
    newNodes.attr('fill', 'red');
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

    this.simulation = this.simulationRestart(nodes, links);
    this.updatePositions();
    this.simulation.tick();
  }
};
