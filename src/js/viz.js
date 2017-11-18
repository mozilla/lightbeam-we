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
    this.defaultIcon = this.convertURIToImageData('images/defaultFavicon.svg');

    this.updateCanvas(width, height);
    this.nodes = nodes;
    this.links = links;
    this.width = width;
    this.height = height;
    this.addListeners();
    this.webWorker(nodes, links, width, height);
  },

  webWorker(nodes, links, width, height) {
    this.worker = new Worker('moz-extension://dd1e07f4-7724-154c-80da-f501acf9262c/js/vizWorker.js');

    this.worker.postMessage({
      nodes,
      links,
      width,
      height
    });

    this.worker.onmessage = (event) => {
      switch (event.data.type) {
        case 'tick': return this.ticked(event.data);
        case 'end': return this.draw(event.data.nodes, event.data.links);
      }
    };
  },

  ticked(data) {
    var progress = 100 * data.progress;
    var meter = document.querySelector('#progress');
    meter.style.width = `${progress}%`;
  },

  draw(nodes, links) {
    this.nodes = nodes;
    this.links = links;

    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
    }

    this.drawOnCanvas();
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

  drawAnimation(node) {
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.save();
    this.context.translate(this.transform.x, this.transform.y);
    this.context.scale(this.transform.k, this.transform.k);
    // this.drawAnimatedLinks(subject);
    this.drawNodes();
    this.drawAnimatedNode(node);
    this.context.restore();
    this.animationFrame = window.requestAnimationFrame(
      () => this.drawAnimation(node));
  },

  drawAnimatedNode(node) {
    if (!node) {
      return;
    }
    const x = node.xArr.pop() || node.x;
    const y = node.yArr.pop() || node.y;
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
      // this.drawShadow(x, y, radius);
    }

    this.context.fillStyle = this.canvasColor;
    this.context.closePath();
    this.context.fill();
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
      if (node.fx) {
        continue;
      }

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
        // this.drawFavicon(node, x, y);
      }
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

  convertURIToImageData(URI) {
    return new Promise((resolve, reject) => {
      if (!URI) {
        return reject();
      }

      const canvas = document.createElement('canvas'),
        context = canvas.getContext('2d'),
        side = this.getSquare().side,
        image = new Image();

      canvas.width = side * this.scale;
      canvas.height = side * this.scale;
      context.fillStyle = this.canvasColor;
      context.fillRect(0, 0, canvas.width, canvas.height);

      image.onload = () => {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return resolve(context.getImageData(0, 0, canvas.width, canvas.height));
      };
      image.onerror = () => {
        return resolve(this.defaultIcon);
      };
      image.src = URI;
    });
  },

  async drawFavicon(node, x, y) {
    const offset = this.getSquare().offset,
      tx = this.transform.applyX(x) - offset,
      ty = this.transform.applyY(y) - offset;

    if (!node.image) {
      node.image = await this.convertURIToImageData(node.favicon);
    }

    this.context.putImageData(node.image,
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
    return this.getNodeAtCoordinates(x, y);
  },

  dragStart() {
    d3.event.subject.shadow = true;
    d3.event.subject.fx = d3.event.subject.x;
    d3.event.subject.fy = d3.event.subject.y;
    d3.event.subject.xArr = [];
    d3.event.subject.yArr = [];
  },

  drag() {
    d3.event.subject.fx = d3.event.x;
    d3.event.subject.fy = d3.event.y;
    d3.event.subject.xArr.push(d3.event.x);
    d3.event.subject.yArr.push(d3.event.y);
    this.drawOnCanvas();
    this.hideTooltip();
  },

  dragEnd() {
    d3.event.subject.shadow = false;

    this.drawAnimation(d3.event.subject);

    this.worker.postMessage({
      nodes: this.nodes,
      links: this.links,
      width: this.width,
      height: this.height,
      subject: d3.event.subject
    });
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
