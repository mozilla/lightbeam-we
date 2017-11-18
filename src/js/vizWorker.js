/* eslint-disable no-undef */
importScripts('https://d3js.org/d3-collection.v1.min.js');
importScripts('https://d3js.org/d3-dispatch.v1.min.js');
importScripts('https://d3js.org/d3-quadtree.v1.min.js');
importScripts('https://d3js.org/d3-timer.v1.min.js');
importScripts('https://d3js.org/d3-force.v1.min.js');

onmessage = (event) => {
  d3Force.init(event.data);
};

const d3Force = {
  init(data) {
    const { nodes, links, width, height, subject } = data;
    this.nodes = nodes;
    this.links = links;
    this.width = width;
    this.height = height;
    this.subject = subject;
    d3Force.simulateForce();
  },

  simulateForce() {
    if (!this.simulation) {
      this.simulation = d3.forceSimulation(this.nodes);
      this.simulation.on('tick', () => {
        d3Force.simulateTick();
      });
      d3Force.registerSimulationForces();
    } else {
      this.simulation.nodes(this.nodes);
      this.simulation.alpha(0.5);
      this.simulation.restart();
      // this.simulation.alpha(0);
    }
    d3Force.registerLinkForce();
  },

  simulateTick() {
    const tickCounter = this.simulation.alpha();
    postMessage({
      type: 'tick',
      progress: 1 - tickCounter
    });
    const tickPercent = Math.round((1 - tickCounter) * 100);
    if (tickPercent === 99) {
      if (this.subject) {
        this.subject.fx = null;
        this.subject.fy = null;
        this.subject.xArr = null;
        this.subject.yArr = null;
      }
      postMessage({
        type: 'end',
        nodes: d3Force.nodes,
        links: d3Force.links
      });
    }
  },

  registerLinkForce() {
    const linkForce = d3.forceLink(this.links);
    linkForce.id((d) => d.hostname);
    this.simulation.force('link', linkForce);
  },

  registerSimulationForces() {
    const chargeStrength = -100,
      collisionRadius = 10,
      centerForce = d3.forceCenter(this.width / 2, this.height / 2),
      forceX = d3.forceX(this.width / 2),
      forceY = d3.forceY(this.height / 2),
      chargeForce = d3.forceManyBody(),
      collisionForce = d3.forceCollide(collisionRadius);

    this.simulation.force('center', centerForce);
    this.simulation.force('x', forceX);
    this.simulation.force('y', forceY);
    chargeForce.strength(chargeStrength);
    this.simulation.force('charge', chargeForce);
    this.simulation.force('collide', collisionForce);
  }
};
