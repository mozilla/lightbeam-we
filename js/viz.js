// eslint-disable-next-line no-unused-vars
const viz = {
  radius: 5,
  textLabelGutter: 5,

  init(nodes, links) {
    const { width, height } = this.getDimensions();
    const svg = d3.select('svg');
    const nodesGroup = svg.append('g');
    const linksGroup = svg.append('g');
    const labelsGroup = svg.append('g');
    nodesGroup.attr('class', 'nodes');
    linksGroup.attr('class', 'links');
    labelsGroup.attr('class', 'labels');

    this.width = width;
    this.height = height;
    this.allCircles = nodesGroup.selectAll('circle');
    this.allLabels = labelsGroup.selectAll('text');
    this.allLines = linksGroup.selectAll('line');
    this.simulation = this.simulateForce(nodes, links);

    this.updatePositions();
    this.simulation.tick();
    this.draw(nodes, links);
  },

  simulateForce(nodes, links) {
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

  updatePositions() {
    this.allCircles
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y);
    this.allLabels
      .attr('x', (d) => d.x + this.radius + this.textLabelGutter)
      .attr('y', (d) => d.y + this.radius + this.textLabelGutter);
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
    newNodes.attr('fill', (d) => (
      d.firstParty ? 'red' : 'blue'
    ));
    newNodes.attr('r', this.radius);
    newNodes.on('mouseenter', (d, i) => this.showLabel(i));
    newNodes.on('mouseleave', (d, i) => this.hideLabel(i));

    this.allCircles = newNodes.merge(this.allCircles);
  },

  showLabel(index) {
    const label = d3.select(`text.textLabel.text${index}`);
    label.attr('class', `textLabel text${index} visible`);
  },

  hideLabel(index) {
    const label = d3.select(`text.textLabel.text${index}`);
    label.attr('class', `textLabel text${index} invisible`);
  },

  drawLabels(nodes) {
    this.allLabels = this.allLabels.data(nodes, (d) => d.hostname);
    this.allLabels.exit().remove();

    let newText = this.allLabels.enter();
    newText = newText.append('text');
    newText.attr('class', (d, i) => `textLabel text${i}`);
    newText.text((d) => d.hostname);
    newText.attr('fill', 'white');

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
    this.drawLabels(nodes);
    this.drawLinks(links);
    this.drawNodes(nodes);

    this.simulation = this.simulateForce(nodes, links);
    this.updatePositions();
    this.simulation.tick();
  }
};
