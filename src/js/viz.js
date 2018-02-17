// eslint-disable-next-line no-unused-vars
const viz = {
  scalingFactor: 2,
  circleRadius: 5,
  resizeTimer: null,
  minZoom: 0.5,
  maxZoom: 1.5,
  collisionRadius: 10,
  chargeStrength: -100,
  tickCount: 100,
  canvasColor: 'white',
  alphaStart: 1,
  alphaTargetStart: 0.1,
  alphaTargetStop: 0,

  init(nodes, links) {
    const { width, height } = this.getDimensions();
    const { canvas, context } = this.createCanvas();

    this.canvas = canvas;
    this.context = context;
    this.tooltip = document.getElementById('tooltip');
    this.circleRadius = this.circleRadius * this.scalingFactor;
    this.collisionRadius = this.collisionRadius * this.scalingFactor;
    this.scale = (window.devicePixelRatio || 1) * this.scalingFactor;
    this.transform = d3.zoomIdentity;
    this.defaultIcon = this.loadImage('images/defaultFavicon.svg');

    this.updateCanvas(width, height);
    this.draw(nodes, links);
    this.addListeners();
  },

  draw(nodes, links) {
    this.nodes = nodes;
    this.links = links;

    this.simulateForce();
    this.drawOnCanvas();
  },

  simulateForce() {
    if (!this.simulation) {
      this.simulation = d3.forceSimulation(this.nodes);
      this.simulation.on('tick', () => {
        return this.drawOnCanvas();
      });
      this.registerSimulationForces();
    } else {
      this.simulation.nodes(this.nodes);
      this.resetAlpha();
    }
    this.registerLinkForce();
  },

  resetAlpha() {
    const alpha = this.simulation.alpha();
    const alphaRounded =  Math.round((1 - alpha) * 100);
    if (alphaRounded === 100) {
      this.simulation.alpha(this.alphaStart);
      this.restartSimulation();
    }
  },

  resetAlphaTarget() {
    this.simulation.alphaTarget(this.alphaTargetStart);
    this.restartSimulation();
  },

  stopAlphaTarget() {
    this.simulation.alphaTarget(this.alphaTargetStop);
  },

  restartSimulation() {
    this.simulation.restart();
  },

  registerLinkForce() {
    const linkForce = d3.forceLink(this.links);
    linkForce.id((d) => {
      return d.hostname;
    });
    this.simulation.force('link', linkForce);
  },

  registerSimulationForces() {
    const centerForce = d3.forceCenter(this.width / 2, this.height / 2);
    this.simulation.force('center', centerForce);

    const forceX = d3.forceX(this.width / 2);
    this.simulation.force('x', forceX);

    const forceY = d3.forceY(this.height / 2);
    this.simulation.force('y', forceY);

    const chargeForce = d3.forceManyBody();
    chargeForce.strength(this.chargeStrength);
    this.simulation.force('charge', chargeForce);

    const collisionForce = d3.forceCollide(this.collisionRadius);
    this.simulation.force('collide', collisionForce);
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

  getRadius(thirdPartyLength) {
    if (thirdPartyLength > 0) {
      if (thirdPartyLength > this.collisionRadius) {
        return this.circleRadius + this.collisionRadius;
      } else {
        return this.circleRadius + thirdPartyLength;
      }
    }
    return this.circleRadius;
  },

  drawNodes() {
    for (const node of this.nodes) {
      const x = node.fx || node.x;
      const y = node.fy || node.y;
      let radius;

      this.context.beginPath();
      this.context.moveTo(x, y);

      if (node.firstParty) {
        radius = this.getRadius(node.thirdParties.length);
        this.drawFirstParty(x, y, radius);
      } else {
        this.drawThirdParty(x, y);
      }

      if (node.shadow) {
        this.drawShadow(x, y, radius);
      }

      this.context.fillStyle = this.canvasColor;
      this.context.closePath();
      this.context.fill();

      if (node.favicon) {
        this.drawFavicon(node, x, y, radius);
      } else {
        this.drawFavicon(node, x, y, this.circleRadius);
      }
    }
  },

  getSquare(radius) {
    const side = Math.sqrt(radius * radius * 2);
    const offset = side * 0.5;

    return {
      side,
      offset
    };
  },

  loadImage(URI) {
    return new Promise((resolve, reject) => {
      if (!URI) {
        return reject();
      }

      const image = new Image();

      image.onload = () => {
        return resolve(image);
      };
      image.onerror = () => {
        return resolve(this.defaultIcon);
      };
      image.src = URI;
    });
  },

  scaleFavicon(image, side) {
    const canvas = document.createElement('canvas'),
      context = canvas.getContext('2d');

    canvas.width = side * this.scale;
    canvas.height = side * this.scale;
    context.fillStyle = this.canvasColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.drawImage(
      image,
      0,
      0,
      side * this.scale,
      side * this.scale);

    return context.getImageData(0, 0, canvas.width, canvas.height);
  },

  async drawFavicon(node, x, y, radius) {
    const offset = this.getSquare(radius).offset,
      side = this.getSquare(radius).side,
      tx = this.transform.applyX(x) - offset,
      ty = this.transform.applyY(y) - offset;

    if (!node.image) {
      node.image = await this.loadImage(node.favicon);
    }

    this.context.putImageData(
      this.scaleFavicon(node.image, side),
      tx * this.scale,
      ty * this.scale
    );
  },

  drawShadow(x, y, radius) {
    const lineWidth = 2,
      shadowBlur = 15,
      shadowRadius = 5;
    this.context.beginPath();
    this.context.lineWidth = lineWidth;
    this.context.shadowColor = this.canvasColor;
    this.context.strokeStyle = 'rgba(0, 0, 0, 1)';
    this.context.shadowBlur = shadowBlur;
    this.context.shadowOffsetX = 0;
    this.context.shadowOffsetY = 0;
    this.context.arc(x, y, radius + shadowRadius, 0, 2 * Math.PI);
    this.context.stroke();
    this.context.closePath();
  },

  drawFirstParty(x, y, radius) {
    this.context.arc(x, y, radius, 0, 2 * Math.PI);
  },

  drawThirdParty(x, y) {
    const deltaY = this.circleRadius / 2;
    const deltaX = deltaY * Math.sqrt(3);

    this.context.moveTo(x - deltaX, y + deltaY);
    this.context.lineTo(x, y - this.circleRadius);
    this.context.lineTo(x + deltaX, y + deltaY);
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
      left = x - (tooltipWidth / 2);
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
    const d = dx * dx + dy * dy;
    const r = this.circleRadius;

    return d <= r * r;
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
    drag.subject(() => {
      return this.dragSubject();
    });
    drag.on('start', () => {
      return this.dragStart();
    });
    drag.on('drag', () => {
      return this.drag();
    });
    drag.on('end', () => {
      return this.dragEnd();
    });

    d3.select(this.canvas)
      .call(drag);
  },

  dragSubject() {
    const x = this.transform.invertX(d3.event.x);
    const y = this.transform.invertY(d3.event.y);
    return this.getNodeAtCoordinates(x, y);
  },

  dragStart() {
    if (!d3.event.active) {
      this.resetAlphaTarget();
    }
    d3.event.subject.shadow = true;
    d3.event.subject.fx = d3.event.subject.x;
    d3.event.subject.fy = d3.event.subject.y;
  },

  drag() {
    d3.event.subject.fx = d3.event.x;
    d3.event.subject.fy = d3.event.y;

    this.hideTooltip();
  },

  dragEnd() {
    if (!d3.event.active) {
      this.stopAlphaTarget();
    }
    d3.event.subject.x = d3.event.subject.fx;
    d3.event.subject.y = d3.event.subject.fy;
    d3.event.subject.fx = null;
    d3.event.subject.fy = null;
    d3.event.subject.shadow = false;
  },

  addZoom() {
    const zoom = d3.zoom().scaleExtent([this.minZoom, this.maxZoom]);
    zoom.on('zoom', () => {
      return this.zoom();
    });

    d3.select(this.canvas)
      .call(zoom);
  },

  zoom() {
    this.transform = d3.event.transform;
    this.drawOnCanvas();
  }
};
