// eslint-disable-next-line no-unused-vars
const viz = {
  init(nodes, links) {
    const { width, height } = this.getDimensions('visualization');

    this.width = width;
    this.height = height;
    this.context = this.createCanvas(width, height);

    this.draw(nodes, links);
  },

  draw(nodes, links) {
    this.nodes = nodes;
    this.links = links;

    this.simulate();
    this.drawOnCanvas();
  },

  simulate() {
    this.simulation = this.simulateForce();
    this.simulation.tick();
  },

  simulateForce() {
    let simulation;

    if (!this.simulation) {
      simulation = d3.forceSimulation(this.nodes);
    } else {
      simulation = this.simulation;
      this.simulation.stop();
      simulation.nodes(this.nodes);
    }

    const linkForce = d3.forceLink(this.links);
    linkForce.id((d) => d.hostname);
    linkForce.distance(100);
    simulation.force('link', linkForce);

    const centerForce = d3.forceCenter(this.width/2, this.height/2);
    centerForce.x(this.width/2);
    centerForce.y(this.height/2);
    simulation.force('center', centerForce);

    simulation.force('charge', d3.forceManyBody());
    simulation.force('collide', d3.forceCollide(5));
    simulation.alphaTarget(1);

    return simulation;
  },

  createCanvas(width, height) {
    const base = d3.select('#visualization');
    const canvas = base.append('canvas');
    canvas.attr('width', width);
    canvas.attr('height', height);
    const context = canvas.node().getContext('2d');

    return context;
  },

  getDimensions(id) {
    const element = document.getElementById(id);
    const { width, height } = element.getBoundingClientRect();

    return {
      width,
      height
    };
  },

  drawOnCanvas() {
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.save();
    this.drawNodes();
    this.drawLabels();
    this.drawLinks();
    this.context.restore();
  },

  drawNodes() {
    for (const d of this.nodes) {
      this.context.beginPath();
      this.context.moveTo(d.x, d.y);
      this.context.arc(d.x, d.y, 4.5, 0, 2 * Math.PI);
      if (d.firstParty) {
        this.context.fillStyle = 'red';
      } else {
        this.context.fillStyle = 'blue';
      }
      this.context.closePath();
      this.context.fill();
    }
  },

  drawLabels() {
    this.context.fillStyle = 'white';
    this.context.beginPath();
    for (const d of this.nodes) {
      this.context.fillText(d.hostname, d.x, d.y);
    }
    this.context.closePath();
    this.context.fill();
  },

  drawLinks() {
    this.context.beginPath();
    for (const d of this.links) {
      this.context.moveTo(d.source.x, d.source.y);
      this.context.lineTo(d.target.x, d.target.y);
    }
    this.context.closePath();
    this.context.strokeStyle = '#ccc';
    this.context.stroke();
  }
};
