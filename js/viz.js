// eslint-disable-next-line no-unused-vars
const viz = {
  scalingFactor: 2,
  circleRadius: 5,
  resizeTimer: null,
  minZoom: 0.5,
  maxZoom: 1.5,
  collisionRadius: 30,
  tickCount: 30,

  init(nodes, links) {
    const { width, height } = this.getDimensions();
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
  },

  simulateForce() {
    let simulation;

    if (!this.simulation) {
      simulation = d3.forceSimulation(this.nodes);
      this.registerSimulationForces(simulation);
    } else {
      simulation = this.simulation;
      simulation.nodes(this.nodes);
    }
    this.registerLinkForce(simulation);
    this.manualTick(simulation);
    return simulation;
  },

  manualTick(simulation) {
    simulation.alphaTarget(0.1);
    for (let i = 0; i < this.tickCount; i++) {
      simulation.tick();
    }
    simulation.alphaTarget(0);
    simulation.stop();
  },

  registerLinkForce(simulation) {
    const linkForce = d3.forceLink(this.links);
    linkForce.id((d) => d.hostname);
    simulation.force('link', linkForce);
  },

  registerSimulationForces(simulation) {
    const centerForce = d3.forceCenter(this.width/2, this.height/2);
    simulation.force('center', centerForce);

    const forceX = d3.forceX(this.width/2);
    simulation.force('x', forceX);

    const forceY = d3.forceY(this.height/2);
    simulation.force('y', forceY);

    const chargeForce = d3.forceManyBody();
    simulation.force('charge', chargeForce);

    const collisionForce = d3.forceCollide(this.collisionRadius);
    simulation.force('collide', collisionForce);
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

  getDimensions() {
    const element = document.body;
    const { width, height } = element.getBoundingClientRect();

    return {
      width,
      height
    };
  },

  drawOnCanvas() {
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.save();
    this.context.translate(this.transform.x, this.transform.y);
    this.context.scale(this.transform.k, this.transform.k);
    this.drawLinks();
    this.drawNodes();
    this.context.restore();
  },

  drawNodes() {
    for (const node of this.nodes) {
      const x = node.fx || node.x;
      const y = node.fy || node.y;
      this.context.beginPath();
      this.context.moveTo(x, y);

      if (node.shadow) {
        this.drawShadow(x, y);
      }

      if (node.firstParty) {
        this.drawFirstParty(node);
      } else {
        this.drawThirdParty(node);
      }

      if (node.favicon) {
        this.drawFavicon(node.favicon, x, y);
      }

      this.context.fillStyle = 'white';
      this.context.closePath();
      this.context.fill();
    }
  },

  getSquare() {
    const side = Math.sqrt(this.circleRadius * this.circleRadius * 2);
    const offset = side * 0.5;

    return {
      side,
      offset
    };
  },

  drawFavicon(favicon, x, y) {
    const { side, offset } = this.getSquare();
    const img = new Image();
    img.src = favicon;
    img.onload = () => {
      this.context.drawImage(img,
        this.transform.applyX(x) - offset,
        this.transform.applyY(y) - offset,
        side,
        side);
    };
  },

  drawShadow(x, y) {
    this.context.beginPath();
    this.context.lineWidth = 6;
    this.context.shadowColor = 'white';
    this.context.strokeStyle = 'rgba(0,0,0,1)';
    this.context.shadowBlur = 15;
    this.context.shadowOffsetX = 0;
    this.context.shadowOffsetY = 0;
    this.context.arc(x, y, this.circleRadius + 5, 0, 2 * Math.PI);
    this.context.stroke();
    this.context.closePath();
  },

  drawFirstParty(node) {
    this.context.arc(node.x, node.y, this.circleRadius, 0, 2 * Math.PI);
  },

  drawThirdParty(node) {
    const deltaY = this.circleRadius / 2;
    const deltaX = deltaY * Math.sqrt(3);

    this.context.moveTo(node.x - deltaX, node.y + deltaY);
    this.context.lineTo(node.x, node.y - this.circleRadius);
    this.context.lineTo(node.x + deltaX, node.y + deltaY);
  },

  getTooltipPosition(x, y) {
    const tooltipArrowHeight = 20;
    const { right: canvasRight } = this.canvas.getBoundingClientRect();
    const {
      height: tooltipHeight,
      width: tooltipWidth
    } = this.tooltip.getBoundingClientRect();
    const top = y - tooltipHeight - this.circleRadius - tooltipArrowHeight;

    let left;
    if (x + tooltipWidth >= canvasRight) {
      left = x - tooltipWidth;
    } else {
      left = x - (tooltipWidth/2);
    }

    return {
      left,
      top
    };
  },

  showTooltip(title, x, y) {
    this.tooltip.innerText = title;
    this.tooltip.style.display = 'block';

    const { left, top } = this.getTooltipPosition(x, y);
    this.tooltip.style['left'] = `${left}px`;
    this.tooltip.style['top'] = `${top}px`;
  },

  hideTooltip() {
    this.tooltip.style.display = 'none';
  },

  drawLinks() {
    this.context.beginPath();
    for (const d of this.links) {
      const sx = d.source.fx || d.source.x;
      const sy = d.source.fy || d.source.y;
      const tx = d.target.fx || d.target.x;
      const ty = d.target.fy || d.target.y;
      this.context.moveTo(sx, sy);
      this.context.lineTo(tx, ty);
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
      const [ invertX, invertY ] = this.transform.invert([mouseX, mouseY]);
      const node = this.getNodeAtCoordinates(invertX, invertY);

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
        this.resize();
      }, 250);
    });
  },

  resize() {
    this.canvas.style.width = 0;
    this.canvas.style.height = 0;

    const { width, height } = this.getDimensions('visualization');
    this.updateCanvas(width, height);
    this.draw(this.nodes, this.links);
  },

  addDrag() {
    const drag = d3.drag();
    drag.subject(() => this.dragSubject());
    drag.on('start', () => this.dragStart());
    drag.on('drag', () => this.drag());
    drag.on('end', () => this.dragEnd());

    d3.select(this.canvas)
      .call(drag);
  },

  dragSubject() {
    const x = this.transform.invertX(d3.event.x);
    const y = this.transform.invertY(d3.event.y);
    const node = this.getNodeAtCoordinates(x, y);

    return node;
  },

  dragStart() {
    if (!d3.event.active) {
      this.simulation.alphaTarget(0.1);
      this.simulation.restart();
    }
    d3.event.subject.shadow = true;
    d3.event.subject.fx = d3.event.subject.x;
    d3.event.subject.fy = d3.event.subject.y;
  },

  drag() {
    d3.event.subject.fx = d3.event.x;
    d3.event.subject.fy = d3.event.y;

    this.hideTooltip();
    this.drawOnCanvas();
  },

  dragEnd() {
    if (!d3.event.active) {
      this.simulation.alphaTarget(0);
      this.simulation.stop();
    }
    d3.event.subject.fx = d3.event.x;
    d3.event.subject.fy = d3.event.y;
    d3.event.subject.shadow = false;
  },

  addZoom() {
    const zoom = d3.zoom().scaleExtent([this.minZoom, this.maxZoom]);
    zoom.on('zoom', () => this.zoom());

    d3.select(this.canvas)
      .call(zoom);
  },

  zoom() {
    this.transform = d3.event.transform;
    this.drawOnCanvas();
  }
};
