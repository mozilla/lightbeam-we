// eslint-disable-next-line no-unused-vars
const viz = {
  circleRadius: 5,

  init(nodes, links) {
    const { width, height } = this.getDimensions('visualization');
    const { canvas, context } = this.createCanvas(width, height);

    this.width = width;
    this.height = height;
    this.canvas = canvas;
    this.context = context;
    this.tooltip = document.getElementById('tooltip');

    this.addListeners();
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
    simulation.force('collide', d3.forceCollide(50));
    simulation.alphaTarget(1);
    simulation.stop();

    return simulation;
  },

  createCanvas(width, height) {
    const base = d3.select('#visualization');
    const canvas = base.append('canvas');
    canvas.attr('width', width);
    canvas.attr('height', height);
    const context = canvas.node().getContext('2d');

    return {
      canvas,
      context
    };
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
    this.drawLinks();
    this.drawNodes();
    this.context.restore();
  },

  drawNodes() {
    for (const d of this.nodes) {
      this.context.beginPath();
      this.context.moveTo(d.x, d.y);
      this.context.arc(d.x, d.y, this.circleRadius, 0, 2 * Math.PI);
      if (d.firstParty) {
        this.context.fillStyle = 'red';
      } else {
        this.context.fillStyle = 'blue';
      }
      this.context.closePath();
      this.context.fill();
    }
  },

  showTooltip(title, x, y) {
    this.tooltip.innerText = title;
    this.tooltip.style.left = `${x + this.circleRadius}px`;
    this.tooltip.style.top = `${y + this.circleRadius}px`;
    this.tooltip.style.display = 'block';
  },

  hideTooltip() {
    this.tooltip.style.display = 'none';
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
  },

  isPointInsideCircle(x, y, cx, cy) {
    const dx = Math.abs(x - cx);
    const dy = Math.abs(y - cy);
    const d = dx*dx + dy*dy;
    const r = this.circleRadius;

    return d <= r*r;
  },

  getNodeAtCoordinates(x, y) {
    for (const node of this.nodes) {
      if (this.isPointInsideCircle(x, y, node.x, node.y)) {
        return node;
      }
    }
    return null;
  },

  addListeners() {
    this.addMouseMove();
  },

  addMouseMove() {
    this.canvas.on('mousemove', () => {
      const [mouseX, mouseY] = d3.mouse(this.canvas.node());
      const node = this.getNodeAtCoordinates(mouseX, mouseY);
      if (node) {
        this.showTooltip(node.hostname, mouseX, mouseY);
      } else if (!node) {
        this.hideTooltip();
      }
    });
  }
};
