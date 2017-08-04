// eslint-disable-next-line no-unused-vars
const viz = {
  scalingFactor: 2,
  circleRadius: 5,
  resizeTimer: null,
  minZoom: 0.5,
  maxZoom: 1,

  init(nodes, links) {
    const { width, height } = this.getDimensions('visualization');
    const { canvas, context } = this.createCanvas();

    this.canvas = canvas;
    this.context = context;
    this.tooltip = document.getElementById('tooltip');
    this.circleRadius = this.circleRadius * this.scalingFactor;
    this.scale = (window.devicePixelRatio || 1) * this.scalingFactor;
    this.transform = d3.zoomIdentity;

    this.updateCanvas(width, height);
    this.draw(nodes, links);
    this.addListeners();
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

  createCanvas() {
    const base = document.getElementById('visualization');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    base.appendChild(canvas);

    return {
      canvas,
      context
    };
  },

  updateCanvas(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.setAttribute('width', width * this.scale);
    this.canvas.setAttribute('height', height * this.scale);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.scale(this.scale, this.scale);
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
    for (const node of this.nodes) {
      this.context.beginPath();
      this.context.moveTo(node.x, node.y);
      if (node.firstParty) {
        this.drawFirstParty(node);
      } else {
        this.drawThirdParty(node);
      }
      this.context.fillStyle = 'white';
      this.context.closePath();
      this.context.fill();
    }
  },

  drawFirstParty(node) {
    this.context.arc(node.x, node.y, this.circleRadius, 0, 2 * Math.PI);
  },

  drawThirdParty(node) {
    // draw third party as equilateral triangle
    const deltaY = this.circleRadius / 2;
    const deltaX = deltaY * Math.sqrt(3);
    this.context.moveTo(node.x - deltaX, node.y + deltaY);
    this.context.lineTo(node.x, node.y - this.circleRadius);
    this.context.lineTo(node.x + deltaX, node.y + deltaY);
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

  getMousePosition(event) {
    const { left, top } = this.canvas.getBoundingClientRect();

    return {
      mouseX: event.clientX - left,
      mouseY: event.clientY - top
    };
  },

  addListeners() {
    this.addMouseMove();
    this.addWindowResize();
    this.addDrag();
    this.addZoom();
  },

  addMouseMove() {
    this.canvas.addEventListener('mousemove', (event) => {
      const { mouseX, mouseY } = this.getMousePosition(event);
      const node = this.getNodeAtCoordinates(mouseX, mouseY);

      if (node) {
        this.showTooltip(node.hostname, mouseX, mouseY);
      } else {
        this.hideTooltip();
      }
    });
  },

  addWindowResize() {
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.onResize();
      }, 250);
    });
  },

  onResize() {
    this.canvas.style.width = 0;
    this.canvas.style.height = 0;

    const { width, height } = this.getDimensions('visualization');
    this.updateCanvas(width, height);
    this.draw(this.nodes, this.links);
  },

  addDrag() {
    const drag = d3.drag();
    drag.subject(() => this.dragSubject());
    drag.on('end', () => this.dragEnded());

    d3.select(this.canvas)
      .call(drag);
  },

  dragSubject() {
    const x = this.transform.invertX(d3.event.x);
    const y = this.transform.invertY(d3.event.y);
    const node = this.getNodeAtCoordinates(x, y);

    return node;
  },

  dragEnded() {
    this.nodes.find((node) => {
      if (node.hostname === d3.event.subject.hostname) {
        node.x = this.transform.invertX(d3.event.x);
        node.y = this.transform.invertY(d3.event.y);
      }
    });
    this.render();
  },

  addZoom() {
    const zoom = d3.zoom();// .scaleExtent([this.minZoom, this.maxZoom]);
    zoom.on('zoom', () => this.zoomed());

    d3.select(this.canvas)
      .call(zoom);
  },

  zoomed() {
    this.transform = d3.event.transform;
    this.render();
  },

  render() {
    const canvas = this.context;
    canvas.save();
    canvas.clearRect(0, 0, this.width, this.height);
    canvas.translate(this.transform.x, this.transform.y);
    canvas.scale(this.transform.k, this.transform.k);
    this.drawLinks();
    this.drawNodes();
    canvas.restore();
  }
};
