/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	/* global AFRAME */

	if (typeof AFRAME === 'undefined') {
	  throw new Error('Component attempted to register before AFRAME was available.');
	}

	var d3 = __webpack_require__(1),
	    ngraph = {
	      graph: __webpack_require__(8),
	      forcelayout: __webpack_require__(10),
	      forcelayout3d: __webpack_require__(27)
	    },
	    qwest = __webpack_require__(55);

	/**
	 * 3D Force-Directed Graph component for A-Frame.
	 */
	AFRAME.registerComponent('forcegraph', {
	  schema: {
	    jsonUrl: {type: 'string'},
	    nodes: {parse: JSON.parse, default: '[]'},
	    links: {parse: JSON.parse, default: '[]'},
      numDimensions: {type: 'number', default: 3},
	    nodeRelSize: {type: 'number', default: 4}, // volume per val unit
	    lineOpacity: {type: 'number', default: 0.2},
	    autoColorBy: {type: 'string'}, // color nodes with the same field equally
	    idField: {type: 'string', default: 'id'},
	    valField: {type: 'string', default: 'val'},
	    nameField: {type: 'string', default: 'name'},
	    colorField: {type: 'string', default: 'color'},
	    linkSourceField: {type: 'string', default: 'source'},
	    linkTargetField: {type: 'string', default: 'target'},
	    forceEngine: {type: 'string', default: 'd3'}, // 'd3' or 'ngraph'
	    warmupTicks: {type: 'int', default: 0}, // how many times to tick the force engine at init before starting to render
	    cooldownTicks: {type: 'int', default: Infinity},
	    cooldownTime: {type: 'int', default: 15000} // ms
	  },

	  init: function () {
			this.state = {}; // Internal state
      // Get camera dom element
	    var cameraEl = document.querySelector('a-entity[camera], a-camera');

	    // Add info msg
	    cameraEl.appendChild(this.state.infoEl = document.createElement('a-text'));
	    this.state.infoEl.setAttribute('position', '0 -0.1 -1'); // Canvas center
	    this.state.infoEl.setAttribute('width', 1);
	    this.state.infoEl.setAttribute('align', 'center');
	    this.state.infoEl.setAttribute('color', 'lavender');

	    // Setup tooltip (attached to camera)
	    cameraEl.appendChild(this.state.tooltipEl = document.createElement('a-text'));
	    this.state.tooltipEl.setAttribute('position', '0 -0.5 -1'); // Aligned to canvas bottom
	    this.state.tooltipEl.setAttribute('width', 2);
	    this.state.tooltipEl.setAttribute('align', 'center');
	    this.state.tooltipEl.setAttribute('color', 'lavender');
	    this.state.tooltipEl.setAttribute('value', '');

	    // Keep reference to Three camera object
	    this.cameraObj = cameraEl.object3D.children
	        .filter(function(child) { return child.type === 'PerspectiveCamera' })[0];

	    // Add D3 force-directed layout
	    this.state.d3ForceLayout = d3.forceSimulation()
	        .force('link', d3.forceLink())
	        .force('charge', d3.forceManyBody())
	        .force('center', d3.forceCenter())
	        .stop();

		},

	  remove: function () {
	    // Clean-up elems
	    this.state.infoEl.remove();
	    this.state.tooltipEl.remove();
	  },

	  update: async function (oldData) {
	    var comp = this,
	        elData = this.data,
	        diff = AFRAME.utils.diff(elData, oldData);

	    comp.state.onFrame = null; // Pause simulation
	    comp.state.infoEl.setAttribute('value', 'Loading...'); // Add loading msg

			/* if ('jsonUrl' in diff && elData.jsonUrl) {
	      // (Re-)load data
	      qwest.get(elData.jsonUrl).then(function(_, json) {
	        elData.nodes = json.nodes;
	        elData.links = json.links;

	        comp.update(elData);  // Force re-update
	      });
	    } */
			// Auto add color to uncolored nodes
			const { nodes, links } = await forcegraphData.getData();
			elData.nodes = nodes;
			elData.links = links;
	    autoColorNodes(elData.nodes, elData.autoColorBy, elData.colorField);

	    // parse links
	    elData.links.forEach(function(link) {
	      link.source = link[elData.linkSourceField];
	      link.target = link[elData.linkTargetField];
	    });

	    // Add children entities
	    var el3d = this.el.object3D;
	    while(el3d.children.length){ el3d.remove(el3d.children[0]) } // Clear the place

	    elData.nodes.forEach(function(node) {
	      var sphere = new THREE.Mesh(
	          new THREE.SphereGeometry(Math.cbrt(node[elData.valField] || 1) * elData.nodeRelSize, 8, 8),
	          new THREE.MeshLambertMaterial({ color: node[elData.colorField] || 0xffffaa, transparent: true, opacity: 0.75 })
	      );

	      sphere.name = node[elData.nameField]; // Add label

	      el3d.add(node.__sphere = sphere);
	    });

	    var lineMaterial = new THREE.LineBasicMaterial({ color: 0xf0f0f0, transparent: true, opacity: elData.lineOpacity });
	    elData.links.forEach(function(link) {
	      var geometry = new THREE.BufferGeometry();
	      geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));

	      el3d.add(link.__line = new THREE.Line(geometry, lineMaterial));
	    });

	    // Feed data to force-directed layout
	    var isD3Sim = elData.forceEngine !== 'ngraph',
	      layout;
	    if (isD3Sim) {
	      // D3-force
	      (layout = comp.state.d3ForceLayout)
	          .stop()
	          .alpha(1)// re-heat the simulation
	          .numDimensions(elData.numDimensions)
	          .nodes(elData.nodes)
	          .force('link')
	            .id(function (d) {
	              return d[elData.idField]
	            })
	            .links(elData.links);
	    } else {
	      // ngraph
	      var graph = ngraph.graph();
	      elData.nodes.forEach(function (node) {
	        graph.addNode(node[elData.idField]);
	      });
	      elData.links.forEach(function (link) {
	        graph.addLink(link.source, link.target);
	      });
	      layout = ngraph['forcelayout' + (elData.numDimensions === 2 ? '' : '3d')](graph);
	      layout.graph = graph; // Attach graph reference to layout
	    }

	    for (var i=0; i<elData.warmupTicks; i++) { layout[isD3Sim?'tick':'step'](); } // Initial ticks before starting to render

	    var cntTicks = 0;
	    var startTickTime = new Date();
	    comp.state.onFrame = layoutTick;
	    comp.state.infoEl.setAttribute('value', '');

	    //

	    function layoutTick() {
	      if (cntTicks++ > elData.cooldownTicks || (new Date()) - startTickTime > elData.cooldownTime) {
	        comp.state.onFrame = null; // Stop ticking graph
	      }

	      layout[isD3Sim?'tick':'step'](); // Tick it

	      // Update nodes position
	      elData.nodes.forEach(function(node) {
	        var sphere = node.__sphere,
	            pos = isD3Sim
	              ? node
	              : layout.getNodePosition(node[elData.idField]);

	        sphere.position.x = pos.x;
	        sphere.position.y = pos.y || 0;
	        sphere.position.z = pos.z || 0;
	      });

	      //Update links position
	      elData.links.forEach(function(link) {
	        var line = link.__line,
	            pos = isD3Sim
	                ? link
	                : layout.getLinkPosition(layout.graph.getLink(link.source, link.target).id),
	            start = pos[isD3Sim ? 'source' : 'from'],
	            end = pos[isD3Sim ? 'target' : 'to'],
	            linePos = line.geometry.attributes.position;

	        linePos.array[0] = start.x;
	        linePos.array[1] = start.y || 0;
	        linePos.array[2] = start.z || 0;
	        linePos.array[3] = end.x;
	        linePos.array[4] = end.y || 0;
	        linePos.array[5] = end.z || 0;

	        linePos.needsUpdate = true;
	        line.geometry.computeBoundingSphere();
	      });
	    }

	    //

	    function autoColorNodes(nodes, colorBy, colorField) {
	      if (!colorBy) return;

	      // Color brewer paired set
	      var colors = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928'];

	      var uncoloredNodes = nodes.filter(function(node) { return !node[colorField]}),
	          nodeGroups = {};

	      uncoloredNodes.forEach(function(node) { nodeGroups[node[colorBy]] = null });
	      Object.keys(nodeGroups).forEach(function(group, idx) { nodeGroups[group] = idx });

	      uncoloredNodes.forEach(function(node) {
	        node[colorField] = parseInt(colors[nodeGroups[node[colorBy]] % colors.length].slice(1), 16);
	      });
	    }
	  },


	  tick: function(t, td) {
	    // Update tooltip
	    var centerRaycaster = new THREE.Raycaster();
	    centerRaycaster.setFromCamera(
	        new THREE.Vector2(0, 0), // Canvas center
	        this.cameraObj
	    );

	    var intersects = centerRaycaster.intersectObjects(this.el.object3D.children)
	        .filter(function(o) { return o.object.name }); // Check only objects with labels

	    this.state.tooltipEl.setAttribute('value', intersects.length ? intersects[0].object.name : '' );

	    // Run onFrame ticker
	    if (this.state.onFrame) this.state.onFrame();
	  }
	});


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	// https://github.com/vasturiano/d3-force-3d Version 1.0.7. Copyright 2017 Vasco Asturiano.
	(function (global, factory) {
		 true ? factory(exports, __webpack_require__(2), __webpack_require__(3), __webpack_require__(4), __webpack_require__(5), __webpack_require__(6), __webpack_require__(7)) :
		typeof define === 'function' && define.amd ? define(['exports', 'd3-binarytree', 'd3-quadtree', 'd3-octree', 'd3-collection', 'd3-dispatch', 'd3-timer'], factory) :
		(factory((global.d3 = global.d3 || {}),global.d3,global.d3,global.d3,global.d3,global.d3,global.d3));
	}(this, (function (exports,d3Binarytree,d3Quadtree,d3Octree,d3Collection,d3Dispatch,d3Timer) { 'use strict';

	var center = function(x, y, z) {
	  var nodes;

	  if (x == null) x = 0;
	  if (y == null) y = 0;
	  if (z == null) z = 0;

	  function force() {
	    var i,
	        n = nodes.length,
	        node,
	        sx = 0,
	        sy = 0,
	        sz = 0;

	    for (i = 0; i < n; ++i) {
	      node = nodes[i], sx += node.x || 0, sy += node.y || 0, sz += node.z || 0;
	    }

	    for (sx = sx / n - x, sy = sy / n - y, sz = sz / n - z, i = 0; i < n; ++i) {
	      node = nodes[i];
	      if (sx) { node.x -= sx; }
	      if (sy) { node.y -= sy; }
	      if (sz) { node.z -= sz; }
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _;
	  };

	  force.x = function(_) {
	    return arguments.length ? (x = +_, force) : x;
	  };

	  force.y = function(_) {
	    return arguments.length ? (y = +_, force) : y;
	  };

	  force.z = function(_) {
	    return arguments.length ? (z = +_, force) : z;
	  };

	  return force;
	};

	var constant = function(x) {
	  return function() {
	    return x;
	  };
	};

	var jiggle = function() {
	  return (Math.random() - 0.5) * 1e-6;
	};

	function x(d) {
	  return d.x + d.vx;
	}

	function y(d) {
	  return d.y + d.vy;
	}

	function z(d) {
	  return d.z + d.vz;
	}

	var collide = function(radius) {
	  var nodes,
	      nDim,
	      radii,
	      strength = 1,
	      iterations = 1;

	  if (typeof radius !== "function") radius = constant(radius == null ? 1 : +radius);

	  function force() {
	    var i, n = nodes.length,
	        tree,
	        node,
	        xi,
	        yi,
	        zi,
	        ri,
	        ri2;

	    for (var k = 0; k < iterations; ++k) {
	      tree =
	          (nDim === 1 ? d3Binarytree.binarytree(nodes, x)
	          :(nDim === 2 ? d3Quadtree.quadtree(nodes, x, y)
	          :(nDim === 3 ? d3Octree.octree(nodes, x, y, z)
	          :null
	      ))).visitAfter(prepare);

	      for (i = 0; i < n; ++i) {
	        node = nodes[i];
	        ri = radii[node.index], ri2 = ri * ri;
	        xi = node.x + node.vx;
	        if (nDim > 1) { yi = node.y + node.vy; }
	        if (nDim > 2) { zi = node.z + node.vz; }
	        tree.visit(apply);
	      }
	    }

	    function apply(treeNode, arg1, arg2, arg3, arg4, arg5, arg6) {
	      var args = [arg1, arg2, arg3, arg4, arg5, arg6];
	      var x0 = args[0],
	          y0 = args[1],
	          z0 = args[2],
	          x1 = args[nDim],
	          y1 = args[nDim+1],
	          z1 = args[nDim+2];

	      var data = treeNode.data, rj = treeNode.r, r = ri + rj;
	      if (data) {
	        if (data.index > node.index) {
	          var x = xi - data.x - data.vx,
	              y = (nDim > 1 ? yi - data.y - data.vy : 0),
	              z = (nDim > 2 ? zi - data.z - data.vz : 0),
	              l = x * x + y * y + z * z;
	          if (l < r * r) {
	            if (x === 0) x = jiggle(), l += x * x;
	            if (nDim > 1 && y === 0) y = jiggle(), l += y * y;
	            if (nDim > 2 && z === 0) z = jiggle(), l += z * z;
	            l = (r - (l = Math.sqrt(l))) / l * strength;

	            node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
	            if (nDim > 1) { node.vy += (y *= l) * r; }
	            if (nDim > 2) { node.vz += (z *= l) * r; }

	            data.vx -= x * (r = 1 - r);
	            if (nDim > 1) { data.vy -= y * r; }
	            if (nDim > 2) { data.vz -= z * r; }
	          }
	        }
	        return;
	      }
	      return x0 > xi + r || x1 < xi - r
	          || (nDim > 1 && (y0 > yi + r || y1 < yi - r))
	          || (nDim > 2 && (z0 > zi + r || z1 < zi - r));
	    }
	  }

	  function prepare(treeNode) {
	    if (treeNode.data) return treeNode.r = radii[treeNode.data.index];
	    for (var i = treeNode.r = 0; i < Math.pow(2, nDim); ++i) {
	      if (treeNode[i] && treeNode[i].r > treeNode.r) {
	        treeNode.r = treeNode[i].r;
	      }
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length, node;
	    radii = new Array(n);
	    for (i = 0; i < n; ++i) node = nodes[i], radii[node.index] = +radius(node, i, nodes);
	  }

	  force.initialize = function(initNodes, numDimensions) {
	    nodes = initNodes;
	    nDim = numDimensions;
	    initialize();
	  };

	  force.iterations = function(_) {
	    return arguments.length ? (iterations = +_, force) : iterations;
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = +_, force) : strength;
	  };

	  force.radius = function(_) {
	    return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), initialize(), force) : radius;
	  };

	  return force;
	};

	function index(d) {
	  return d.index;
	}

	function find(nodeById, nodeId) {
	  var node = nodeById.get(nodeId);
	  if (!node) throw new Error("missing: " + nodeId);
	  return node;
	}

	var link = function(links) {
	  var id = index,
	      strength = defaultStrength,
	      strengths,
	      distance = constant(30),
	      distances,
	      nodes,
	      nDim,
	      count,
	      bias,
	      iterations = 1;

	  if (links == null) links = [];

	  function defaultStrength(link) {
	    return 1 / Math.min(count[link.source.index], count[link.target.index]);
	  }

	  function force(alpha) {
	    for (var k = 0, n = links.length; k < iterations; ++k) {
	      for (var i = 0, link, source, target, x = 0, y = 0, z = 0, l, b; i < n; ++i) {
	        link = links[i], source = link.source, target = link.target;
	        x = target.x + target.vx - source.x - source.vx || jiggle();
	        if (nDim > 1) { y = target.y + target.vy - source.y - source.vy || jiggle(); }
	        if (nDim > 2) { z = target.z + target.vz - source.z - source.vz || jiggle(); }
	        l = Math.sqrt(x * x + y * y + z * z);
	        l = (l - distances[i]) / l * alpha * strengths[i];
	        x *= l, y *= l, z *= l;

	        target.vx -= x * (b = bias[i]);
	        if (nDim > 1) { target.vy -= y * b; }
	        if (nDim > 2) { target.vz -= z * b; }

	        source.vx += x * (b = 1 - b);
	        if (nDim > 1) { source.vy += y * b; }
	        if (nDim > 2) { source.vz += z * b; }
	      }
	    }
	  }

	  function initialize() {
	    if (!nodes) return;

	    var i,
	        n = nodes.length,
	        m = links.length,
	        nodeById = d3Collection.map(nodes, id),
	        link;

	    for (i = 0, count = new Array(n); i < m; ++i) {
	      link = links[i], link.index = i;
	      if (typeof link.source !== "object") link.source = find(nodeById, link.source);
	      if (typeof link.target !== "object") link.target = find(nodeById, link.target);
	      count[link.source.index] = (count[link.source.index] || 0) + 1;
	      count[link.target.index] = (count[link.target.index] || 0) + 1;
	    }

	    for (i = 0, bias = new Array(m); i < m; ++i) {
	      link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
	    }

	    strengths = new Array(m), initializeStrength();
	    distances = new Array(m), initializeDistance();
	  }

	  function initializeStrength() {
	    if (!nodes) return;

	    for (var i = 0, n = links.length; i < n; ++i) {
	      strengths[i] = +strength(links[i], i, links);
	    }
	  }

	  function initializeDistance() {
	    if (!nodes) return;

	    for (var i = 0, n = links.length; i < n; ++i) {
	      distances[i] = +distance(links[i], i, links);
	    }
	  }

	  force.initialize = function(initNodes, numDimensions) {
	    nodes = initNodes;
	    nDim = numDimensions;
	    initialize();
	  };

	  force.links = function(_) {
	    return arguments.length ? (links = _, initialize(), force) : links;
	  };

	  force.id = function(_) {
	    return arguments.length ? (id = _, force) : id;
	  };

	  force.iterations = function(_) {
	    return arguments.length ? (iterations = +_, force) : iterations;
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initializeStrength(), force) : strength;
	  };

	  force.distance = function(_) {
	    return arguments.length ? (distance = typeof _ === "function" ? _ : constant(+_), initializeDistance(), force) : distance;
	  };

	  return force;
	};

	var MAX_DIMENSIONS = 3;

	function x$1(d) {
	  return d.x;
	}

	function y$1(d) {
	  return d.y;
	}

	function z$1(d) {
	  return d.z;
	}

	var initialRadius = 10;
	var initialAngleRoll = Math.PI * (3 - Math.sqrt(5));
	var initialAngleYaw = Math.PI / 24; // Sequential

	var simulation = function(nodes, numDimensions) {
	  numDimensions = numDimensions || 2;

	  var nDim = Math.min(MAX_DIMENSIONS, Math.max(1, Math.round(numDimensions))),
	      simulation,
	      alpha = 1,
	      alphaMin = 0.001,
	      alphaDecay = 1 - Math.pow(alphaMin, 1 / 300),
	      alphaTarget = 0,
	      velocityDecay = 0.6,
	      forces = d3Collection.map(),
	      stepper = d3Timer.timer(step),
	      event = d3Dispatch.dispatch("tick", "end");

	  if (nodes == null) nodes = [];

	  function step() {
	    tick();
	    event.call("tick", simulation);
	    if (alpha < alphaMin) {
	      stepper.stop();
	      event.call("end", simulation);
	    }
	  }

	  function tick() {
	    var i, n = nodes.length, node;

	    alpha += (alphaTarget - alpha) * alphaDecay;

	    forces.each(function(force) {
	      force(alpha);
	    });

	    for (i = 0; i < n; ++i) {
	      node = nodes[i];
	      if (node.fx == null) node.x += node.vx *= velocityDecay;
	      else node.x = node.fx, node.vx = 0;
	      if (nDim > 1) {
	        if (node.fy == null) node.y += node.vy *= velocityDecay;
	        else node.y = node.fy, node.vy = 0;
	      }
	      if (nDim > 2) {
	        if (node.fz == null) node.z += node.vz *= velocityDecay;
	        else node.z = node.fz, node.vz = 0;
	      }
	    }
	  }

	  function initializeNodes() {
	    for (var i = 0, n = nodes.length, node; i < n; ++i) {
	      node = nodes[i], node.index = i;
	      if (isNaN(node.x) || (nDim > 1 && isNaN(node.y)) || (nDim > 2 && isNaN(node.z))) {
	        var radius = initialRadius * (nDim > 2 ? Math.cbrt(i) : (nDim > 1 ? Math.sqrt(i) : i)),
	          rollAngle = i * initialAngleRoll,
	          yawAngle = i * initialAngleYaw;
	        node.x = radius * (nDim > 1 ? Math.cos(rollAngle) : 1);
	        if (nDim > 1) { node.y = radius * Math.sin(rollAngle); }
	        if (nDim > 2) { node.z = radius * Math.sin(yawAngle); }
	      }
	      if (isNaN(node.vx) || (nDim > 1 && isNaN(node.vy)) || (nDim > 2 && isNaN(node.vz))) {
	        node.vx = 0;
	        if (nDim > 1) { node.vy = 0; }
	        if (nDim > 2) { node.vz = 0; }
	      }
	    }
	  }

	  function initializeForce(force) {
	    if (force.initialize) force.initialize(nodes, nDim);
	    return force;
	  }

	  initializeNodes();

	  return simulation = {
	    tick: tick,

	    restart: function() {
	      return stepper.restart(step), simulation;
	    },

	    stop: function() {
	      return stepper.stop(), simulation;
	    },

	    numDimensions: function(_) {
	      return arguments.length
	          ? (nDim = Math.min(MAX_DIMENSIONS, Math.max(1, Math.round(_))), forces.each(initializeForce), simulation)
	          : nDim;
	    },

	    nodes: function(_) {
	      return arguments.length ? (nodes = _, initializeNodes(), forces.each(initializeForce), simulation) : nodes;
	    },

	    alpha: function(_) {
	      return arguments.length ? (alpha = +_, simulation) : alpha;
	    },

	    alphaMin: function(_) {
	      return arguments.length ? (alphaMin = +_, simulation) : alphaMin;
	    },

	    alphaDecay: function(_) {
	      return arguments.length ? (alphaDecay = +_, simulation) : +alphaDecay;
	    },

	    alphaTarget: function(_) {
	      return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget;
	    },

	    velocityDecay: function(_) {
	      return arguments.length ? (velocityDecay = 1 - _, simulation) : 1 - velocityDecay;
	    },

	    force: function(name, _) {
	      return arguments.length > 1 ? ((_ == null ? forces.remove(name) : forces.set(name, initializeForce(_))), simulation) : forces.get(name);
	    },

	    find: function() {
	      var args = Array.prototype.slice.call(arguments);
	      var x = args.shift() || 0,
	          y = (nDim > 1 ? args.shift() : null) || 0,
	          z = (nDim > 2 ? args.shift() : null) || 0,
	          radius = args.shift() || Infinity;

	      var i = 0,
	          n = nodes.length,
	          dx,
	          dy,
	          dz,
	          d2,
	          node,
	          closest;

	      radius *= radius;

	      for (i = 0; i < n; ++i) {
	        node = nodes[i];
	        dx = x - node.x;
	        dy = y - (node.y || 0);
	        dz = z - (node.z ||0);
	        d2 = dx * dx + dy * dy + dz * dz;
	        if (d2 < radius) closest = node, radius = d2;
	      }

	      return closest;
	    },

	    on: function(name, _) {
	      return arguments.length > 1 ? (event.on(name, _), simulation) : event.on(name);
	    }
	  };
	};

	var manyBody = function() {
	  var nodes,
	      nDim,
	      node,
	      alpha,
	      strength = constant(-30),
	      strengths,
	      distanceMin2 = 1,
	      distanceMax2 = Infinity,
	      theta2 = 0.81;

	  function force(_) {
	    var i,
	        n = nodes.length,
	        tree =
	            (nDim === 1 ? d3Binarytree.binarytree(nodes, x$1)
	            :(nDim === 2 ? d3Quadtree.quadtree(nodes, x$1, y$1)
	            :(nDim === 3 ? d3Octree.octree(nodes, x$1, y$1, z$1)
	            :null
	        ))).visitAfter(accumulate);

	    for (alpha = _, i = 0; i < n; ++i) node = nodes[i], tree.visit(apply);
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length, node;
	    strengths = new Array(n);
	    for (i = 0; i < n; ++i) node = nodes[i], strengths[node.index] = +strength(node, i, nodes);
	  }

	  function accumulate(treeNode) {
	    var strength = 0, q, c, x$$1, y$$1, z$$1, i;

	    // For internal nodes, accumulate forces from children.
	    if (treeNode.length) {
	      for (x$$1 = y$$1 = z$$1 = i = 0; i < 4; ++i) {
	        if ((q = treeNode[i]) && (c = q.value)) {
	          strength += c, x$$1 += c * (q.x || 0), y$$1 += c * (q.y || 0), z$$1 += c * (q.z || 0);
	        }
	      }
	      treeNode.x = x$$1 / strength;
	      if (nDim > 1) { treeNode.y = y$$1 / strength; }
	      if (nDim > 2) { treeNode.z = z$$1 / strength; }
	    }

	    // For leaf nodes, accumulate forces from coincident nodes.
	    else {
	      q = treeNode;
	      q.x = q.data.x;
	      if (nDim > 1) { q.y = q.data.y; }
	      if (nDim > 2) { q.z = q.data.z; }
	      do strength += strengths[q.data.index];
	      while (q = q.next);
	    }

	    treeNode.value = strength;
	  }

	  function apply(treeNode, x1, arg1, arg2, arg3) {
	    if (!treeNode.value) return true;
	    var x2 = [arg1, arg2, arg3][nDim-1];

	    var x$$1 = treeNode.x - node.x,
	        y$$1 = (nDim > 1 ? treeNode.y - node.y : 0),
	        z$$1 = (nDim > 2 ? treeNode.z - node.z : 0),
	        w = x2 - x1,
	        l = x$$1 * x$$1 + y$$1 * y$$1 + z$$1 * z$$1;

	    // Apply the Barnes-Hut approximation if possible.
	    // Limit forces for very close nodes; randomize direction if coincident.
	    if (w * w / theta2 < l) {
	      if (l < distanceMax2) {
	        if (x$$1 === 0) x$$1 = jiggle(), l += x$$1 * x$$1;
	        if (nDim > 1 && y$$1 === 0) y$$1 = jiggle(), l += y$$1 * y$$1;
	        if (nDim > 2 && z$$1 === 0) z$$1 = jiggle(), l += z$$1 * z$$1;
	        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
	        node.vx += x$$1 * treeNode.value * alpha / l;
	        if (nDim > 1) { node.vy += y$$1 * treeNode.value * alpha / l; }
	        if (nDim > 2) { node.vz += z$$1 * treeNode.value * alpha / l; }
	      }
	      return true;
	    }

	    // Otherwise, process points directly.
	    else if (treeNode.length || l >= distanceMax2) return;

	    // Limit forces for very close nodes; randomize direction if coincident.
	    if (treeNode.data !== node || treeNode.next) {
	      if (x$$1 === 0) x$$1 = jiggle(), l += x$$1 * x$$1;
	      if (nDim > 1 && y$$1 === 0) y$$1 = jiggle(), l += y$$1 * y$$1;
	      if (nDim > 2 && z$$1 === 0) z$$1 = jiggle(), l += z$$1 * z$$1;
	      if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
	    }

	    do if (treeNode.data !== node) {
	      w = strengths[treeNode.data.index] * alpha / l;
	      node.vx += x$$1 * w;
	      if (nDim > 1) { node.vy += y$$1 * w; }
	      if (nDim > 2) { node.vz += z$$1 * w; }
	    } while (treeNode = treeNode.next);
	  }

	  force.initialize = function(initNodes, numDimensions) {
	    nodes = initNodes;
	    nDim = numDimensions;
	    initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
	  };

	  force.distanceMin = function(_) {
	    return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
	  };

	  force.distanceMax = function(_) {
	    return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
	  };

	  force.theta = function(_) {
	    return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
	  };

	  return force;
	};

	var x$2 = function(x) {
	  var strength = constant(0.1),
	      nodes,
	      strengths,
	      xz;

	  if (typeof x !== "function") x = constant(x == null ? 0 : +x);

	  function force(alpha) {
	    for (var i = 0, n = nodes.length, node; i < n; ++i) {
	      node = nodes[i], node.vx += (xz[i] - node.x) * strengths[i] * alpha;
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length;
	    strengths = new Array(n);
	    xz = new Array(n);
	    for (i = 0; i < n; ++i) {
	      strengths[i] = isNaN(xz[i] = +x(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _;
	    initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
	  };

	  force.x = function(_) {
	    return arguments.length ? (x = typeof _ === "function" ? _ : constant(+_), initialize(), force) : x;
	  };

	  return force;
	};

	var y$2 = function(y) {
	  var strength = constant(0.1),
	      nodes,
	      strengths,
	      yz;

	  if (typeof y !== "function") y = constant(y == null ? 0 : +y);

	  function force(alpha) {
	    for (var i = 0, n = nodes.length, node; i < n; ++i) {
	      node = nodes[i], node.vy += (yz[i] - node.y) * strengths[i] * alpha;
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length;
	    strengths = new Array(n);
	    yz = new Array(n);
	    for (i = 0; i < n; ++i) {
	      strengths[i] = isNaN(yz[i] = +y(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _;
	    initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
	  };

	  force.y = function(_) {
	    return arguments.length ? (y = typeof _ === "function" ? _ : constant(+_), initialize(), force) : y;
	  };

	  return force;
	};

	var z$2 = function(z) {
	  var strength = constant(0.1),
	      nodes,
	      strengths,
	      zz;

	  if (typeof z !== "function") z = constant(z == null ? 0 : +z);

	  function force(alpha) {
	    for (var i = 0, n = nodes.length, node; i < n; ++i) {
	      node = nodes[i], node.vz += (zz[i] - node.z) * strengths[i] * alpha;
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length;
	    strengths = new Array(n);
	    zz = new Array(n);
	    for (i = 0; i < n; ++i) {
	      strengths[i] = isNaN(zz[i] = +z(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _;
	    initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
	  };

	  force.z = function(_) {
	    return arguments.length ? (z = typeof _ === "function" ? _ : constant(+_), initialize(), force) : z;
	  };

	  return force;
	};

	exports.forceCenter = center;
	exports.forceCollide = collide;
	exports.forceLink = link;
	exports.forceManyBody = manyBody;
	exports.forceSimulation = simulation;
	exports.forceX = x$2;
	exports.forceY = y$2;
	exports.forceZ = z$2;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	// https://github.com/vasturiano/d3-binarytree Version 0.1.1. Copyright 2017 Vasco Asturiano.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var tree_add = function(d) {
	  var x = +this._x.call(null, d);
	  return add(this.cover(x), x, d);
	};

	function add(tree, x, d) {
	  if (isNaN(x)) return tree; // ignore invalid points

	  var parent,
	      node = tree._root,
	      leaf = {data: d},
	      x0 = tree._x0,
	      x1 = tree._x1,
	      xm,
	      xp,
	      right,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return tree._root = leaf, tree;

	  // Find the existing leaf for the new point, or add it.
	  while (node.length) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (parent = node, !(node = node[i = +right])) return parent[i] = leaf, tree;
	  }

	  // Is the new point is exactly coincident with the existing point?
	  xp = +tree._x.call(null, node.data);
	  if (x === xp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;

	  // Otherwise, split the leaf node until the old and new point are separated.
	  do {
	    parent = parent ? parent[i] = new Array(2) : tree._root = new Array(2);
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	  } while ((i = +right) === (j = +(xp >= xm)));
	  return parent[j] = node, parent[i] = leaf, tree;
	}

	function addAll(data) {
	  var i, n = data.length,
	      x,
	      xz = new Array(n),
	      x0 = Infinity,
	      x1 = -Infinity;

	  // Compute the points and their extent.
	  for (i = 0; i < n; ++i) {
	    if (isNaN(x = +this._x.call(null, data[i]))) continue;
	    xz[i] = x;
	    if (x < x0) x0 = x;
	    if (x > x1) x1 = x;
	  }

	  // If there were no (valid) points, inherit the existing extent.
	  if (x1 < x0) x0 = this._x0, x1 = this._x1;

	  // Expand the tree to cover the new points.
	  this.cover(x0).cover(x1);

	  // Add the new points.
	  for (i = 0; i < n; ++i) {
	    add(this, xz[i], data[i]);
	  }

	  return this;
	}

	var tree_cover = function(x) {
	  if (isNaN(x = +x)) return this; // ignore invalid points

	  var x0 = this._x0,
	      x1 = this._x1;

	  // If the binarytree has no extent, initialize them.
	  // Integer extent are necessary so that if we later double the extent,
	  // the existing half boundaries don’t change due to floating point error!
	  if (isNaN(x0)) {
	    x1 = (x0 = Math.floor(x)) + 1;
	  }

	  // Otherwise, double repeatedly to cover.
	  else if (x0 > x || x > x1) {
	    var z = x1 - x0,
	        node = this._root,
	        parent,
	        i;

	    switch (i = +(x < (x0 + x1) / 2)) {
	      case 0: {
	        do parent = new Array(2), parent[i] = node, node = parent;
	        while (z *= 2, x1 = x0 + z, x > x1);
	        break;
	      }
	      case 1: {
	        do parent = new Array(2), parent[i] = node, node = parent;
	        while (z *= 2, x0 = x1 - z, x0 > x);
	        break;
	      }
	    }

	    if (this._root && this._root.length) this._root = node;
	  }

	  // If the binarytree covers the point already, just return.
	  else return this;

	  this._x0 = x0;
	  this._x1 = x1;
	  return this;
	};

	var tree_data = function() {
	  var data = [];
	  this.visit(function(node) {
	    if (!node.length) do data.push(node.data); while (node = node.next)
	  });
	  return data;
	};

	var tree_extent = function(_) {
	  return arguments.length
	      ? this.cover(+_[0][0]).cover(+_[1][0])
	      : isNaN(this._x0) ? undefined : [[this._x0], [this._x1]];
	};

	var Half = function(node, x0, x1) {
	  this.node = node;
	  this.x0 = x0;
	  this.x1 = x1;
	};

	var tree_find = function(x, radius) {
	  var data,
	      x0 = this._x0,
	      x1,
	      x2,
	      x3 = this._x1,
	      halves = [],
	      node = this._root,
	      q,
	      i;

	  if (node) halves.push(new Half(node, x0, x3));
	  if (radius == null) radius = Infinity;
	  else {
	    x0 = x - radius;
	    x3 = x + radius;
	  }

	  while (q = halves.pop()) {

	    // Stop searching if this half can’t contain a closer node.
	    if (!(node = q.node)
	        || (x1 = q.x0) > x3
	        || (x2 = q.x1) < x0) continue;

	    // Bisect the current half.
	    if (node.length) {
	      var xm = (x1 + x2) / 2;

	      halves.push(
	        new Half(node[1], xm, x2),
	        new Half(node[0], x1, xm)
	      );

	      // Visit the closest half first.
	      if (i = +(x >= xm)) {
	        q = halves[halves.length - 1];
	        halves[halves.length - 1] = halves[halves.length - 1 - i];
	        halves[halves.length - 1 - i] = q;
	      }
	    }

	    // Visit this point. (Visiting coincident points isn’t necessary!)
	    else {
	      var d = x - +this._x.call(null, node.data);
	      if (d < radius) {
	        radius = d;
	        x0 = x - d;
	        x3 = x + d;
	        data = node.data;
	      }
	    }
	  }

	  return data;
	};

	var tree_remove = function(d) {
	  if (isNaN(x = +this._x.call(null, d))) return this; // ignore invalid points

	  var parent,
	      node = this._root,
	      retainer,
	      previous,
	      next,
	      x0 = this._x0,
	      x1 = this._x1,
	      x,
	      xm,
	      right,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return this;

	  // Find the leaf node for the point.
	  // While descending, also retain the deepest parent with a non-removed sibling.
	  if (node.length) while (true) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (!(parent = node, node = node[i = +right])) return this;
	    if (!node.length) break;
	    if (parent[(i + 1) & 1]) retainer = parent, j = i;
	  }

	  // Find the point to remove.
	  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
	  if (next = node.next) delete node.next;

	  // If there are multiple coincident points, remove just the point.
	  if (previous) return (next ? previous.next = next : delete previous.next), this;

	  // If this is the root point, remove it.
	  if (!parent) return this._root = next, this;

	  // Remove this leaf.
	  next ? parent[i] = next : delete parent[i];

	  // If the parent now contains exactly one leaf, collapse superfluous parents.
	  if ((node = parent[0] || parent[1])
	      && node === (parent[1] || parent[0])
	      && !node.length) {
	    if (retainer) retainer[j] = node;
	    else this._root = node;
	  }

	  return this;
	};

	function removeAll(data) {
	  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
	  return this;
	}

	var tree_root = function() {
	  return this._root;
	};

	var tree_size = function() {
	  var size = 0;
	  this.visit(function(node) {
	    if (!node.length) do ++size; while (node = node.next)
	  });
	  return size;
	};

	var tree_visit = function(callback) {
	  var halves = [], q, node = this._root, child, x0, x1;
	  if (node) halves.push(new Half(node, this._x0, this._x1));
	  while (q = halves.pop()) {
	    if (!callback(node = q.node, x0 = q.x0, x1 = q.x1) && node.length) {
	      var xm = (x0 + x1) / 2;
	      if (child = node[1]) halves.push(new Half(child, xm, x1));
	      if (child = node[0]) halves.push(new Half(child, x0, xm));
	    }
	  }
	  return this;
	};

	var tree_visitAfter = function(callback) {
	  var halves = [], next = [], q;
	  if (this._root) halves.push(new Half(this._root, this._x0, this._x1));
	  while (q = halves.pop()) {
	    var node = q.node;
	    if (node.length) {
	      var child, x0 = q.x0, x1 = q.x1, xm = (x0 + x1) / 2;
	      if (child = node[0]) halves.push(new Half(child, x0, xm));
	      if (child = node[1]) halves.push(new Half(child, xm, x1));
	    }
	    next.push(q);
	  }
	  while (q = next.pop()) {
	    callback(q.node, q.x0, q.x1);
	  }
	  return this;
	};

	function defaultX(d) {
	  return d[0];
	}

	var tree_x = function(_) {
	  return arguments.length ? (this._x = _, this) : this._x;
	};

	function binarytree(nodes, x) {
	  var tree = new Binarytree(x == null ? defaultX : x, NaN, NaN);
	  return nodes == null ? tree : tree.addAll(nodes);
	}

	function Binarytree(x, x0, x1) {
	  this._x = x;
	  this._x0 = x0;
	  this._x1 = x1;
	  this._root = undefined;
	}

	function leaf_copy(leaf) {
	  var copy = {data: leaf.data}, next = copy;
	  while (leaf = leaf.next) next = next.next = {data: leaf.data};
	  return copy;
	}

	var treeProto = binarytree.prototype = Binarytree.prototype;

	treeProto.copy = function() {
	  var copy = new Binarytree(this._x, this._x0, this._x1),
	      node = this._root,
	      nodes,
	      child;

	  if (!node) return copy;

	  if (!node.length) return copy._root = leaf_copy(node), copy;

	  nodes = [{source: node, target: copy._root = new Array(2)}];
	  while (node = nodes.pop()) {
	    for (var i = 0; i < 2; ++i) {
	      if (child = node.source[i]) {
	        if (child.length) nodes.push({source: child, target: node.target[i] = new Array(2)});
	        else node.target[i] = leaf_copy(child);
	      }
	    }
	  }

	  return copy;
	};

	treeProto.add = tree_add;
	treeProto.addAll = addAll;
	treeProto.cover = tree_cover;
	treeProto.data = tree_data;
	treeProto.extent = tree_extent;
	treeProto.find = tree_find;
	treeProto.remove = tree_remove;
	treeProto.removeAll = removeAll;
	treeProto.root = tree_root;
	treeProto.size = tree_size;
	treeProto.visit = tree_visit;
	treeProto.visitAfter = tree_visitAfter;
	treeProto.x = tree_x;

	exports.binarytree = binarytree;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-quadtree/ Version 1.0.3. Copyright 2017 Mike Bostock.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var tree_add = function(d) {
	  var x = +this._x.call(null, d),
	      y = +this._y.call(null, d);
	  return add(this.cover(x, y), x, y, d);
	};

	function add(tree, x, y, d) {
	  if (isNaN(x) || isNaN(y)) return tree; // ignore invalid points

	  var parent,
	      node = tree._root,
	      leaf = {data: d},
	      x0 = tree._x0,
	      y0 = tree._y0,
	      x1 = tree._x1,
	      y1 = tree._y1,
	      xm,
	      ym,
	      xp,
	      yp,
	      right,
	      bottom,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return tree._root = leaf, tree;

	  // Find the existing leaf for the new point, or add it.
	  while (node.length) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	    if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
	  }

	  // Is the new point is exactly coincident with the existing point?
	  xp = +tree._x.call(null, node.data);
	  yp = +tree._y.call(null, node.data);
	  if (x === xp && y === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;

	  // Otherwise, split the leaf node until the old and new point are separated.
	  do {
	    parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	  } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | (xp >= xm)));
	  return parent[j] = node, parent[i] = leaf, tree;
	}

	function addAll(data) {
	  var d, i, n = data.length,
	      x,
	      y,
	      xz = new Array(n),
	      yz = new Array(n),
	      x0 = Infinity,
	      y0 = Infinity,
	      x1 = -Infinity,
	      y1 = -Infinity;

	  // Compute the points and their extent.
	  for (i = 0; i < n; ++i) {
	    if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d))) continue;
	    xz[i] = x;
	    yz[i] = y;
	    if (x < x0) x0 = x;
	    if (x > x1) x1 = x;
	    if (y < y0) y0 = y;
	    if (y > y1) y1 = y;
	  }

	  // If there were no (valid) points, inherit the existing extent.
	  if (x1 < x0) x0 = this._x0, x1 = this._x1;
	  if (y1 < y0) y0 = this._y0, y1 = this._y1;

	  // Expand the tree to cover the new points.
	  this.cover(x0, y0).cover(x1, y1);

	  // Add the new points.
	  for (i = 0; i < n; ++i) {
	    add(this, xz[i], yz[i], data[i]);
	  }

	  return this;
	}

	var tree_cover = function(x, y) {
	  if (isNaN(x = +x) || isNaN(y = +y)) return this; // ignore invalid points

	  var x0 = this._x0,
	      y0 = this._y0,
	      x1 = this._x1,
	      y1 = this._y1;

	  // If the quadtree has no extent, initialize them.
	  // Integer extent are necessary so that if we later double the extent,
	  // the existing quadrant boundaries don’t change due to floating point error!
	  if (isNaN(x0)) {
	    x1 = (x0 = Math.floor(x)) + 1;
	    y1 = (y0 = Math.floor(y)) + 1;
	  }

	  // Otherwise, double repeatedly to cover.
	  else if (x0 > x || x > x1 || y0 > y || y > y1) {
	    var z = x1 - x0,
	        node = this._root,
	        parent,
	        i;

	    switch (i = (y < (y0 + y1) / 2) << 1 | (x < (x0 + x1) / 2)) {
	      case 0: {
	        do parent = new Array(4), parent[i] = node, node = parent;
	        while (z *= 2, x1 = x0 + z, y1 = y0 + z, x > x1 || y > y1);
	        break;
	      }
	      case 1: {
	        do parent = new Array(4), parent[i] = node, node = parent;
	        while (z *= 2, x0 = x1 - z, y1 = y0 + z, x0 > x || y > y1);
	        break;
	      }
	      case 2: {
	        do parent = new Array(4), parent[i] = node, node = parent;
	        while (z *= 2, x1 = x0 + z, y0 = y1 - z, x > x1 || y0 > y);
	        break;
	      }
	      case 3: {
	        do parent = new Array(4), parent[i] = node, node = parent;
	        while (z *= 2, x0 = x1 - z, y0 = y1 - z, x0 > x || y0 > y);
	        break;
	      }
	    }

	    if (this._root && this._root.length) this._root = node;
	  }

	  // If the quadtree covers the point already, just return.
	  else return this;

	  this._x0 = x0;
	  this._y0 = y0;
	  this._x1 = x1;
	  this._y1 = y1;
	  return this;
	};

	var tree_data = function() {
	  var data = [];
	  this.visit(function(node) {
	    if (!node.length) do data.push(node.data); while (node = node.next)
	  });
	  return data;
	};

	var tree_extent = function(_) {
	  return arguments.length
	      ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1])
	      : isNaN(this._x0) ? undefined : [[this._x0, this._y0], [this._x1, this._y1]];
	};

	var Quad = function(node, x0, y0, x1, y1) {
	  this.node = node;
	  this.x0 = x0;
	  this.y0 = y0;
	  this.x1 = x1;
	  this.y1 = y1;
	};

	var tree_find = function(x, y, radius) {
	  var data,
	      x0 = this._x0,
	      y0 = this._y0,
	      x1,
	      y1,
	      x2,
	      y2,
	      x3 = this._x1,
	      y3 = this._y1,
	      quads = [],
	      node = this._root,
	      q,
	      i;

	  if (node) quads.push(new Quad(node, x0, y0, x3, y3));
	  if (radius == null) radius = Infinity;
	  else {
	    x0 = x - radius, y0 = y - radius;
	    x3 = x + radius, y3 = y + radius;
	    radius *= radius;
	  }

	  while (q = quads.pop()) {

	    // Stop searching if this quadrant can’t contain a closer node.
	    if (!(node = q.node)
	        || (x1 = q.x0) > x3
	        || (y1 = q.y0) > y3
	        || (x2 = q.x1) < x0
	        || (y2 = q.y1) < y0) continue;

	    // Bisect the current quadrant.
	    if (node.length) {
	      var xm = (x1 + x2) / 2,
	          ym = (y1 + y2) / 2;

	      quads.push(
	        new Quad(node[3], xm, ym, x2, y2),
	        new Quad(node[2], x1, ym, xm, y2),
	        new Quad(node[1], xm, y1, x2, ym),
	        new Quad(node[0], x1, y1, xm, ym)
	      );

	      // Visit the closest quadrant first.
	      if (i = (y >= ym) << 1 | (x >= xm)) {
	        q = quads[quads.length - 1];
	        quads[quads.length - 1] = quads[quads.length - 1 - i];
	        quads[quads.length - 1 - i] = q;
	      }
	    }

	    // Visit this point. (Visiting coincident points isn’t necessary!)
	    else {
	      var dx = x - +this._x.call(null, node.data),
	          dy = y - +this._y.call(null, node.data),
	          d2 = dx * dx + dy * dy;
	      if (d2 < radius) {
	        var d = Math.sqrt(radius = d2);
	        x0 = x - d, y0 = y - d;
	        x3 = x + d, y3 = y + d;
	        data = node.data;
	      }
	    }
	  }

	  return data;
	};

	var tree_remove = function(d) {
	  if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d))) return this; // ignore invalid points

	  var parent,
	      node = this._root,
	      retainer,
	      previous,
	      next,
	      x0 = this._x0,
	      y0 = this._y0,
	      x1 = this._x1,
	      y1 = this._y1,
	      x,
	      y,
	      xm,
	      ym,
	      right,
	      bottom,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return this;

	  // Find the leaf node for the point.
	  // While descending, also retain the deepest parent with a non-removed sibling.
	  if (node.length) while (true) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	    if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
	    if (!node.length) break;
	    if (parent[(i + 1) & 3] || parent[(i + 2) & 3] || parent[(i + 3) & 3]) retainer = parent, j = i;
	  }

	  // Find the point to remove.
	  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
	  if (next = node.next) delete node.next;

	  // If there are multiple coincident points, remove just the point.
	  if (previous) return (next ? previous.next = next : delete previous.next), this;

	  // If this is the root point, remove it.
	  if (!parent) return this._root = next, this;

	  // Remove this leaf.
	  next ? parent[i] = next : delete parent[i];

	  // If the parent now contains exactly one leaf, collapse superfluous parents.
	  if ((node = parent[0] || parent[1] || parent[2] || parent[3])
	      && node === (parent[3] || parent[2] || parent[1] || parent[0])
	      && !node.length) {
	    if (retainer) retainer[j] = node;
	    else this._root = node;
	  }

	  return this;
	};

	function removeAll(data) {
	  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
	  return this;
	}

	var tree_root = function() {
	  return this._root;
	};

	var tree_size = function() {
	  var size = 0;
	  this.visit(function(node) {
	    if (!node.length) do ++size; while (node = node.next)
	  });
	  return size;
	};

	var tree_visit = function(callback) {
	  var quads = [], q, node = this._root, child, x0, y0, x1, y1;
	  if (node) quads.push(new Quad(node, this._x0, this._y0, this._x1, this._y1));
	  while (q = quads.pop()) {
	    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
	      var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
	      if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
	      if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
	      if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
	      if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
	    }
	  }
	  return this;
	};

	var tree_visitAfter = function(callback) {
	  var quads = [], next = [], q;
	  if (this._root) quads.push(new Quad(this._root, this._x0, this._y0, this._x1, this._y1));
	  while (q = quads.pop()) {
	    var node = q.node;
	    if (node.length) {
	      var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
	      if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
	      if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
	      if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
	      if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
	    }
	    next.push(q);
	  }
	  while (q = next.pop()) {
	    callback(q.node, q.x0, q.y0, q.x1, q.y1);
	  }
	  return this;
	};

	function defaultX(d) {
	  return d[0];
	}

	var tree_x = function(_) {
	  return arguments.length ? (this._x = _, this) : this._x;
	};

	function defaultY(d) {
	  return d[1];
	}

	var tree_y = function(_) {
	  return arguments.length ? (this._y = _, this) : this._y;
	};

	function quadtree(nodes, x, y) {
	  var tree = new Quadtree(x == null ? defaultX : x, y == null ? defaultY : y, NaN, NaN, NaN, NaN);
	  return nodes == null ? tree : tree.addAll(nodes);
	}

	function Quadtree(x, y, x0, y0, x1, y1) {
	  this._x = x;
	  this._y = y;
	  this._x0 = x0;
	  this._y0 = y0;
	  this._x1 = x1;
	  this._y1 = y1;
	  this._root = undefined;
	}

	function leaf_copy(leaf) {
	  var copy = {data: leaf.data}, next = copy;
	  while (leaf = leaf.next) next = next.next = {data: leaf.data};
	  return copy;
	}

	var treeProto = quadtree.prototype = Quadtree.prototype;

	treeProto.copy = function() {
	  var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1),
	      node = this._root,
	      nodes,
	      child;

	  if (!node) return copy;

	  if (!node.length) return copy._root = leaf_copy(node), copy;

	  nodes = [{source: node, target: copy._root = new Array(4)}];
	  while (node = nodes.pop()) {
	    for (var i = 0; i < 4; ++i) {
	      if (child = node.source[i]) {
	        if (child.length) nodes.push({source: child, target: node.target[i] = new Array(4)});
	        else node.target[i] = leaf_copy(child);
	      }
	    }
	  }

	  return copy;
	};

	treeProto.add = tree_add;
	treeProto.addAll = addAll;
	treeProto.cover = tree_cover;
	treeProto.data = tree_data;
	treeProto.extent = tree_extent;
	treeProto.find = tree_find;
	treeProto.remove = tree_remove;
	treeProto.removeAll = removeAll;
	treeProto.root = tree_root;
	treeProto.size = tree_size;
	treeProto.visit = tree_visit;
	treeProto.visitAfter = tree_visitAfter;
	treeProto.x = tree_x;
	treeProto.y = tree_y;

	exports.quadtree = quadtree;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	// https://github.com/vasturiano/d3-octree Version 0.1.2. Copyright 2017 Vasco Asturiano.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var tree_add = function(d) {
	  var x = +this._x.call(null, d),
	      y = +this._y.call(null, d),
	      z = +this._z.call(null, d);
	  return add(this.cover(x, y, z), x, y, z, d);
	};

	function add(tree, x, y, z, d) {
	  if (isNaN(x) || isNaN(y) || isNaN(z)) return tree; // ignore invalid points

	  var parent,
	      node = tree._root,
	      leaf = {data: d},
	      x0 = tree._x0,
	      y0 = tree._y0,
	      z0 = tree._z0,
	      x1 = tree._x1,
	      y1 = tree._y1,
	      z1 = tree._z1,
	      xm,
	      ym,
	      zm,
	      xp,
	      yp,
	      zp,
	      right,
	      bottom,
	      deep,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return tree._root = leaf, tree;

	  // Find the existing leaf for the new point, or add it.
	  while (node.length) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	    if (deep = z >= (zm = (z0 + z1) / 2)) z0 = zm; else z1 = zm;
	    if (parent = node, !(node = node[i = deep << 2 | bottom << 1 | right])) return parent[i] = leaf, tree;
	  }

	  // Is the new point is exactly coincident with the existing point?
	  xp = +tree._x.call(null, node.data);
	  yp = +tree._y.call(null, node.data);
	  zp = +tree._z.call(null, node.data);
	  if (x === xp && y === yp && z === zp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;

	  // Otherwise, split the leaf node until the old and new point are separated.
	  do {
	    parent = parent ? parent[i] = new Array(8) : tree._root = new Array(8);
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	    if (deep = z >= (zm = (z0 + z1) / 2)) z0 = zm; else z1 = zm;
	  } while ((i = deep << 2 | bottom << 1 | right) === (j = (zp >= zm) << 2 | (yp >= ym) << 1 | (xp >= xm)));
	  return parent[j] = node, parent[i] = leaf, tree;
	}

	function addAll(data) {
	  var d, i, n = data.length,
	      x,
	      y,
	      z,
	      xz = new Array(n),
	      yz = new Array(n),
	      zz = new Array(n),
	      x0 = Infinity,
	      y0 = Infinity,
	      z0 = Infinity,
	      x1 = -Infinity,
	      y1 = -Infinity,
	      z1 = -Infinity;

	  // Compute the points and their extent.
	  for (i = 0; i < n; ++i) {
	    if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d)) || isNaN(z = +this._z.call(null, d))) continue;
	    xz[i] = x;
	    yz[i] = y;
	    zz[i] = z;
	    if (x < x0) x0 = x;
	    if (x > x1) x1 = x;
	    if (y < y0) y0 = y;
	    if (y > y1) y1 = y;
	    if (z < z0) z0 = z;
	    if (z > z1) z1 = z;
	  }

	  // If there were no (valid) points, inherit the existing extent.
	  if (x1 < x0) x0 = this._x0, x1 = this._x1;
	  if (y1 < y0) y0 = this._y0, y1 = this._y1;
	  if (z1 < z0) z0 = this._z0, z1 = this._z1;

	  // Expand the tree to cover the new points.
	  this.cover(x0, y0, z0).cover(x1, y1, z1);

	  // Add the new points.
	  for (i = 0; i < n; ++i) {
	    add(this, xz[i], yz[i], zz[i], data[i]);
	  }

	  return this;
	}

	var tree_cover = function(x, y, z) {
	  if (isNaN(x = +x) || isNaN(y = +y) || isNaN(z = +z)) return this; // ignore invalid points

	  var x0 = this._x0,
	      y0 = this._y0,
	      z0 = this._z0,
	      x1 = this._x1,
	      y1 = this._y1,
	      z1 = this._z1;

	  // If the octree has no extent, initialize them.
	  // Integer extent are necessary so that if we later double the extent,
	  // the existing octant boundaries don’t change due to floating point error!
	  if (isNaN(x0)) {
	    x1 = (x0 = Math.floor(x)) + 1;
	    y1 = (y0 = Math.floor(y)) + 1;
	    z1 = (z0 = Math.floor(z)) + 1;
	  }

	  // Otherwise, double repeatedly to cover.
	  else if (x0 > x || x > x1 || y0 > y || y > y1 || z0 > z || z > z1) {
	    var t = x1 - x0,
	        node = this._root,
	        parent,
	        i;

	    switch (i = (z < (z0 + z1) / 2) << 2 | (y < (y0 + y1) / 2) << 1 | (x < (x0 + x1) / 2)) {
	      case 0: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x1 = x0 + t, y1 = y0 + t, z1 = z0 + t, x > x1 || y > y1 || z > z1);
	        break;
	      }
	      case 1: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x0 = x1 - t, y1 = y0 + t, z1 = z0 + t, x0 > x || y > y1 || z > z1);
	        break;
	      }
	      case 2: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x1 = x0 + t, y0 = y1 - t, z1 = z0 + t, x > x1 || y0 > y || z > z1);
	        break;
	      }
	      case 3: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x0 = x1 - t, y0 = y1 - t, z1 = z0 + t, x0 > x || y0 > y || z > z1);
	        break;
	      }
	      case 4: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x1 = x0 + t, y1 = y0 + t, z0 = z1 - t, x > x1 || y > y1 || z0 > z);
	        break;
	      }
	      case 5: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x0 = x1 - t, y1 = y0 + t, z0 = z1 - t, x0 > x || y > y1 || z0 > z);
	        break;
	      }
	      case 6: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x1 = x0 + t, y0 = y1 - t, z0 = z1 - t, x > x1 || y0 > y || z0 > z);
	        break;
	      }
	      case 7: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x0 = x1 - t, y0 = y1 - t, z0 = z1 - t, x0 > x || y0 > y || z0 > z);
	        break;
	      }
	    }

	    if (this._root && this._root.length) this._root = node;
	  }

	  // If the octree covers the point already, just return.
	  else return this;

	  this._x0 = x0;
	  this._y0 = y0;
	  this._z0 = z0;
	  this._x1 = x1;
	  this._y1 = y1;
	  this._z1 = z1;
	  return this;
	};

	var tree_data = function() {
	  var data = [];
	  this.visit(function(node) {
	    if (!node.length) do data.push(node.data); while (node = node.next)
	  });
	  return data;
	};

	var tree_extent = function(_) {
	  return arguments.length
	      ? this.cover(+_[0][0], +_[0][1], +_[0][2]).cover(+_[1][0], +_[1][1], +_[1][2])
	      : isNaN(this._x0) ? undefined : [[this._x0, this._y0, this._z0], [this._x1, this._y1, this._z1]];
	};

	var Octant = function(node, x0, y0, z0, x1, y1, z1) {
	  this.node = node;
	  this.x0 = x0;
	  this.y0 = y0;
	  this.z0 = z0;
	  this.x1 = x1;
	  this.y1 = y1;
	  this.z1 = z1;
	};

	var tree_find = function(x, y, z, radius) {
	  var data,
	      x0 = this._x0,
	      y0 = this._y0,
	      z0 = this._z0,
	      x1,
	      y1,
	      z1,
	      x2,
	      y2,
	      z2,
	      x3 = this._x1,
	      y3 = this._y1,
	      z3 = this._z1,
	      octs = [],
	      node = this._root,
	      q,
	      i;

	  if (node) octs.push(new Octant(node, x0, y0, z0, x3, y3, z3));
	  if (radius == null) radius = Infinity;
	  else {
	    x0 = x - radius, y0 = y - radius, z0 = z - radius;
	    x3 = x + radius, y3 = y + radius, z3 = z + radius;
	    radius *= radius;
	  }

	  while (q = octs.pop()) {

	    // Stop searching if this octant can’t contain a closer node.
	    if (!(node = q.node)
	        || (x1 = q.x0) > x3
	        || (y1 = q.y0) > y3
	        || (z1 = q.z0) > z3
	        || (x2 = q.x1) < x0
	        || (y2 = q.y1) < y0
	        || (z2 = q.z1) < z0) continue;

	    // Bisect the current octant.
	    if (node.length) {
	      var xm = (x1 + x2) / 2,
	          ym = (y1 + y2) / 2,
	          zm = (z1 + z2) / 2;

	      octs.push(
	        new Octant(node[7], xm, ym, zm, x2, y2, z2),
	        new Octant(node[6], x1, ym, zm, xm, y2, z2),
	        new Octant(node[5], xm, y1, zm, x2, ym, z2),
	        new Octant(node[4], x1, y1, zm, xm, ym, z2),
	        new Octant(node[3], xm, ym, z1, x2, y2, zm),
	        new Octant(node[2], x1, ym, z1, xm, y2, zm),
	        new Octant(node[1], xm, y1, z1, x2, ym, zm),
	        new Octant(node[0], x1, y1, z1, xm, ym, zm)
	      );

	      // Visit the closest octant first.
	      if (i = (z >= zm) << 2 | (y >= ym) << 1 | (x >= xm)) {
	        q = octs[octs.length - 1];
	        octs[octs.length - 1] = octs[octs.length - 1 - i];
	        octs[octs.length - 1 - i] = q;
	      }
	    }

	    // Visit this point. (Visiting coincident points isn’t necessary!)
	    else {
	      var dx = x - +this._x.call(null, node.data),
	          dy = y - +this._y.call(null, node.data),
	          dz = z - +this._z.call(null, node.data),
	          d2 = dx * dx + dy * dy + dz * dz;
	      if (d2 < radius) {
	        var d = Math.sqrt(radius = d2);
	        x0 = x - d, y0 = y - d, z0 = z - d;
	        x3 = x + d, y3 = y + d, z3 = z + d;
	        data = node.data;
	      }
	    }
	  }

	  return data;
	};

	var tree_remove = function(d) {
	  if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d)) || isNaN(z = +this._z.call(null, d))) return this; // ignore invalid points

	  var parent,
	      node = this._root,
	      retainer,
	      previous,
	      next,
	      x0 = this._x0,
	      y0 = this._y0,
	      z0 = this._z0,
	      x1 = this._x1,
	      y1 = this._y1,
	      z1 = this._z1,
	      x,
	      y,
	      z,
	      xm,
	      ym,
	      zm,
	      right,
	      bottom,
	      deep,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return this;

	  // Find the leaf node for the point.
	  // While descending, also retain the deepest parent with a non-removed sibling.
	  if (node.length) while (true) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	    if (deep = z >= (zm = (z0 + z1) / 2)) z0 = zm; else z1 = zm;
	    if (!(parent = node, node = node[i = deep << 2 | bottom << 1 | right])) return this;
	    if (!node.length) break;
	    if (parent[(i + 1) & 7] || parent[(i + 2) & 7] || parent[(i + 3) & 7] || parent[(i + 4) & 7] || parent[(i + 5) & 7] || parent[(i + 6) & 7] || parent[(i + 7) & 7]) retainer = parent, j = i;
	  }

	  // Find the point to remove.
	  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
	  if (next = node.next) delete node.next;

	  // If there are multiple coincident points, remove just the point.
	  if (previous) return (next ? previous.next = next : delete previous.next), this;

	  // If this is the root point, remove it.
	  if (!parent) return this._root = next, this;

	  // Remove this leaf.
	  next ? parent[i] = next : delete parent[i];

	  // If the parent now contains exactly one leaf, collapse superfluous parents.
	  if ((node = parent[0] || parent[1] || parent[2] || parent[3] || parent[4] || parent[5] || parent[6] || parent[7])
	      && node === (parent[7] || parent[6] || parent[5] || parent[4] || parent[3] || parent[2] || parent[1] || parent[0])
	      && !node.length) {
	    if (retainer) retainer[j] = node;
	    else this._root = node;
	  }

	  return this;
	};

	function removeAll(data) {
	  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
	  return this;
	}

	var tree_root = function() {
	  return this._root;
	};

	var tree_size = function() {
	  var size = 0;
	  this.visit(function(node) {
	    if (!node.length) do ++size; while (node = node.next)
	  });
	  return size;
	};

	var tree_visit = function(callback) {
	  var octs = [], q, node = this._root, child, x0, y0, z0, x1, y1, z1;
	  if (node) octs.push(new Octant(node, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1));
	  while (q = octs.pop()) {
	    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, z0 = q.z0, x1 = q.x1, y1 = q.y1, z1 = q.z1) && node.length) {
	      var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
	      if (child = node[7]) octs.push(new Octant(child, xm, ym, zm, x1, y1, z1));
	      if (child = node[6]) octs.push(new Octant(child, x0, ym, zm, xm, y1, z1));
	      if (child = node[5]) octs.push(new Octant(child, xm, y0, zm, x1, ym, z1));
	      if (child = node[4]) octs.push(new Octant(child, x0, y0, zm, xm, ym, z1));
	      if (child = node[3]) octs.push(new Octant(child, xm, ym, z0, x1, y1, zm));
	      if (child = node[2]) octs.push(new Octant(child, x0, ym, z0, xm, y1, zm));
	      if (child = node[1]) octs.push(new Octant(child, xm, y0, z0, x1, ym, zm));
	      if (child = node[0]) octs.push(new Octant(child, x0, y0, z0, xm, ym, zm));
	    }
	  }
	  return this;
	};

	var tree_visitAfter = function(callback) {
	  var octs = [], next = [], q;
	  if (this._root) octs.push(new Octant(this._root, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1));
	  while (q = octs.pop()) {
	    var node = q.node;
	    if (node.length) {
	      var child, x0 = q.x0, y0 = q.y0, z0 = q.z0, x1 = q.x1, y1 = q.y1, z1 = q.z1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
	      if (child = node[0]) octs.push(new Octant(child, x0, y0, z0, xm, ym, zm));
	      if (child = node[1]) octs.push(new Octant(child, xm, y0, z0, x1, ym, zm));
	      if (child = node[2]) octs.push(new Octant(child, x0, ym, z0, xm, y1, zm));
	      if (child = node[3]) octs.push(new Octant(child, xm, ym, z0, x1, y1, zm));
	      if (child = node[4]) octs.push(new Octant(child, x0, y0, zm, xm, ym, z1));
	      if (child = node[5]) octs.push(new Octant(child, xm, y0, zm, x1, ym, z1));
	      if (child = node[6]) octs.push(new Octant(child, x0, ym, zm, xm, y1, z1));
	      if (child = node[7]) octs.push(new Octant(child, xm, ym, zm, x1, y1, z1));
	    }
	    next.push(q);
	  }
	  while (q = next.pop()) {
	    callback(q.node, q.x0, q.y0, q.z0, q.x1, q.y1, q.z1);
	  }
	  return this;
	};

	function defaultX(d) {
	  return d[0];
	}

	var tree_x = function(_) {
	  return arguments.length ? (this._x = _, this) : this._x;
	};

	function defaultY(d) {
	  return d[1];
	}

	var tree_y = function(_) {
	  return arguments.length ? (this._y = _, this) : this._y;
	};

	function defaultZ(d) {
	  return d[2];
	}

	var tree_z = function(_) {
	  return arguments.length ? (this._z = _, this) : this._z;
	};

	function octree(nodes, x, y, z) {
	  var tree = new Octree(x == null ? defaultX : x, y == null ? defaultY : y, z == null ? defaultZ : z, NaN, NaN, NaN, NaN, NaN, NaN);
	  return nodes == null ? tree : tree.addAll(nodes);
	}

	function Octree(x, y, z, x0, y0, z0, x1, y1, z1) {
	  this._x = x;
	  this._y = y;
	  this._z = z;
	  this._x0 = x0;
	  this._y0 = y0;
	  this._z0 = z0;
	  this._x1 = x1;
	  this._y1 = y1;
	  this._z1 = z1;
	  this._root = undefined;
	}

	function leaf_copy(leaf) {
	  var copy = {data: leaf.data}, next = copy;
	  while (leaf = leaf.next) next = next.next = {data: leaf.data};
	  return copy;
	}

	var treeProto = octree.prototype = Octree.prototype;

	treeProto.copy = function() {
	  var copy = new Octree(this._x, this._y, this._z, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1),
	      node = this._root,
	      nodes,
	      child;

	  if (!node) return copy;

	  if (!node.length) return copy._root = leaf_copy(node), copy;

	  nodes = [{source: node, target: copy._root = new Array(8)}];
	  while (node = nodes.pop()) {
	    for (var i = 0; i < 8; ++i) {
	      if (child = node.source[i]) {
	        if (child.length) nodes.push({source: child, target: node.target[i] = new Array(8)});
	        else node.target[i] = leaf_copy(child);
	      }
	    }
	  }

	  return copy;
	};

	treeProto.add = tree_add;
	treeProto.addAll = addAll;
	treeProto.cover = tree_cover;
	treeProto.data = tree_data;
	treeProto.extent = tree_extent;
	treeProto.find = tree_find;
	treeProto.remove = tree_remove;
	treeProto.removeAll = removeAll;
	treeProto.root = tree_root;
	treeProto.size = tree_size;
	treeProto.visit = tree_visit;
	treeProto.visitAfter = tree_visitAfter;
	treeProto.x = tree_x;
	treeProto.y = tree_y;
	treeProto.z = tree_z;

	exports.octree = octree;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-collection/ Version 1.0.3. Copyright 2017 Mike Bostock.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var prefix = "$";

	function Map() {}

	Map.prototype = map.prototype = {
	  constructor: Map,
	  has: function(key) {
	    return (prefix + key) in this;
	  },
	  get: function(key) {
	    return this[prefix + key];
	  },
	  set: function(key, value) {
	    this[prefix + key] = value;
	    return this;
	  },
	  remove: function(key) {
	    var property = prefix + key;
	    return property in this && delete this[property];
	  },
	  clear: function() {
	    for (var property in this) if (property[0] === prefix) delete this[property];
	  },
	  keys: function() {
	    var keys = [];
	    for (var property in this) if (property[0] === prefix) keys.push(property.slice(1));
	    return keys;
	  },
	  values: function() {
	    var values = [];
	    for (var property in this) if (property[0] === prefix) values.push(this[property]);
	    return values;
	  },
	  entries: function() {
	    var entries = [];
	    for (var property in this) if (property[0] === prefix) entries.push({key: property.slice(1), value: this[property]});
	    return entries;
	  },
	  size: function() {
	    var size = 0;
	    for (var property in this) if (property[0] === prefix) ++size;
	    return size;
	  },
	  empty: function() {
	    for (var property in this) if (property[0] === prefix) return false;
	    return true;
	  },
	  each: function(f) {
	    for (var property in this) if (property[0] === prefix) f(this[property], property.slice(1), this);
	  }
	};

	function map(object, f) {
	  var map = new Map;

	  // Copy constructor.
	  if (object instanceof Map) object.each(function(value, key) { map.set(key, value); });

	  // Index array by numeric index or specified key function.
	  else if (Array.isArray(object)) {
	    var i = -1,
	        n = object.length,
	        o;

	    if (f == null) while (++i < n) map.set(i, object[i]);
	    else while (++i < n) map.set(f(o = object[i], i, object), o);
	  }

	  // Convert object to map.
	  else if (object) for (var key in object) map.set(key, object[key]);

	  return map;
	}

	var nest = function() {
	  var keys = [],
	      sortKeys = [],
	      sortValues,
	      rollup,
	      nest;

	  function apply(array, depth, createResult, setResult) {
	    if (depth >= keys.length) return rollup != null
	        ? rollup(array) : (sortValues != null
	        ? array.sort(sortValues)
	        : array);

	    var i = -1,
	        n = array.length,
	        key = keys[depth++],
	        keyValue,
	        value,
	        valuesByKey = map(),
	        values,
	        result = createResult();

	    while (++i < n) {
	      if (values = valuesByKey.get(keyValue = key(value = array[i]) + "")) {
	        values.push(value);
	      } else {
	        valuesByKey.set(keyValue, [value]);
	      }
	    }

	    valuesByKey.each(function(values, key) {
	      setResult(result, key, apply(values, depth, createResult, setResult));
	    });

	    return result;
	  }

	  function entries(map$$1, depth) {
	    if (++depth > keys.length) return map$$1;
	    var array, sortKey = sortKeys[depth - 1];
	    if (rollup != null && depth >= keys.length) array = map$$1.entries();
	    else array = [], map$$1.each(function(v, k) { array.push({key: k, values: entries(v, depth)}); });
	    return sortKey != null ? array.sort(function(a, b) { return sortKey(a.key, b.key); }) : array;
	  }

	  return nest = {
	    object: function(array) { return apply(array, 0, createObject, setObject); },
	    map: function(array) { return apply(array, 0, createMap, setMap); },
	    entries: function(array) { return entries(apply(array, 0, createMap, setMap), 0); },
	    key: function(d) { keys.push(d); return nest; },
	    sortKeys: function(order) { sortKeys[keys.length - 1] = order; return nest; },
	    sortValues: function(order) { sortValues = order; return nest; },
	    rollup: function(f) { rollup = f; return nest; }
	  };
	};

	function createObject() {
	  return {};
	}

	function setObject(object, key, value) {
	  object[key] = value;
	}

	function createMap() {
	  return map();
	}

	function setMap(map$$1, key, value) {
	  map$$1.set(key, value);
	}

	function Set() {}

	var proto = map.prototype;

	Set.prototype = set.prototype = {
	  constructor: Set,
	  has: proto.has,
	  add: function(value) {
	    value += "";
	    this[prefix + value] = value;
	    return this;
	  },
	  remove: proto.remove,
	  clear: proto.clear,
	  values: proto.keys,
	  size: proto.size,
	  empty: proto.empty,
	  each: proto.each
	};

	function set(object, f) {
	  var set = new Set;

	  // Copy constructor.
	  if (object instanceof Set) object.each(function(value) { set.add(value); });

	  // Otherwise, assume it’s an array.
	  else if (object) {
	    var i = -1, n = object.length;
	    if (f == null) while (++i < n) set.add(object[i]);
	    else while (++i < n) set.add(f(object[i], i, object));
	  }

	  return set;
	}

	var keys = function(map) {
	  var keys = [];
	  for (var key in map) keys.push(key);
	  return keys;
	};

	var values = function(map) {
	  var values = [];
	  for (var key in map) values.push(map[key]);
	  return values;
	};

	var entries = function(map) {
	  var entries = [];
	  for (var key in map) entries.push({key: key, value: map[key]});
	  return entries;
	};

	exports.nest = nest;
	exports.set = set;
	exports.map = map;
	exports.keys = keys;
	exports.values = values;
	exports.entries = entries;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-dispatch/ Version 1.0.3. Copyright 2017 Mike Bostock.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var noop = {value: function() {}};

	function dispatch() {
	  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
	    if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
	    _[t] = [];
	  }
	  return new Dispatch(_);
	}

	function Dispatch(_) {
	  this._ = _;
	}

	function parseTypenames(typenames, types) {
	  return typenames.trim().split(/^|\s+/).map(function(t) {
	    var name = "", i = t.indexOf(".");
	    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
	    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
	    return {type: t, name: name};
	  });
	}

	Dispatch.prototype = dispatch.prototype = {
	  constructor: Dispatch,
	  on: function(typename, callback) {
	    var _ = this._,
	        T = parseTypenames(typename + "", _),
	        t,
	        i = -1,
	        n = T.length;

	    // If no callback was specified, return the callback of the given type and name.
	    if (arguments.length < 2) {
	      while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
	      return;
	    }

	    // If a type was specified, set the callback for the given type and name.
	    // Otherwise, if a null callback was specified, remove callbacks of the given name.
	    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
	    while (++i < n) {
	      if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
	      else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
	    }

	    return this;
	  },
	  copy: function() {
	    var copy = {}, _ = this._;
	    for (var t in _) copy[t] = _[t].slice();
	    return new Dispatch(copy);
	  },
	  call: function(type, that) {
	    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
	    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
	    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
	  },
	  apply: function(type, that, args) {
	    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
	    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
	  }
	};

	function get(type, name) {
	  for (var i = 0, n = type.length, c; i < n; ++i) {
	    if ((c = type[i]).name === name) {
	      return c.value;
	    }
	  }
	}

	function set(type, name, callback) {
	  for (var i = 0, n = type.length; i < n; ++i) {
	    if (type[i].name === name) {
	      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
	      break;
	    }
	  }
	  if (callback != null) type.push({name: name, value: callback});
	  return type;
	}

	exports.dispatch = dispatch;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-timer/ Version 1.0.5. Copyright 2017 Mike Bostock.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var frame = 0;
	var timeout = 0;
	var interval = 0;
	var pokeDelay = 1000;
	var taskHead;
	var taskTail;
	var clockLast = 0;
	var clockNow = 0;
	var clockSkew = 0;
	var clock = typeof performance === "object" && performance.now ? performance : Date;
	var setFrame = typeof requestAnimationFrame === "function" ? requestAnimationFrame : function(f) { setTimeout(f, 17); };

	function now() {
	  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
	}

	function clearNow() {
	  clockNow = 0;
	}

	function Timer() {
	  this._call =
	  this._time =
	  this._next = null;
	}

	Timer.prototype = timer.prototype = {
	  constructor: Timer,
	  restart: function(callback, delay, time) {
	    if (typeof callback !== "function") throw new TypeError("callback is not a function");
	    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
	    if (!this._next && taskTail !== this) {
	      if (taskTail) taskTail._next = this;
	      else taskHead = this;
	      taskTail = this;
	    }
	    this._call = callback;
	    this._time = time;
	    sleep();
	  },
	  stop: function() {
	    if (this._call) {
	      this._call = null;
	      this._time = Infinity;
	      sleep();
	    }
	  }
	};

	function timer(callback, delay, time) {
	  var t = new Timer;
	  t.restart(callback, delay, time);
	  return t;
	}

	function timerFlush() {
	  now(); // Get the current time, if not already set.
	  ++frame; // Pretend we’ve set an alarm, if we haven’t already.
	  var t = taskHead, e;
	  while (t) {
	    if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
	    t = t._next;
	  }
	  --frame;
	}

	function wake() {
	  clockNow = (clockLast = clock.now()) + clockSkew;
	  frame = timeout = 0;
	  try {
	    timerFlush();
	  } finally {
	    frame = 0;
	    nap();
	    clockNow = 0;
	  }
	}

	function poke() {
	  var now = clock.now(), delay = now - clockLast;
	  if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
	}

	function nap() {
	  var t0, t1 = taskHead, t2, time = Infinity;
	  while (t1) {
	    if (t1._call) {
	      if (time > t1._time) time = t1._time;
	      t0 = t1, t1 = t1._next;
	    } else {
	      t2 = t1._next, t1._next = null;
	      t1 = t0 ? t0._next = t2 : taskHead = t2;
	    }
	  }
	  taskTail = t0;
	  sleep(time);
	}

	function sleep(time) {
	  if (frame) return; // Soonest alarm already set, or will be.
	  if (timeout) timeout = clearTimeout(timeout);
	  var delay = time - clockNow;
	  if (delay > 24) {
	    if (time < Infinity) timeout = setTimeout(wake, delay);
	    if (interval) interval = clearInterval(interval);
	  } else {
	    if (!interval) clockLast = clockNow, interval = setInterval(poke, pokeDelay);
	    frame = 1, setFrame(wake);
	  }
	}

	var timeout$1 = function(callback, delay, time) {
	  var t = new Timer;
	  delay = delay == null ? 0 : +delay;
	  t.restart(function(elapsed) {
	    t.stop();
	    callback(elapsed + delay);
	  }, delay, time);
	  return t;
	};

	var interval$1 = function(callback, delay, time) {
	  var t = new Timer, total = delay;
	  if (delay == null) return t.restart(callback, delay, time), t;
	  delay = +delay, time = time == null ? now() : +time;
	  t.restart(function tick(elapsed) {
	    elapsed += total;
	    t.restart(tick, total += delay, time);
	    callback(elapsed);
	  }, delay, time);
	  return t;
	};

	exports.now = now;
	exports.timer = timer;
	exports.timerFlush = timerFlush;
	exports.timeout = timeout$1;
	exports.interval = interval$1;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * @fileOverview Contains definition of the core graph object.
	 */

	/**
	 * @example
	 *  var graph = require('ngraph.graph')();
	 *  graph.addNode(1);     // graph has one node.
	 *  graph.addLink(2, 3);  // now graph contains three nodes and one link.
	 *
	 */
	module.exports = createGraph;

	var eventify = __webpack_require__(9);

	/**
	 * Creates a new graph
	 */
	function createGraph(options) {
	  // Graph structure is maintained as dictionary of nodes
	  // and array of links. Each node has 'links' property which
	  // hold all links related to that node. And general links
	  // array is used to speed up all links enumeration. This is inefficient
	  // in terms of memory, but simplifies coding.
	  options = options || {};
	  if (options.uniqueLinkId === undefined) {
	    // Request each link id to be unique between same nodes. This negatively
	    // impacts `addLink()` performance (O(n), where n - number of edges of each
	    // vertex), but makes operations with multigraphs more accessible.
	    options.uniqueLinkId = true;
	  }

	  var nodes = typeof Object.create === 'function' ? Object.create(null) : {},
	    links = [],
	    // Hash of multi-edges. Used to track ids of edges between same nodes
	    multiEdges = {},
	    nodesCount = 0,
	    suspendEvents = 0,

	    forEachNode = createNodeIterator(),
	    createLink = options.uniqueLinkId ? createUniqueLink : createSingleLink,

	    // Our graph API provides means to listen to graph changes. Users can subscribe
	    // to be notified about changes in the graph by using `on` method. However
	    // in some cases they don't use it. To avoid unnecessary memory consumption
	    // we will not record graph changes until we have at least one subscriber.
	    // Code below supports this optimization.
	    //
	    // Accumulates all changes made during graph updates.
	    // Each change element contains:
	    //  changeType - one of the strings: 'add', 'remove' or 'update';
	    //  node - if change is related to node this property is set to changed graph's node;
	    //  link - if change is related to link this property is set to changed graph's link;
	    changes = [],
	    recordLinkChange = noop,
	    recordNodeChange = noop,
	    enterModification = noop,
	    exitModification = noop;

	  // this is our public API:
	  var graphPart = {
	    /**
	     * Adds node to the graph. If node with given id already exists in the graph
	     * its data is extended with whatever comes in 'data' argument.
	     *
	     * @param nodeId the node's identifier. A string or number is preferred.
	     * @param [data] additional data for the node being added. If node already
	     *   exists its data object is augmented with the new one.
	     *
	     * @return {node} The newly added node or node with given id if it already exists.
	     */
	    addNode: addNode,

	    /**
	     * Adds a link to the graph. The function always create a new
	     * link between two nodes. If one of the nodes does not exists
	     * a new node is created.
	     *
	     * @param fromId link start node id;
	     * @param toId link end node id;
	     * @param [data] additional data to be set on the new link;
	     *
	     * @return {link} The newly created link
	     */
	    addLink: addLink,

	    /**
	     * Removes link from the graph. If link does not exist does nothing.
	     *
	     * @param link - object returned by addLink() or getLinks() methods.
	     *
	     * @returns true if link was removed; false otherwise.
	     */
	    removeLink: removeLink,

	    /**
	     * Removes node with given id from the graph. If node does not exist in the graph
	     * does nothing.
	     *
	     * @param nodeId node's identifier passed to addNode() function.
	     *
	     * @returns true if node was removed; false otherwise.
	     */
	    removeNode: removeNode,

	    /**
	     * Gets node with given identifier. If node does not exist undefined value is returned.
	     *
	     * @param nodeId requested node identifier;
	     *
	     * @return {node} in with requested identifier or undefined if no such node exists.
	     */
	    getNode: getNode,

	    /**
	     * Gets number of nodes in this graph.
	     *
	     * @return number of nodes in the graph.
	     */
	    getNodesCount: function() {
	      return nodesCount;
	    },

	    /**
	     * Gets total number of links in the graph.
	     */
	    getLinksCount: function() {
	      return links.length;
	    },

	    /**
	     * Gets all links (inbound and outbound) from the node with given id.
	     * If node with given id is not found null is returned.
	     *
	     * @param nodeId requested node identifier.
	     *
	     * @return Array of links from and to requested node if such node exists;
	     *   otherwise null is returned.
	     */
	    getLinks: getLinks,

	    /**
	     * Invokes callback on each node of the graph.
	     *
	     * @param {Function(node)} callback Function to be invoked. The function
	     *   is passed one argument: visited node.
	     */
	    forEachNode: forEachNode,

	    /**
	     * Invokes callback on every linked (adjacent) node to the given one.
	     *
	     * @param nodeId Identifier of the requested node.
	     * @param {Function(node, link)} callback Function to be called on all linked nodes.
	     *   The function is passed two parameters: adjacent node and link object itself.
	     * @param oriented if true graph treated as oriented.
	     */
	    forEachLinkedNode: forEachLinkedNode,

	    /**
	     * Enumerates all links in the graph
	     *
	     * @param {Function(link)} callback Function to be called on all links in the graph.
	     *   The function is passed one parameter: graph's link object.
	     *
	     * Link object contains at least the following fields:
	     *  fromId - node id where link starts;
	     *  toId - node id where link ends,
	     *  data - additional data passed to graph.addLink() method.
	     */
	    forEachLink: forEachLink,

	    /**
	     * Suspend all notifications about graph changes until
	     * endUpdate is called.
	     */
	    beginUpdate: enterModification,

	    /**
	     * Resumes all notifications about graph changes and fires
	     * graph 'changed' event in case there are any pending changes.
	     */
	    endUpdate: exitModification,

	    /**
	     * Removes all nodes and links from the graph.
	     */
	    clear: clear,

	    /**
	     * Detects whether there is a link between two nodes.
	     * Operation complexity is O(n) where n - number of links of a node.
	     * NOTE: this function is synonim for getLink()
	     *
	     * @returns link if there is one. null otherwise.
	     */
	    hasLink: getLink,

	    /**
	     * Gets an edge between two nodes.
	     * Operation complexity is O(n) where n - number of links of a node.
	     *
	     * @param {string} fromId link start identifier
	     * @param {string} toId link end identifier
	     *
	     * @returns link if there is one. null otherwise.
	     */
	    getLink: getLink
	  };

	  // this will add `on()` and `fire()` methods.
	  eventify(graphPart);

	  monitorSubscribers();

	  return graphPart;

	  function monitorSubscribers() {
	    var realOn = graphPart.on;

	    // replace real `on` with our temporary on, which will trigger change
	    // modification monitoring:
	    graphPart.on = on;

	    function on() {
	      // now it's time to start tracking stuff:
	      graphPart.beginUpdate = enterModification = enterModificationReal;
	      graphPart.endUpdate = exitModification = exitModificationReal;
	      recordLinkChange = recordLinkChangeReal;
	      recordNodeChange = recordNodeChangeReal;

	      // this will replace current `on` method with real pub/sub from `eventify`.
	      graphPart.on = realOn;
	      // delegate to real `on` handler:
	      return realOn.apply(graphPart, arguments);
	    }
	  }

	  function recordLinkChangeReal(link, changeType) {
	    changes.push({
	      link: link,
	      changeType: changeType
	    });
	  }

	  function recordNodeChangeReal(node, changeType) {
	    changes.push({
	      node: node,
	      changeType: changeType
	    });
	  }

	  function addNode(nodeId, data) {
	    if (nodeId === undefined) {
	      throw new Error('Invalid node identifier');
	    }

	    enterModification();

	    var node = getNode(nodeId);
	    if (!node) {
	      node = new Node(nodeId);
	      nodesCount++;
	      recordNodeChange(node, 'add');
	    } else {
	      recordNodeChange(node, 'update');
	    }

	    node.data = data;

	    nodes[nodeId] = node;

	    exitModification();
	    return node;
	  }

	  function getNode(nodeId) {
	    return nodes[nodeId];
	  }

	  function removeNode(nodeId) {
	    var node = getNode(nodeId);
	    if (!node) {
	      return false;
	    }

	    enterModification();

	    if (node.links) {
	      while (node.links.length) {
	        var link = node.links[0];
	        removeLink(link);
	      }
	    }

	    delete nodes[nodeId];
	    nodesCount--;

	    recordNodeChange(node, 'remove');

	    exitModification();

	    return true;
	  }


	  function addLink(fromId, toId, data) {
	    enterModification();

	    var fromNode = getNode(fromId) || addNode(fromId);
	    var toNode = getNode(toId) || addNode(toId);

	    var link = createLink(fromId, toId, data);

	    links.push(link);

	    // TODO: this is not cool. On large graphs potentially would consume more memory.
	    addLinkToNode(fromNode, link);
	    if (fromId !== toId) {
	      // make sure we are not duplicating links for self-loops
	      addLinkToNode(toNode, link);
	    }

	    recordLinkChange(link, 'add');

	    exitModification();

	    return link;
	  }

	  function createSingleLink(fromId, toId, data) {
	    var linkId = makeLinkId(fromId, toId);
	    return new Link(fromId, toId, data, linkId);
	  }

	  function createUniqueLink(fromId, toId, data) {
	    // TODO: Get rid of this method.
	    var linkId = makeLinkId(fromId, toId);
	    var isMultiEdge = multiEdges.hasOwnProperty(linkId);
	    if (isMultiEdge || getLink(fromId, toId)) {
	      if (!isMultiEdge) {
	        multiEdges[linkId] = 0;
	      }
	      var suffix = '@' + (++multiEdges[linkId]);
	      linkId = makeLinkId(fromId + suffix, toId + suffix);
	    }

	    return new Link(fromId, toId, data, linkId);
	  }

	  function getLinks(nodeId) {
	    var node = getNode(nodeId);
	    return node ? node.links : null;
	  }

	  function removeLink(link) {
	    if (!link) {
	      return false;
	    }
	    var idx = indexOfElementInArray(link, links);
	    if (idx < 0) {
	      return false;
	    }

	    enterModification();

	    links.splice(idx, 1);

	    var fromNode = getNode(link.fromId);
	    var toNode = getNode(link.toId);

	    if (fromNode) {
	      idx = indexOfElementInArray(link, fromNode.links);
	      if (idx >= 0) {
	        fromNode.links.splice(idx, 1);
	      }
	    }

	    if (toNode) {
	      idx = indexOfElementInArray(link, toNode.links);
	      if (idx >= 0) {
	        toNode.links.splice(idx, 1);
	      }
	    }

	    recordLinkChange(link, 'remove');

	    exitModification();

	    return true;
	  }

	  function getLink(fromNodeId, toNodeId) {
	    // TODO: Use sorted links to speed this up
	    var node = getNode(fromNodeId),
	      i;
	    if (!node || !node.links) {
	      return null;
	    }

	    for (i = 0; i < node.links.length; ++i) {
	      var link = node.links[i];
	      if (link.fromId === fromNodeId && link.toId === toNodeId) {
	        return link;
	      }
	    }

	    return null; // no link.
	  }

	  function clear() {
	    enterModification();
	    forEachNode(function(node) {
	      removeNode(node.id);
	    });
	    exitModification();
	  }

	  function forEachLink(callback) {
	    var i, length;
	    if (typeof callback === 'function') {
	      for (i = 0, length = links.length; i < length; ++i) {
	        callback(links[i]);
	      }
	    }
	  }

	  function forEachLinkedNode(nodeId, callback, oriented) {
	    var node = getNode(nodeId);

	    if (node && node.links && typeof callback === 'function') {
	      if (oriented) {
	        return forEachOrientedLink(node.links, nodeId, callback);
	      } else {
	        return forEachNonOrientedLink(node.links, nodeId, callback);
	      }
	    }
	  }

	  function forEachNonOrientedLink(links, nodeId, callback) {
	    var quitFast;
	    for (var i = 0; i < links.length; ++i) {
	      var link = links[i];
	      var linkedNodeId = link.fromId === nodeId ? link.toId : link.fromId;

	      quitFast = callback(nodes[linkedNodeId], link);
	      if (quitFast) {
	        return true; // Client does not need more iterations. Break now.
	      }
	    }
	  }

	  function forEachOrientedLink(links, nodeId, callback) {
	    var quitFast;
	    for (var i = 0; i < links.length; ++i) {
	      var link = links[i];
	      if (link.fromId === nodeId) {
	        quitFast = callback(nodes[link.toId], link);
	        if (quitFast) {
	          return true; // Client does not need more iterations. Break now.
	        }
	      }
	    }
	  }

	  // we will not fire anything until users of this library explicitly call `on()`
	  // method.
	  function noop() {}

	  // Enter, Exit modification allows bulk graph updates without firing events.
	  function enterModificationReal() {
	    suspendEvents += 1;
	  }

	  function exitModificationReal() {
	    suspendEvents -= 1;
	    if (suspendEvents === 0 && changes.length > 0) {
	      graphPart.fire('changed', changes);
	      changes.length = 0;
	    }
	  }

	  function createNodeIterator() {
	    // Object.keys iterator is 1.3x faster than `for in` loop.
	    // See `https://github.com/anvaka/ngraph.graph/tree/bench-for-in-vs-obj-keys`
	    // branch for perf test
	    return Object.keys ? objectKeysIterator : forInIterator;
	  }

	  function objectKeysIterator(callback) {
	    if (typeof callback !== 'function') {
	      return;
	    }

	    var keys = Object.keys(nodes);
	    for (var i = 0; i < keys.length; ++i) {
	      if (callback(nodes[keys[i]])) {
	        return true; // client doesn't want to proceed. Return.
	      }
	    }
	  }

	  function forInIterator(callback) {
	    if (typeof callback !== 'function') {
	      return;
	    }
	    var node;

	    for (node in nodes) {
	      if (callback(nodes[node])) {
	        return true; // client doesn't want to proceed. Return.
	      }
	    }
	  }
	}

	// need this for old browsers. Should this be a separate module?
	function indexOfElementInArray(element, array) {
	  if (!array) return -1;

	  if (array.indexOf) {
	    return array.indexOf(element);
	  }

	  var len = array.length,
	    i;

	  for (i = 0; i < len; i += 1) {
	    if (array[i] === element) {
	      return i;
	    }
	  }

	  return -1;
	}

	/**
	 * Internal structure to represent node;
	 */
	function Node(id) {
	  this.id = id;
	  this.links = null;
	  this.data = null;
	}

	function addLinkToNode(node, link) {
	  if (node.links) {
	    node.links.push(link);
	  } else {
	    node.links = [link];
	  }
	}

	/**
	 * Internal structure to represent links;
	 */
	function Link(fromId, toId, data, id) {
	  this.fromId = fromId;
	  this.toId = toId;
	  this.data = data;
	  this.id = id;
	}

	function hashCode(str) {
	  var hash = 0, i, chr, len;
	  if (str.length == 0) return hash;
	  for (i = 0, len = str.length; i < len; i++) {
	    chr   = str.charCodeAt(i);
	    hash  = ((hash << 5) - hash) + chr;
	    hash |= 0; // Convert to 32bit integer
	  }
	  return hash;
	}

	function makeLinkId(fromId, toId) {
	  return hashCode(fromId.toString() + '👉 ' + toId.toString());
	}


/***/ }),
/* 9 */
/***/ (function(module, exports) {

	module.exports = function(subject) {
	  validateSubject(subject);

	  var eventsStorage = createEventsStorage(subject);
	  subject.on = eventsStorage.on;
	  subject.off = eventsStorage.off;
	  subject.fire = eventsStorage.fire;
	  return subject;
	};

	function createEventsStorage(subject) {
	  // Store all event listeners to this hash. Key is event name, value is array
	  // of callback records.
	  //
	  // A callback record consists of callback function and its optional context:
	  // { 'eventName' => [{callback: function, ctx: object}] }
	  var registeredEvents = Object.create(null);

	  return {
	    on: function (eventName, callback, ctx) {
	      if (typeof callback !== 'function') {
	        throw new Error('callback is expected to be a function');
	      }
	      var handlers = registeredEvents[eventName];
	      if (!handlers) {
	        handlers = registeredEvents[eventName] = [];
	      }
	      handlers.push({callback: callback, ctx: ctx});

	      return subject;
	    },

	    off: function (eventName, callback) {
	      var wantToRemoveAll = (typeof eventName === 'undefined');
	      if (wantToRemoveAll) {
	        // Killing old events storage should be enough in this case:
	        registeredEvents = Object.create(null);
	        return subject;
	      }

	      if (registeredEvents[eventName]) {
	        var deleteAllCallbacksForEvent = (typeof callback !== 'function');
	        if (deleteAllCallbacksForEvent) {
	          delete registeredEvents[eventName];
	        } else {
	          var callbacks = registeredEvents[eventName];
	          for (var i = 0; i < callbacks.length; ++i) {
	            if (callbacks[i].callback === callback) {
	              callbacks.splice(i, 1);
	            }
	          }
	        }
	      }

	      return subject;
	    },

	    fire: function (eventName) {
	      var callbacks = registeredEvents[eventName];
	      if (!callbacks) {
	        return subject;
	      }

	      var fireArguments;
	      if (arguments.length > 1) {
	        fireArguments = Array.prototype.splice.call(arguments, 1);
	      }
	      for(var i = 0; i < callbacks.length; ++i) {
	        var callbackInfo = callbacks[i];
	        callbackInfo.callback.apply(callbackInfo.ctx, fireArguments);
	      }

	      return subject;
	    }
	  };
	}

	function validateSubject(subject) {
	  if (!subject) {
	    throw new Error('Eventify cannot use falsy object as events subject');
	  }
	  var reservedWords = ['on', 'fire', 'off'];
	  for (var i = 0; i < reservedWords.length; ++i) {
	    if (subject.hasOwnProperty(reservedWords[i])) {
	      throw new Error("Subject cannot be eventified, since it already has property '" + reservedWords[i] + "'");
	    }
	  }
	}


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = createLayout;
	module.exports.simulator = __webpack_require__(11);

	var eventify = __webpack_require__(15);

	/**
	 * Creates force based layout for a given graph.
	 *
	 * @param {ngraph.graph} graph which needs to be laid out
	 * @param {object} physicsSettings if you need custom settings
	 * for physics simulator you can pass your own settings here. If it's not passed
	 * a default one will be created.
	 */
	function createLayout(graph, physicsSettings) {
	  if (!graph) {
	    throw new Error('Graph structure cannot be undefined');
	  }

	  var createSimulator = __webpack_require__(11);
	  var physicsSimulator = createSimulator(physicsSettings);

	  var nodeBodies = Object.create(null);
	  var springs = {};
	  var bodiesCount = 0;

	  var springTransform = physicsSimulator.settings.springTransform || noop;

	  // Initialize physics with what we have in the graph:
	  initPhysics();
	  listenToEvents();

	  var wasStable = false;

	  var api = {
	    /**
	     * Performs one step of iterative layout algorithm
	     *
	     * @returns {boolean} true if the system should be considered stable; Flase otherwise.
	     * The system is stable if no further call to `step()` can improve the layout.
	     */
	    step: function() {
	      if (bodiesCount === 0) return true; // TODO: This will never fire 'stable'

	      var lastMove = physicsSimulator.step();

	      // Save the movement in case if someone wants to query it in the step
	      // callback.
	      api.lastMove = lastMove;

	      // Allow listeners to perform low-level actions after nodes are updated.
	      api.fire('step');

	      var ratio = lastMove/bodiesCount;
	      var isStableNow = ratio <= 0.01; // TODO: The number is somewhat arbitrary...

	      if (wasStable !== isStableNow) {
	        wasStable = isStableNow;
	        onStableChanged(isStableNow);
	      }

	      return isStableNow;
	    },

	    /**
	     * For a given `nodeId` returns position
	     */
	    getNodePosition: function (nodeId) {
	      return getInitializedBody(nodeId).pos;
	    },

	    /**
	     * Sets position of a node to a given coordinates
	     * @param {string} nodeId node identifier
	     * @param {number} x position of a node
	     * @param {number} y position of a node
	     * @param {number=} z position of node (only if applicable to body)
	     */
	    setNodePosition: function (nodeId) {
	      var body = getInitializedBody(nodeId);
	      body.setPosition.apply(body, Array.prototype.slice.call(arguments, 1));
	    },

	    /**
	     * @returns {Object} Link position by link id
	     * @returns {Object.from} {x, y} coordinates of link start
	     * @returns {Object.to} {x, y} coordinates of link end
	     */
	    getLinkPosition: function (linkId) {
	      var spring = springs[linkId];
	      if (spring) {
	        return {
	          from: spring.from.pos,
	          to: spring.to.pos
	        };
	      }
	    },

	    /**
	     * @returns {Object} area required to fit in the graph. Object contains
	     * `x1`, `y1` - top left coordinates
	     * `x2`, `y2` - bottom right coordinates
	     */
	    getGraphRect: function () {
	      return physicsSimulator.getBBox();
	    },

	    /**
	     * Iterates over each body in the layout simulator and performs a callback(body, nodeId)
	     */
	    forEachBody: forEachBody,

	    /*
	     * Requests layout algorithm to pin/unpin node to its current position
	     * Pinned nodes should not be affected by layout algorithm and always
	     * remain at their position
	     */
	    pinNode: function (node, isPinned) {
	      var body = getInitializedBody(node.id);
	       body.isPinned = !!isPinned;
	    },

	    /**
	     * Checks whether given graph's node is currently pinned
	     */
	    isNodePinned: function (node) {
	      return getInitializedBody(node.id).isPinned;
	    },

	    /**
	     * Request to release all resources
	     */
	    dispose: function() {
	      graph.off('changed', onGraphChanged);
	      api.fire('disposed');
	    },

	    /**
	     * Gets physical body for a given node id. If node is not found undefined
	     * value is returned.
	     */
	    getBody: getBody,

	    /**
	     * Gets spring for a given edge.
	     *
	     * @param {string} linkId link identifer. If two arguments are passed then
	     * this argument is treated as formNodeId
	     * @param {string=} toId when defined this parameter denotes head of the link
	     * and first argument is trated as tail of the link (fromId)
	     */
	    getSpring: getSpring,

	    /**
	     * [Read only] Gets current physics simulator
	     */
	    simulator: physicsSimulator,

	    /**
	     * Gets the graph that was used for layout
	     */
	    graph: graph,

	    /**
	     * Gets amount of movement performed during last step opeartion
	     */
	    lastMove: 0
	  };

	  eventify(api);

	  return api;

	  function forEachBody(cb) {
	    Object.keys(nodeBodies).forEach(function(bodyId) {
	      cb(nodeBodies[bodyId], bodyId);
	    });
	  }

	  function getSpring(fromId, toId) {
	    var linkId;
	    if (toId === undefined) {
	      if (typeof fromId !== 'object') {
	        // assume fromId as a linkId:
	        linkId = fromId;
	      } else {
	        // assume fromId to be a link object:
	        linkId = fromId.id;
	      }
	    } else {
	      // toId is defined, should grab link:
	      var link = graph.hasLink(fromId, toId);
	      if (!link) return;
	      linkId = link.id;
	    }

	    return springs[linkId];
	  }

	  function getBody(nodeId) {
	    return nodeBodies[nodeId];
	  }

	  function listenToEvents() {
	    graph.on('changed', onGraphChanged);
	  }

	  function onStableChanged(isStable) {
	    api.fire('stable', isStable);
	  }

	  function onGraphChanged(changes) {
	    for (var i = 0; i < changes.length; ++i) {
	      var change = changes[i];
	      if (change.changeType === 'add') {
	        if (change.node) {
	          initBody(change.node.id);
	        }
	        if (change.link) {
	          initLink(change.link);
	        }
	      } else if (change.changeType === 'remove') {
	        if (change.node) {
	          releaseNode(change.node);
	        }
	        if (change.link) {
	          releaseLink(change.link);
	        }
	      }
	    }
	    bodiesCount = graph.getNodesCount();
	  }

	  function initPhysics() {
	    bodiesCount = 0;

	    graph.forEachNode(function (node) {
	      initBody(node.id);
	      bodiesCount += 1;
	    });

	    graph.forEachLink(initLink);
	  }

	  function initBody(nodeId) {
	    var body = nodeBodies[nodeId];
	    if (!body) {
	      var node = graph.getNode(nodeId);
	      if (!node) {
	        throw new Error('initBody() was called with unknown node id');
	      }

	      var pos = node.position;
	      if (!pos) {
	        var neighbors = getNeighborBodies(node);
	        pos = physicsSimulator.getBestNewBodyPosition(neighbors);
	      }

	      body = physicsSimulator.addBodyAt(pos);
	      body.id = nodeId;

	      nodeBodies[nodeId] = body;
	      updateBodyMass(nodeId);

	      if (isNodeOriginallyPinned(node)) {
	        body.isPinned = true;
	      }
	    }
	  }

	  function releaseNode(node) {
	    var nodeId = node.id;
	    var body = nodeBodies[nodeId];
	    if (body) {
	      nodeBodies[nodeId] = null;
	      delete nodeBodies[nodeId];

	      physicsSimulator.removeBody(body);
	    }
	  }

	  function initLink(link) {
	    updateBodyMass(link.fromId);
	    updateBodyMass(link.toId);

	    var fromBody = nodeBodies[link.fromId],
	        toBody  = nodeBodies[link.toId],
	        spring = physicsSimulator.addSpring(fromBody, toBody, link.length);

	    springTransform(link, spring);

	    springs[link.id] = spring;
	  }

	  function releaseLink(link) {
	    var spring = springs[link.id];
	    if (spring) {
	      var from = graph.getNode(link.fromId),
	          to = graph.getNode(link.toId);

	      if (from) updateBodyMass(from.id);
	      if (to) updateBodyMass(to.id);

	      delete springs[link.id];

	      physicsSimulator.removeSpring(spring);
	    }
	  }

	  function getNeighborBodies(node) {
	    // TODO: Could probably be done better on memory
	    var neighbors = [];
	    if (!node.links) {
	      return neighbors;
	    }
	    var maxNeighbors = Math.min(node.links.length, 2);
	    for (var i = 0; i < maxNeighbors; ++i) {
	      var link = node.links[i];
	      var otherBody = link.fromId !== node.id ? nodeBodies[link.fromId] : nodeBodies[link.toId];
	      if (otherBody && otherBody.pos) {
	        neighbors.push(otherBody);
	      }
	    }

	    return neighbors;
	  }

	  function updateBodyMass(nodeId) {
	    var body = nodeBodies[nodeId];
	    body.mass = nodeMass(nodeId);
	  }

	  /**
	   * Checks whether graph node has in its settings pinned attribute,
	   * which means layout algorithm cannot move it. Node can be preconfigured
	   * as pinned, if it has "isPinned" attribute, or when node.data has it.
	   *
	   * @param {Object} node a graph node to check
	   * @return {Boolean} true if node should be treated as pinned; false otherwise.
	   */
	  function isNodeOriginallyPinned(node) {
	    return (node && (node.isPinned || (node.data && node.data.isPinned)));
	  }

	  function getInitializedBody(nodeId) {
	    var body = nodeBodies[nodeId];
	    if (!body) {
	      initBody(nodeId);
	      body = nodeBodies[nodeId];
	    }
	    return body;
	  }

	  /**
	   * Calculates mass of a body, which corresponds to node with given id.
	   *
	   * @param {String|Number} nodeId identifier of a node, for which body mass needs to be calculated
	   * @returns {Number} recommended mass of the body;
	   */
	  function nodeMass(nodeId) {
	    var links = graph.getLinks(nodeId);
	    if (!links) return 1;
	    return 1 + links.length / 3.0;
	  }
	}

	function noop() { }


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Manages a simulation of physical forces acting on bodies and springs.
	 */
	module.exports = physicsSimulator;

	function physicsSimulator(settings) {
	  var Spring = __webpack_require__(12);
	  var expose = __webpack_require__(13);
	  var merge = __webpack_require__(14);
	  var eventify = __webpack_require__(15);

	  settings = merge(settings, {
	      /**
	       * Ideal length for links (springs in physical model).
	       */
	      springLength: 30,

	      /**
	       * Hook's law coefficient. 1 - solid spring.
	       */
	      springCoeff: 0.0008,

	      /**
	       * Coulomb's law coefficient. It's used to repel nodes thus should be negative
	       * if you make it positive nodes start attract each other :).
	       */
	      gravity: -1.2,

	      /**
	       * Theta coefficient from Barnes Hut simulation. Ranged between (0, 1).
	       * The closer it's to 1 the more nodes algorithm will have to go through.
	       * Setting it to one makes Barnes Hut simulation no different from
	       * brute-force forces calculation (each node is considered).
	       */
	      theta: 0.8,

	      /**
	       * Drag force coefficient. Used to slow down system, thus should be less than 1.
	       * The closer it is to 0 the less tight system will be.
	       */
	      dragCoeff: 0.02,

	      /**
	       * Default time step (dt) for forces integration
	       */
	      timeStep : 20,
	  });

	  // We allow clients to override basic factory methods:
	  var createQuadTree = settings.createQuadTree || __webpack_require__(16);
	  var createBounds = settings.createBounds || __webpack_require__(21);
	  var createDragForce = settings.createDragForce || __webpack_require__(22);
	  var createSpringForce = settings.createSpringForce || __webpack_require__(23);
	  var integrate = settings.integrator || __webpack_require__(24);
	  var createBody = settings.createBody || __webpack_require__(25);

	  var bodies = [], // Bodies in this simulation.
	      springs = [], // Springs in this simulation.
	      quadTree =  createQuadTree(settings),
	      bounds = createBounds(bodies, settings),
	      springForce = createSpringForce(settings),
	      dragForce = createDragForce(settings);

	  var totalMovement = 0; // how much movement we made on last step

	  var publicApi = {
	    /**
	     * Array of bodies, registered with current simulator
	     *
	     * Note: To add new body, use addBody() method. This property is only
	     * exposed for testing/performance purposes.
	     */
	    bodies: bodies,

	    quadTree: quadTree,

	    /**
	     * Array of springs, registered with current simulator
	     *
	     * Note: To add new spring, use addSpring() method. This property is only
	     * exposed for testing/performance purposes.
	     */
	    springs: springs,

	    /**
	     * Returns settings with which current simulator was initialized
	     */
	    settings: settings,

	    /**
	     * Performs one step of force simulation.
	     *
	     * @returns {boolean} true if system is considered stable; False otherwise.
	     */
	    step: function () {
	      accumulateForces();

	      var movement = integrate(bodies, settings.timeStep);
	      bounds.update();

	      return movement;
	    },

	    /**
	     * Adds body to the system
	     *
	     * @param {ngraph.physics.primitives.Body} body physical body
	     *
	     * @returns {ngraph.physics.primitives.Body} added body
	     */
	    addBody: function (body) {
	      if (!body) {
	        throw new Error('Body is required');
	      }
	      bodies.push(body);

	      return body;
	    },

	    /**
	     * Adds body to the system at given position
	     *
	     * @param {Object} pos position of a body
	     *
	     * @returns {ngraph.physics.primitives.Body} added body
	     */
	    addBodyAt: function (pos) {
	      if (!pos) {
	        throw new Error('Body position is required');
	      }
	      var body = createBody(pos);
	      bodies.push(body);

	      return body;
	    },

	    /**
	     * Removes body from the system
	     *
	     * @param {ngraph.physics.primitives.Body} body to remove
	     *
	     * @returns {Boolean} true if body found and removed. falsy otherwise;
	     */
	    removeBody: function (body) {
	      if (!body) { return; }

	      var idx = bodies.indexOf(body);
	      if (idx < 0) { return; }

	      bodies.splice(idx, 1);
	      if (bodies.length === 0) {
	        bounds.reset();
	      }
	      return true;
	    },

	    /**
	     * Adds a spring to this simulation.
	     *
	     * @returns {Object} - a handle for a spring. If you want to later remove
	     * spring pass it to removeSpring() method.
	     */
	    addSpring: function (body1, body2, springLength, springWeight, springCoefficient) {
	      if (!body1 || !body2) {
	        throw new Error('Cannot add null spring to force simulator');
	      }

	      if (typeof springLength !== 'number') {
	        springLength = -1; // assume global configuration
	      }

	      var spring = new Spring(body1, body2, springLength, springCoefficient >= 0 ? springCoefficient : -1, springWeight);
	      springs.push(spring);

	      // TODO: could mark simulator as dirty.
	      return spring;
	    },

	    /**
	     * Returns amount of movement performed on last step() call
	     */
	    getTotalMovement: function () {
	      return totalMovement;
	    },

	    /**
	     * Removes spring from the system
	     *
	     * @param {Object} spring to remove. Spring is an object returned by addSpring
	     *
	     * @returns {Boolean} true if spring found and removed. falsy otherwise;
	     */
	    removeSpring: function (spring) {
	      if (!spring) { return; }
	      var idx = springs.indexOf(spring);
	      if (idx > -1) {
	        springs.splice(idx, 1);
	        return true;
	      }
	    },

	    getBestNewBodyPosition: function (neighbors) {
	      return bounds.getBestNewPosition(neighbors);
	    },

	    /**
	     * Returns bounding box which covers all bodies
	     */
	    getBBox: function () {
	      return bounds.box;
	    },

	    gravity: function (value) {
	      if (value !== undefined) {
	        settings.gravity = value;
	        quadTree.options({gravity: value});
	        return this;
	      } else {
	        return settings.gravity;
	      }
	    },

	    theta: function (value) {
	      if (value !== undefined) {
	        settings.theta = value;
	        quadTree.options({theta: value});
	        return this;
	      } else {
	        return settings.theta;
	      }
	    }
	  };

	  // allow settings modification via public API:
	  expose(settings, publicApi);

	  eventify(publicApi);

	  return publicApi;

	  function accumulateForces() {
	    // Accumulate forces acting on bodies.
	    var body,
	        i = bodies.length;

	    if (i) {
	      // only add bodies if there the array is not empty:
	      quadTree.insertBodies(bodies); // performance: O(n * log n)
	      while (i--) {
	        body = bodies[i];
	        // If body is pinned there is no point updating its forces - it should
	        // never move:
	        if (!body.isPinned) {
	          body.force.reset();

	          quadTree.updateBodyForce(body);
	          dragForce.update(body);
	        }
	      }
	    }

	    i = springs.length;
	    while(i--) {
	      springForce.update(springs[i]);
	    }
	  }
	};


/***/ }),
/* 12 */
/***/ (function(module, exports) {

	module.exports = Spring;

	/**
	 * Represents a physical spring. Spring connects two bodies, has rest length
	 * stiffness coefficient and optional weight
	 */
	function Spring(fromBody, toBody, length, coeff, weight) {
	    this.from = fromBody;
	    this.to = toBody;
	    this.length = length;
	    this.coeff = coeff;

	    this.weight = typeof weight === 'number' ? weight : 1;
	};


/***/ }),
/* 13 */
/***/ (function(module, exports) {

	module.exports = exposeProperties;

	/**
	 * Augments `target` object with getter/setter functions, which modify settings
	 *
	 * @example
	 *  var target = {};
	 *  exposeProperties({ age: 42}, target);
	 *  target.age(); // returns 42
	 *  target.age(24); // make age 24;
	 *
	 *  var filteredTarget = {};
	 *  exposeProperties({ age: 42, name: 'John'}, filteredTarget, ['name']);
	 *  filteredTarget.name(); // returns 'John'
	 *  filteredTarget.age === undefined; // true
	 */
	function exposeProperties(settings, target, filter) {
	  var needsFilter = Object.prototype.toString.call(filter) === '[object Array]';
	  if (needsFilter) {
	    for (var i = 0; i < filter.length; ++i) {
	      augment(settings, target, filter[i]);
	    }
	  } else {
	    for (var key in settings) {
	      augment(settings, target, key);
	    }
	  }
	}

	function augment(source, target, key) {
	  if (source.hasOwnProperty(key)) {
	    if (typeof target[key] === 'function') {
	      // this accessor is already defined. Ignore it
	      return;
	    }
	    target[key] = function (value) {
	      if (value !== undefined) {
	        source[key] = value;
	        return target;
	      }
	      return source[key];
	    }
	  }
	}


/***/ }),
/* 14 */
/***/ (function(module, exports) {

	module.exports = merge;

	/**
	 * Augments `target` with properties in `options`. Does not override
	 * target's properties if they are defined and matches expected type in
	 * options
	 *
	 * @returns {Object} merged object
	 */
	function merge(target, options) {
	  var key;
	  if (!target) { target = {}; }
	  if (options) {
	    for (key in options) {
	      if (options.hasOwnProperty(key)) {
	        var targetHasIt = target.hasOwnProperty(key),
	            optionsValueType = typeof options[key],
	            shouldReplace = !targetHasIt || (typeof target[key] !== optionsValueType);

	        if (shouldReplace) {
	          target[key] = options[key];
	        } else if (optionsValueType === 'object') {
	          // go deep, don't care about loops here, we are simple API!:
	          target[key] = merge(target[key], options[key]);
	        }
	      }
	    }
	  }

	  return target;
	}


/***/ }),
/* 15 */
/***/ (function(module, exports) {

	module.exports = function(subject) {
	  validateSubject(subject);

	  var eventsStorage = createEventsStorage(subject);
	  subject.on = eventsStorage.on;
	  subject.off = eventsStorage.off;
	  subject.fire = eventsStorage.fire;
	  return subject;
	};

	function createEventsStorage(subject) {
	  // Store all event listeners to this hash. Key is event name, value is array
	  // of callback records.
	  //
	  // A callback record consists of callback function and its optional context:
	  // { 'eventName' => [{callback: function, ctx: object}] }
	  var registeredEvents = Object.create(null);

	  return {
	    on: function (eventName, callback, ctx) {
	      if (typeof callback !== 'function') {
	        throw new Error('callback is expected to be a function');
	      }
	      var handlers = registeredEvents[eventName];
	      if (!handlers) {
	        handlers = registeredEvents[eventName] = [];
	      }
	      handlers.push({callback: callback, ctx: ctx});

	      return subject;
	    },

	    off: function (eventName, callback) {
	      var wantToRemoveAll = (typeof eventName === 'undefined');
	      if (wantToRemoveAll) {
	        // Killing old events storage should be enough in this case:
	        registeredEvents = Object.create(null);
	        return subject;
	      }

	      if (registeredEvents[eventName]) {
	        var deleteAllCallbacksForEvent = (typeof callback !== 'function');
	        if (deleteAllCallbacksForEvent) {
	          delete registeredEvents[eventName];
	        } else {
	          var callbacks = registeredEvents[eventName];
	          for (var i = 0; i < callbacks.length; ++i) {
	            if (callbacks[i].callback === callback) {
	              callbacks.splice(i, 1);
	            }
	          }
	        }
	      }

	      return subject;
	    },

	    fire: function (eventName) {
	      var callbacks = registeredEvents[eventName];
	      if (!callbacks) {
	        return subject;
	      }

	      var fireArguments;
	      if (arguments.length > 1) {
	        fireArguments = Array.prototype.splice.call(arguments, 1);
	      }
	      for(var i = 0; i < callbacks.length; ++i) {
	        var callbackInfo = callbacks[i];
	        callbackInfo.callback.apply(callbackInfo.ctx, fireArguments);
	      }

	      return subject;
	    }
	  };
	}

	function validateSubject(subject) {
	  if (!subject) {
	    throw new Error('Eventify cannot use falsy object as events subject');
	  }
	  var reservedWords = ['on', 'fire', 'off'];
	  for (var i = 0; i < reservedWords.length; ++i) {
	    if (subject.hasOwnProperty(reservedWords[i])) {
	      throw new Error("Subject cannot be eventified, since it already has property '" + reservedWords[i] + "'");
	    }
	  }
	}


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * This is Barnes Hut simulation algorithm for 2d case. Implementation
	 * is highly optimized (avoids recusion and gc pressure)
	 *
	 * http://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html
	 */

	module.exports = function(options) {
	  options = options || {};
	  options.gravity = typeof options.gravity === 'number' ? options.gravity : -1;
	  options.theta = typeof options.theta === 'number' ? options.theta : 0.8;

	  // we require deterministic randomness here
	  var random = __webpack_require__(17).random(1984),
	    Node = __webpack_require__(18),
	    InsertStack = __webpack_require__(19),
	    isSamePosition = __webpack_require__(20);

	  var gravity = options.gravity,
	    updateQueue = [],
	    insertStack = new InsertStack(),
	    theta = options.theta,

	    nodesCache = [],
	    currentInCache = 0,
	    root = newNode();

	  return {
	    insertBodies: insertBodies,
	    /**
	     * Gets root node if its present
	     */
	    getRoot: function() {
	      return root;
	    },
	    updateBodyForce: update,
	    options: function(newOptions) {
	      if (newOptions) {
	        if (typeof newOptions.gravity === 'number') {
	          gravity = newOptions.gravity;
	        }
	        if (typeof newOptions.theta === 'number') {
	          theta = newOptions.theta;
	        }

	        return this;
	      }

	      return {
	        gravity: gravity,
	        theta: theta
	      };
	    }
	  };

	  function newNode() {
	    // To avoid pressure on GC we reuse nodes.
	    var node = nodesCache[currentInCache];
	    if (node) {
	      node.quad0 = null;
	      node.quad1 = null;
	      node.quad2 = null;
	      node.quad3 = null;
	      node.body = null;
	      node.mass = node.massX = node.massY = 0;
	      node.left = node.right = node.top = node.bottom = 0;
	    } else {
	      node = new Node();
	      nodesCache[currentInCache] = node;
	    }

	    ++currentInCache;
	    return node;
	  }

	  function update(sourceBody) {
	    var queue = updateQueue,
	      v,
	      dx,
	      dy,
	      r, fx = 0,
	      fy = 0,
	      queueLength = 1,
	      shiftIdx = 0,
	      pushIdx = 1;

	    queue[0] = root;

	    while (queueLength) {
	      var node = queue[shiftIdx],
	        body = node.body;

	      queueLength -= 1;
	      shiftIdx += 1;
	      var differentBody = (body !== sourceBody);
	      if (body && differentBody) {
	        // If the current node is a leaf node (and it is not source body),
	        // calculate the force exerted by the current node on body, and add this
	        // amount to body's net force.
	        dx = body.pos.x - sourceBody.pos.x;
	        dy = body.pos.y - sourceBody.pos.y;
	        r = Math.sqrt(dx * dx + dy * dy);

	        if (r === 0) {
	          // Poor man's protection against zero distance.
	          dx = (random.nextDouble() - 0.5) / 50;
	          dy = (random.nextDouble() - 0.5) / 50;
	          r = Math.sqrt(dx * dx + dy * dy);
	        }

	        // This is standard gravition force calculation but we divide
	        // by r^3 to save two operations when normalizing force vector.
	        v = gravity * body.mass * sourceBody.mass / (r * r * r);
	        fx += v * dx;
	        fy += v * dy;
	      } else if (differentBody) {
	        // Otherwise, calculate the ratio s / r,  where s is the width of the region
	        // represented by the internal node, and r is the distance between the body
	        // and the node's center-of-mass
	        dx = node.massX / node.mass - sourceBody.pos.x;
	        dy = node.massY / node.mass - sourceBody.pos.y;
	        r = Math.sqrt(dx * dx + dy * dy);

	        if (r === 0) {
	          // Sorry about code duplucation. I don't want to create many functions
	          // right away. Just want to see performance first.
	          dx = (random.nextDouble() - 0.5) / 50;
	          dy = (random.nextDouble() - 0.5) / 50;
	          r = Math.sqrt(dx * dx + dy * dy);
	        }
	        // If s / r < θ, treat this internal node as a single body, and calculate the
	        // force it exerts on sourceBody, and add this amount to sourceBody's net force.
	        if ((node.right - node.left) / r < theta) {
	          // in the if statement above we consider node's width only
	          // because the region was squarified during tree creation.
	          // Thus there is no difference between using width or height.
	          v = gravity * node.mass * sourceBody.mass / (r * r * r);
	          fx += v * dx;
	          fy += v * dy;
	        } else {
	          // Otherwise, run the procedure recursively on each of the current node's children.

	          // I intentionally unfolded this loop, to save several CPU cycles.
	          if (node.quad0) {
	            queue[pushIdx] = node.quad0;
	            queueLength += 1;
	            pushIdx += 1;
	          }
	          if (node.quad1) {
	            queue[pushIdx] = node.quad1;
	            queueLength += 1;
	            pushIdx += 1;
	          }
	          if (node.quad2) {
	            queue[pushIdx] = node.quad2;
	            queueLength += 1;
	            pushIdx += 1;
	          }
	          if (node.quad3) {
	            queue[pushIdx] = node.quad3;
	            queueLength += 1;
	            pushIdx += 1;
	          }
	        }
	      }
	    }

	    sourceBody.force.x += fx;
	    sourceBody.force.y += fy;
	  }

	  function insertBodies(bodies) {
	    var x1 = Number.MAX_VALUE,
	      y1 = Number.MAX_VALUE,
	      x2 = Number.MIN_VALUE,
	      y2 = Number.MIN_VALUE,
	      i,
	      max = bodies.length;

	    // To reduce quad tree depth we are looking for exact bounding box of all particles.
	    i = max;
	    while (i--) {
	      var x = bodies[i].pos.x;
	      var y = bodies[i].pos.y;
	      if (x < x1) {
	        x1 = x;
	      }
	      if (x > x2) {
	        x2 = x;
	      }
	      if (y < y1) {
	        y1 = y;
	      }
	      if (y > y2) {
	        y2 = y;
	      }
	    }

	    // Squarify the bounds.
	    var dx = x2 - x1,
	      dy = y2 - y1;
	    if (dx > dy) {
	      y2 = y1 + dx;
	    } else {
	      x2 = x1 + dy;
	    }

	    currentInCache = 0;
	    root = newNode();
	    root.left = x1;
	    root.right = x2;
	    root.top = y1;
	    root.bottom = y2;

	    i = max - 1;
	    if (i >= 0) {
	      root.body = bodies[i];
	    }
	    while (i--) {
	      insert(bodies[i], root);
	    }
	  }

	  function insert(newBody) {
	    insertStack.reset();
	    insertStack.push(root, newBody);

	    while (!insertStack.isEmpty()) {
	      var stackItem = insertStack.pop(),
	        node = stackItem.node,
	        body = stackItem.body;

	      if (!node.body) {
	        // This is internal node. Update the total mass of the node and center-of-mass.
	        var x = body.pos.x;
	        var y = body.pos.y;
	        node.mass = node.mass + body.mass;
	        node.massX = node.massX + body.mass * x;
	        node.massY = node.massY + body.mass * y;

	        // Recursively insert the body in the appropriate quadrant.
	        // But first find the appropriate quadrant.
	        var quadIdx = 0, // Assume we are in the 0's quad.
	          left = node.left,
	          right = (node.right + left) / 2,
	          top = node.top,
	          bottom = (node.bottom + top) / 2;

	        if (x > right) { // somewhere in the eastern part.
	          quadIdx = quadIdx + 1;
	          left = right;
	          right = node.right;
	        }
	        if (y > bottom) { // and in south.
	          quadIdx = quadIdx + 2;
	          top = bottom;
	          bottom = node.bottom;
	        }

	        var child = getChild(node, quadIdx);
	        if (!child) {
	          // The node is internal but this quadrant is not taken. Add
	          // subnode to it.
	          child = newNode();
	          child.left = left;
	          child.top = top;
	          child.right = right;
	          child.bottom = bottom;
	          child.body = body;

	          setChild(node, quadIdx, child);
	        } else {
	          // continue searching in this quadrant.
	          insertStack.push(child, body);
	        }
	      } else {
	        // We are trying to add to the leaf node.
	        // We have to convert current leaf into internal node
	        // and continue adding two nodes.
	        var oldBody = node.body;
	        node.body = null; // internal nodes do not cary bodies

	        if (isSamePosition(oldBody.pos, body.pos)) {
	          // Prevent infinite subdivision by bumping one node
	          // anywhere in this quadrant
	          var retriesCount = 3;
	          do {
	            var offset = random.nextDouble();
	            var dx = (node.right - node.left) * offset;
	            var dy = (node.bottom - node.top) * offset;

	            oldBody.pos.x = node.left + dx;
	            oldBody.pos.y = node.top + dy;
	            retriesCount -= 1;
	            // Make sure we don't bump it out of the box. If we do, next iteration should fix it
	          } while (retriesCount > 0 && isSamePosition(oldBody.pos, body.pos));

	          if (retriesCount === 0 && isSamePosition(oldBody.pos, body.pos)) {
	            // This is very bad, we ran out of precision.
	            // if we do not return from the method we'll get into
	            // infinite loop here. So we sacrifice correctness of layout, and keep the app running
	            // Next layout iteration should get larger bounding box in the first step and fix this
	            return;
	          }
	        }
	        // Next iteration should subdivide node further.
	        insertStack.push(node, oldBody);
	        insertStack.push(node, body);
	      }
	    }
	  }
	};

	function getChild(node, idx) {
	  if (idx === 0) return node.quad0;
	  if (idx === 1) return node.quad1;
	  if (idx === 2) return node.quad2;
	  if (idx === 3) return node.quad3;
	  return null;
	}

	function setChild(node, idx, child) {
	  if (idx === 0) node.quad0 = child;
	  else if (idx === 1) node.quad1 = child;
	  else if (idx === 2) node.quad2 = child;
	  else if (idx === 3) node.quad3 = child;
	}


/***/ }),
/* 17 */
/***/ (function(module, exports) {

	module.exports = {
	  random: random,
	  randomIterator: randomIterator
	};

	/**
	 * Creates seeded PRNG with two methods:
	 *   next() and nextDouble()
	 */
	function random(inputSeed) {
	  var seed = typeof inputSeed === 'number' ? inputSeed : (+ new Date());
	  var randomFunc = function() {
	      // Robert Jenkins' 32 bit integer hash function.
	      seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
	      seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
	      seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
	      seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
	      seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
	      seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
	      return (seed & 0xfffffff) / 0x10000000;
	  };

	  return {
	      /**
	       * Generates random integer number in the range from 0 (inclusive) to maxValue (exclusive)
	       *
	       * @param maxValue Number REQUIRED. Ommitting this number will result in NaN values from PRNG.
	       */
	      next : function (maxValue) {
	          return Math.floor(randomFunc() * maxValue);
	      },

	      /**
	       * Generates random double number in the range from 0 (inclusive) to 1 (exclusive)
	       * This function is the same as Math.random() (except that it could be seeded)
	       */
	      nextDouble : function () {
	          return randomFunc();
	      }
	  };
	}

	/*
	 * Creates iterator over array, which returns items of array in random order
	 * Time complexity is guaranteed to be O(n);
	 */
	function randomIterator(array, customRandom) {
	    var localRandom = customRandom || random();
	    if (typeof localRandom.next !== 'function') {
	      throw new Error('customRandom does not match expected API: next() function is missing');
	    }

	    return {
	        forEach : function (callback) {
	            var i, j, t;
	            for (i = array.length - 1; i > 0; --i) {
	                j = localRandom.next(i + 1); // i inclusive
	                t = array[j];
	                array[j] = array[i];
	                array[i] = t;

	                callback(t);
	            }

	            if (array.length) {
	                callback(array[0]);
	            }
	        },

	        /**
	         * Shuffles array randomly, in place.
	         */
	        shuffle : function () {
	            var i, j, t;
	            for (i = array.length - 1; i > 0; --i) {
	                j = localRandom.next(i + 1); // i inclusive
	                t = array[j];
	                array[j] = array[i];
	                array[i] = t;
	            }

	            return array;
	        }
	    };
	}


/***/ }),
/* 18 */
/***/ (function(module, exports) {

	/**
	 * Internal data structure to represent 2D QuadTree node
	 */
	module.exports = function Node() {
	  // body stored inside this node. In quad tree only leaf nodes (by construction)
	  // contain boides:
	  this.body = null;

	  // Child nodes are stored in quads. Each quad is presented by number:
	  // 0 | 1
	  // -----
	  // 2 | 3
	  this.quad0 = null;
	  this.quad1 = null;
	  this.quad2 = null;
	  this.quad3 = null;

	  // Total mass of current node
	  this.mass = 0;

	  // Center of mass coordinates
	  this.massX = 0;
	  this.massY = 0;

	  // bounding box coordinates
	  this.left = 0;
	  this.top = 0;
	  this.bottom = 0;
	  this.right = 0;
	};


/***/ }),
/* 19 */
/***/ (function(module, exports) {

	module.exports = InsertStack;

	/**
	 * Our implmentation of QuadTree is non-recursive to avoid GC hit
	 * This data structure represent stack of elements
	 * which we are trying to insert into quad tree.
	 */
	function InsertStack () {
	    this.stack = [];
	    this.popIdx = 0;
	}

	InsertStack.prototype = {
	    isEmpty: function() {
	        return this.popIdx === 0;
	    },
	    push: function (node, body) {
	        var item = this.stack[this.popIdx];
	        if (!item) {
	            // we are trying to avoid memory pressue: create new element
	            // only when absolutely necessary
	            this.stack[this.popIdx] = new InsertStackElement(node, body);
	        } else {
	            item.node = node;
	            item.body = body;
	        }
	        ++this.popIdx;
	    },
	    pop: function () {
	        if (this.popIdx > 0) {
	            return this.stack[--this.popIdx];
	        }
	    },
	    reset: function () {
	        this.popIdx = 0;
	    }
	};

	function InsertStackElement(node, body) {
	    this.node = node; // QuadTree node
	    this.body = body; // physical body which needs to be inserted to node
	}


/***/ }),
/* 20 */
/***/ (function(module, exports) {

	module.exports = function isSamePosition(point1, point2) {
	    var dx = Math.abs(point1.x - point2.x);
	    var dy = Math.abs(point1.y - point2.y);

	    return (dx < 1e-8 && dy < 1e-8);
	};


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = function (bodies, settings) {
	  var random = __webpack_require__(17).random(42);
	  var boundingBox =  { x1: 0, y1: 0, x2: 0, y2: 0 };

	  return {
	    box: boundingBox,

	    update: updateBoundingBox,

	    reset : function () {
	      boundingBox.x1 = boundingBox.y1 = 0;
	      boundingBox.x2 = boundingBox.y2 = 0;
	    },

	    getBestNewPosition: function (neighbors) {
	      var graphRect = boundingBox;

	      var baseX = 0, baseY = 0;

	      if (neighbors.length) {
	        for (var i = 0; i < neighbors.length; ++i) {
	          baseX += neighbors[i].pos.x;
	          baseY += neighbors[i].pos.y;
	        }

	        baseX /= neighbors.length;
	        baseY /= neighbors.length;
	      } else {
	        baseX = (graphRect.x1 + graphRect.x2) / 2;
	        baseY = (graphRect.y1 + graphRect.y2) / 2;
	      }

	      var springLength = settings.springLength;
	      return {
	        x: baseX + random.next(springLength) - springLength / 2,
	        y: baseY + random.next(springLength) - springLength / 2
	      };
	    }
	  };

	  function updateBoundingBox() {
	    var i = bodies.length;
	    if (i === 0) { return; } // don't have to wory here.

	    var x1 = Number.MAX_VALUE,
	        y1 = Number.MAX_VALUE,
	        x2 = Number.MIN_VALUE,
	        y2 = Number.MIN_VALUE;

	    while(i--) {
	      // this is O(n), could it be done faster with quadtree?
	      // how about pinned nodes?
	      var body = bodies[i];
	      if (body.isPinned) {
	        body.pos.x = body.prevPos.x;
	        body.pos.y = body.prevPos.y;
	      } else {
	        body.prevPos.x = body.pos.x;
	        body.prevPos.y = body.pos.y;
	      }
	      if (body.pos.x < x1) {
	        x1 = body.pos.x;
	      }
	      if (body.pos.x > x2) {
	        x2 = body.pos.x;
	      }
	      if (body.pos.y < y1) {
	        y1 = body.pos.y;
	      }
	      if (body.pos.y > y2) {
	        y2 = body.pos.y;
	      }
	    }

	    boundingBox.x1 = x1;
	    boundingBox.x2 = x2;
	    boundingBox.y1 = y1;
	    boundingBox.y2 = y2;
	  }
	}


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents drag force, which reduces force value on each step by given
	 * coefficient.
	 *
	 * @param {Object} options for the drag force
	 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(14),
	      expose = __webpack_require__(13);

	  options = merge(options, {
	    dragCoeff: 0.02
	  });

	  var api = {
	    update : function (body) {
	      body.force.x -= options.dragCoeff * body.velocity.x;
	      body.force.y -= options.dragCoeff * body.velocity.y;
	    }
	  };

	  // let easy access to dragCoeff:
	  expose(options, api, ['dragCoeff']);

	  return api;
	};


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents spring force, which updates forces acting on two bodies, conntected
	 * by a spring.
	 *
	 * @param {Object} options for the spring force
	 * @param {Number=} options.springCoeff spring force coefficient.
	 * @param {Number=} options.springLength desired length of a spring at rest.
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(14);
	  var random = __webpack_require__(17).random(42);
	  var expose = __webpack_require__(13);

	  options = merge(options, {
	    springCoeff: 0.0002,
	    springLength: 80
	  });

	  var api = {
	    /**
	     * Upsates forces acting on a spring
	     */
	    update : function (spring) {
	      var body1 = spring.from,
	          body2 = spring.to,
	          length = spring.length < 0 ? options.springLength : spring.length,
	          dx = body2.pos.x - body1.pos.x,
	          dy = body2.pos.y - body1.pos.y,
	          r = Math.sqrt(dx * dx + dy * dy);

	      if (r === 0) {
	          dx = (random.nextDouble() - 0.5) / 50;
	          dy = (random.nextDouble() - 0.5) / 50;
	          r = Math.sqrt(dx * dx + dy * dy);
	      }

	      var d = r - length;
	      var coeff = ((!spring.coeff || spring.coeff < 0) ? options.springCoeff : spring.coeff) * d / r * spring.weight;

	      body1.force.x += coeff * dx;
	      body1.force.y += coeff * dy;

	      body2.force.x -= coeff * dx;
	      body2.force.y -= coeff * dy;
	    }
	  };

	  expose(options, api, ['springCoeff', 'springLength']);
	  return api;
	}


/***/ }),
/* 24 */
/***/ (function(module, exports) {

	/**
	 * Performs forces integration, using given timestep. Uses Euler method to solve
	 * differential equation (http://en.wikipedia.org/wiki/Euler_method ).
	 *
	 * @returns {Number} squared distance of total position updates.
	 */

	module.exports = integrate;

	function integrate(bodies, timeStep) {
	  var dx = 0, tx = 0,
	      dy = 0, ty = 0,
	      i,
	      max = bodies.length;

	  if (max === 0) {
	    return 0;
	  }

	  for (i = 0; i < max; ++i) {
	    var body = bodies[i],
	        coeff = timeStep / body.mass;

	    body.velocity.x += coeff * body.force.x;
	    body.velocity.y += coeff * body.force.y;
	    var vx = body.velocity.x,
	        vy = body.velocity.y,
	        v = Math.sqrt(vx * vx + vy * vy);

	    if (v > 1) {
	      body.velocity.x = vx / v;
	      body.velocity.y = vy / v;
	    }

	    dx = timeStep * body.velocity.x;
	    dy = timeStep * body.velocity.y;

	    body.pos.x += dx;
	    body.pos.y += dy;

	    tx += Math.abs(dx); ty += Math.abs(dy);
	  }

	  return (tx * tx + ty * ty)/max;
	}


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	var physics = __webpack_require__(26);

	module.exports = function(pos) {
	  return new physics.Body(pos);
	}


/***/ }),
/* 26 */
/***/ (function(module, exports) {

	module.exports = {
	  Body: Body,
	  Vector2d: Vector2d,
	  Body3d: Body3d,
	  Vector3d: Vector3d
	};

	function Body(x, y) {
	  this.pos = new Vector2d(x, y);
	  this.prevPos = new Vector2d(x, y);
	  this.force = new Vector2d();
	  this.velocity = new Vector2d();
	  this.mass = 1;
	}

	Body.prototype.setPosition = function (x, y) {
	  this.prevPos.x = this.pos.x = x;
	  this.prevPos.y = this.pos.y = y;
	};

	function Vector2d(x, y) {
	  if (x && typeof x !== 'number') {
	    // could be another vector
	    this.x = typeof x.x === 'number' ? x.x : 0;
	    this.y = typeof x.y === 'number' ? x.y : 0;
	  } else {
	    this.x = typeof x === 'number' ? x : 0;
	    this.y = typeof y === 'number' ? y : 0;
	  }
	}

	Vector2d.prototype.reset = function () {
	  this.x = this.y = 0;
	};

	function Body3d(x, y, z) {
	  this.pos = new Vector3d(x, y, z);
	  this.prevPos = new Vector3d(x, y, z);
	  this.force = new Vector3d();
	  this.velocity = new Vector3d();
	  this.mass = 1;
	}

	Body3d.prototype.setPosition = function (x, y, z) {
	  this.prevPos.x = this.pos.x = x;
	  this.prevPos.y = this.pos.y = y;
	  this.prevPos.z = this.pos.z = z;
	};

	function Vector3d(x, y, z) {
	  if (x && typeof x !== 'number') {
	    // could be another vector
	    this.x = typeof x.x === 'number' ? x.x : 0;
	    this.y = typeof x.y === 'number' ? x.y : 0;
	    this.z = typeof x.z === 'number' ? x.z : 0;
	  } else {
	    this.x = typeof x === 'number' ? x : 0;
	    this.y = typeof y === 'number' ? y : 0;
	    this.z = typeof z === 'number' ? z : 0;
	  }
	};

	Vector3d.prototype.reset = function () {
	  this.x = this.y = this.z = 0;
	};


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * This module provides all required forces to regular ngraph.physics.simulator
	 * to make it 3D simulator. Ideally ngraph.physics.simulator should operate
	 * with vectors, but on practices that showed performance decrease... Maybe
	 * I was doing it wrong, will see if I can refactor/throw away this module.
	 */
	module.exports = createLayout;
	createLayout.get2dLayout = __webpack_require__(28);

	function createLayout(graph, physicsSettings) {
	  var merge = __webpack_require__(32);
	  physicsSettings = merge(physicsSettings, {
	        createQuadTree: __webpack_require__(45),
	        createBounds: __webpack_require__(49),
	        createDragForce: __webpack_require__(50),
	        createSpringForce: __webpack_require__(51),
	        integrator: getIntegrator(physicsSettings),
	        createBody: __webpack_require__(52)
	      });

	  return createLayout.get2dLayout(graph, physicsSettings);
	}

	function getIntegrator(physicsSettings) {
	  if (physicsSettings && physicsSettings.integrator === 'verlet') {
	    return __webpack_require__(53);
	  }

	  return __webpack_require__(54)
	}


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = createLayout;
	module.exports.simulator = __webpack_require__(29);

	var eventify = __webpack_require__(33);

	/**
	 * Creates force based layout for a given graph.
	 * @param {ngraph.graph} graph which needs to be laid out
	 * @param {object} physicsSettings if you need custom settings
	 * for physics simulator you can pass your own settings here. If it's not passed
	 * a default one will be created.
	 */
	function createLayout(graph, physicsSettings) {
	  if (!graph) {
	    throw new Error('Graph structure cannot be undefined');
	  }

	  var createSimulator = __webpack_require__(29);
	  var physicsSimulator = createSimulator(physicsSettings);

	  var nodeBodies = typeof Object.create === 'function' ? Object.create(null) : {};
	  var springs = {};

	  var springTransform = physicsSimulator.settings.springTransform || noop;

	  // Initialize physical objects according to what we have in the graph:
	  initPhysics();
	  listenToEvents();

	  var api = {
	    /**
	     * Performs one step of iterative layout algorithm
	     */
	    step: function() {
	      return physicsSimulator.step();
	    },

	    /**
	     * For a given `nodeId` returns position
	     */
	    getNodePosition: function (nodeId) {
	      return getInitializedBody(nodeId).pos;
	    },

	    /**
	     * Sets position of a node to a given coordinates
	     * @param {string} nodeId node identifier
	     * @param {number} x position of a node
	     * @param {number} y position of a node
	     * @param {number=} z position of node (only if applicable to body)
	     */
	    setNodePosition: function (nodeId) {
	      var body = getInitializedBody(nodeId);
	      body.setPosition.apply(body, Array.prototype.slice.call(arguments, 1));
	    },

	    /**
	     * @returns {Object} Link position by link id
	     * @returns {Object.from} {x, y} coordinates of link start
	     * @returns {Object.to} {x, y} coordinates of link end
	     */
	    getLinkPosition: function (linkId) {
	      var spring = springs[linkId];
	      if (spring) {
	        return {
	          from: spring.from.pos,
	          to: spring.to.pos
	        };
	      }
	    },

	    /**
	     * @returns {Object} area required to fit in the graph. Object contains
	     * `x1`, `y1` - top left coordinates
	     * `x2`, `y2` - bottom right coordinates
	     */
	    getGraphRect: function () {
	      return physicsSimulator.getBBox();
	    },

	    /*
	     * Requests layout algorithm to pin/unpin node to its current position
	     * Pinned nodes should not be affected by layout algorithm and always
	     * remain at their position
	     */
	    pinNode: function (node, isPinned) {
	      var body = getInitializedBody(node.id);
	       body.isPinned = !!isPinned;
	    },

	    /**
	     * Checks whether given graph's node is currently pinned
	     */
	    isNodePinned: function (node) {
	      return getInitializedBody(node.id).isPinned;
	    },

	    /**
	     * Request to release all resources
	     */
	    dispose: function() {
	      graph.off('changed', onGraphChanged);
	      physicsSimulator.off('stable', onStableChanged);
	    },

	    /**
	     * Gets physical body for a given node id. If node is not found undefined
	     * value is returned.
	     */
	    getBody: getBody,

	    /**
	     * Gets spring for a given edge.
	     *
	     * @param {string} linkId link identifer. If two arguments are passed then
	     * this argument is treated as formNodeId
	     * @param {string=} toId when defined this parameter denotes head of the link
	     * and first argument is trated as tail of the link (fromId)
	     */
	    getSpring: getSpring,

	    /**
	     * [Read only] Gets current physics simulator
	     */
	    simulator: physicsSimulator
	  };

	  eventify(api);
	  return api;

	  function getSpring(fromId, toId) {
	    var linkId;
	    if (toId === undefined) {
	      if (typeof fromId !== 'object') {
	        // assume fromId as a linkId:
	        linkId = fromId;
	      } else {
	        // assume fromId to be a link object:
	        linkId = fromId.id;
	      }
	    } else {
	      // toId is defined, should grab link:
	      var link = graph.hasLink(fromId, toId);
	      if (!link) return;
	      linkId = link.id;
	    }

	    return springs[linkId];
	  }

	  function getBody(nodeId) {
	    return nodeBodies[nodeId];
	  }

	  function listenToEvents() {
	    graph.on('changed', onGraphChanged);
	    physicsSimulator.on('stable', onStableChanged);
	  }

	  function onStableChanged(isStable) {
	    api.fire('stable', isStable);
	  }

	  function onGraphChanged(changes) {
	    for (var i = 0; i < changes.length; ++i) {
	      var change = changes[i];
	      if (change.changeType === 'add') {
	        if (change.node) {
	          initBody(change.node.id);
	        }
	        if (change.link) {
	          initLink(change.link);
	        }
	      } else if (change.changeType === 'remove') {
	        if (change.node) {
	          releaseNode(change.node);
	        }
	        if (change.link) {
	          releaseLink(change.link);
	        }
	      }
	    }
	  }

	  function initPhysics() {
	    graph.forEachNode(function (node) {
	      initBody(node.id);
	    });
	    graph.forEachLink(initLink);
	  }

	  function initBody(nodeId) {
	    var body = nodeBodies[nodeId];
	    if (!body) {
	      var node = graph.getNode(nodeId);
	      if (!node) {
	        throw new Error('initBody() was called with unknown node id');
	      }

	      var pos = node.position;
	      if (!pos) {
	        var neighbors = getNeighborBodies(node);
	        pos = physicsSimulator.getBestNewBodyPosition(neighbors);
	      }

	      body = physicsSimulator.addBodyAt(pos);

	      nodeBodies[nodeId] = body;
	      updateBodyMass(nodeId);

	      if (isNodeOriginallyPinned(node)) {
	        body.isPinned = true;
	      }
	    }
	  }

	  function releaseNode(node) {
	    var nodeId = node.id;
	    var body = nodeBodies[nodeId];
	    if (body) {
	      nodeBodies[nodeId] = null;
	      delete nodeBodies[nodeId];

	      physicsSimulator.removeBody(body);
	    }
	  }

	  function initLink(link) {
	    updateBodyMass(link.fromId);
	    updateBodyMass(link.toId);

	    var fromBody = nodeBodies[link.fromId],
	        toBody  = nodeBodies[link.toId],
	        spring = physicsSimulator.addSpring(fromBody, toBody, link.length);

	    springTransform(link, spring);

	    springs[link.id] = spring;
	  }

	  function releaseLink(link) {
	    var spring = springs[link.id];
	    if (spring) {
	      var from = graph.getNode(link.fromId),
	          to = graph.getNode(link.toId);

	      if (from) updateBodyMass(from.id);
	      if (to) updateBodyMass(to.id);

	      delete springs[link.id];

	      physicsSimulator.removeSpring(spring);
	    }
	  }

	  function getNeighborBodies(node) {
	    // TODO: Could probably be done better on memory
	    var neighbors = [];
	    if (!node.links) {
	      return neighbors;
	    }
	    var maxNeighbors = Math.min(node.links.length, 2);
	    for (var i = 0; i < maxNeighbors; ++i) {
	      var link = node.links[i];
	      var otherBody = link.fromId !== node.id ? nodeBodies[link.fromId] : nodeBodies[link.toId];
	      if (otherBody && otherBody.pos) {
	        neighbors.push(otherBody);
	      }
	    }

	    return neighbors;
	  }

	  function updateBodyMass(nodeId) {
	    var body = nodeBodies[nodeId];
	    body.mass = nodeMass(nodeId);
	  }

	  /**
	   * Checks whether graph node has in its settings pinned attribute,
	   * which means layout algorithm cannot move it. Node can be preconfigured
	   * as pinned, if it has "isPinned" attribute, or when node.data has it.
	   *
	   * @param {Object} node a graph node to check
	   * @return {Boolean} true if node should be treated as pinned; false otherwise.
	   */
	  function isNodeOriginallyPinned(node) {
	    return (node && (node.isPinned || (node.data && node.data.isPinned)));
	  }

	  function getInitializedBody(nodeId) {
	    var body = nodeBodies[nodeId];
	    if (!body) {
	      initBody(nodeId);
	      body = nodeBodies[nodeId];
	    }
	    return body;
	  }

	  /**
	   * Calculates mass of a body, which corresponds to node with given id.
	   *
	   * @param {String|Number} nodeId identifier of a node, for which body mass needs to be calculated
	   * @returns {Number} recommended mass of the body;
	   */
	  function nodeMass(nodeId) {
	    var links = graph.getLinks(nodeId);
	    if (!links) return 1;
	    return 1 + links.length / 3.0;
	  }
	}

	function noop() { }


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Manages a simulation of physical forces acting on bodies and springs.
	 */
	module.exports = physicsSimulator;

	function physicsSimulator(settings) {
	  var Spring = __webpack_require__(30);
	  var expose = __webpack_require__(31);
	  var merge = __webpack_require__(32);
	  var eventify = __webpack_require__(33);

	  settings = merge(settings, {
	      /**
	       * Ideal length for links (springs in physical model).
	       */
	      springLength: 30,

	      /**
	       * Hook's law coefficient. 1 - solid spring.
	       */
	      springCoeff: 0.0008,

	      /**
	       * Coulomb's law coefficient. It's used to repel nodes thus should be negative
	       * if you make it positive nodes start attract each other :).
	       */
	      gravity: -1.2,

	      /**
	       * Theta coefficient from Barnes Hut simulation. Ranged between (0, 1).
	       * The closer it's to 1 the more nodes algorithm will have to go through.
	       * Setting it to one makes Barnes Hut simulation no different from
	       * brute-force forces calculation (each node is considered).
	       */
	      theta: 0.8,

	      /**
	       * Drag force coefficient. Used to slow down system, thus should be less than 1.
	       * The closer it is to 0 the less tight system will be.
	       */
	      dragCoeff: 0.02,

	      /**
	       * Default time step (dt) for forces integration
	       */
	      timeStep : 20,

	      /**
	        * Maximum movement of the system which can be considered as stabilized
	        */
	      stableThreshold: 0.009
	  });

	  // We allow clients to override basic factory methods:
	  var createQuadTree = settings.createQuadTree || __webpack_require__(34);
	  var createBounds = settings.createBounds || __webpack_require__(39);
	  var createDragForce = settings.createDragForce || __webpack_require__(40);
	  var createSpringForce = settings.createSpringForce || __webpack_require__(41);
	  var integrate = settings.integrator || __webpack_require__(42);
	  var createBody = settings.createBody || __webpack_require__(43);

	  var bodies = [], // Bodies in this simulation.
	      springs = [], // Springs in this simulation.
	      quadTree =  createQuadTree(settings),
	      bounds = createBounds(bodies, settings),
	      springForce = createSpringForce(settings),
	      dragForce = createDragForce(settings);

	  var totalMovement = 0; // how much movement we made on last step
	  var lastStable = false; // indicates whether system was stable on last step() call

	  var publicApi = {
	    /**
	     * Array of bodies, registered with current simulator
	     *
	     * Note: To add new body, use addBody() method. This property is only
	     * exposed for testing/performance purposes.
	     */
	    bodies: bodies,

	    /**
	     * Array of springs, registered with current simulator
	     *
	     * Note: To add new spring, use addSpring() method. This property is only
	     * exposed for testing/performance purposes.
	     */
	    springs: springs,

	    /**
	     * Returns settings with which current simulator was initialized
	     */
	    settings: settings,

	    /**
	     * Performs one step of force simulation.
	     *
	     * @returns {boolean} true if system is considered stable; False otherwise.
	     */
	    step: function () {
	      accumulateForces();
	      totalMovement = integrate(bodies, settings.timeStep);

	      bounds.update();
	      var stableNow = totalMovement < settings.stableThreshold;
	      if (lastStable !== stableNow) {
	        publicApi.fire('stable', stableNow);
	      }

	      lastStable = stableNow;

	      return stableNow;
	    },

	    /**
	     * Adds body to the system
	     *
	     * @param {ngraph.physics.primitives.Body} body physical body
	     *
	     * @returns {ngraph.physics.primitives.Body} added body
	     */
	    addBody: function (body) {
	      if (!body) {
	        throw new Error('Body is required');
	      }
	      bodies.push(body);

	      return body;
	    },

	    /**
	     * Adds body to the system at given position
	     *
	     * @param {Object} pos position of a body
	     *
	     * @returns {ngraph.physics.primitives.Body} added body
	     */
	    addBodyAt: function (pos) {
	      if (!pos) {
	        throw new Error('Body position is required');
	      }
	      var body = createBody(pos);
	      bodies.push(body);

	      return body;
	    },

	    /**
	     * Removes body from the system
	     *
	     * @param {ngraph.physics.primitives.Body} body to remove
	     *
	     * @returns {Boolean} true if body found and removed. falsy otherwise;
	     */
	    removeBody: function (body) {
	      if (!body) { return; }

	      var idx = bodies.indexOf(body);
	      if (idx < 0) { return; }

	      bodies.splice(idx, 1);
	      if (bodies.length === 0) {
	        bounds.reset();
	      }
	      return true;
	    },

	    /**
	     * Adds a spring to this simulation.
	     *
	     * @returns {Object} - a handle for a spring. If you want to later remove
	     * spring pass it to removeSpring() method.
	     */
	    addSpring: function (body1, body2, springLength, springWeight, springCoefficient) {
	      if (!body1 || !body2) {
	        throw new Error('Cannot add null spring to force simulator');
	      }

	      if (typeof springLength !== 'number') {
	        springLength = -1; // assume global configuration
	      }

	      var spring = new Spring(body1, body2, springLength, springCoefficient >= 0 ? springCoefficient : -1, springWeight);
	      springs.push(spring);

	      // TODO: could mark simulator as dirty.
	      return spring;
	    },

	    /**
	     * Returns amount of movement performed on last step() call
	     */
	    getTotalMovement: function () {
	      return totalMovement;
	    },

	    /**
	     * Removes spring from the system
	     *
	     * @param {Object} spring to remove. Spring is an object returned by addSpring
	     *
	     * @returns {Boolean} true if spring found and removed. falsy otherwise;
	     */
	    removeSpring: function (spring) {
	      if (!spring) { return; }
	      var idx = springs.indexOf(spring);
	      if (idx > -1) {
	        springs.splice(idx, 1);
	        return true;
	      }
	    },

	    getBestNewBodyPosition: function (neighbors) {
	      return bounds.getBestNewPosition(neighbors);
	    },

	    /**
	     * Returns bounding box which covers all bodies
	     */
	    getBBox: function () {
	      return bounds.box;
	    },

	    gravity: function (value) {
	      if (value !== undefined) {
	        settings.gravity = value;
	        quadTree.options({gravity: value});
	        return this;
	      } else {
	        return settings.gravity;
	      }
	    },

	    theta: function (value) {
	      if (value !== undefined) {
	        settings.theta = value;
	        quadTree.options({theta: value});
	        return this;
	      } else {
	        return settings.theta;
	      }
	    }
	  };

	  // allow settings modification via public API:
	  expose(settings, publicApi);
	  eventify(publicApi);

	  return publicApi;

	  function accumulateForces() {
	    // Accumulate forces acting on bodies.
	    var body,
	        i = bodies.length;

	    if (i) {
	      // only add bodies if there the array is not empty:
	      quadTree.insertBodies(bodies); // performance: O(n * log n)
	      while (i--) {
	        body = bodies[i];
	        // If body is pinned there is no point updating its forces - it should
	        // never move:
	        if (!body.isPinned) {
	          body.force.reset();

	          quadTree.updateBodyForce(body);
	          dragForce.update(body);
	        }
	      }
	    }

	    i = springs.length;
	    while(i--) {
	      springForce.update(springs[i]);
	    }
	  }
	};


/***/ }),
/* 30 */
/***/ (function(module, exports) {

	module.exports = Spring;

	/**
	 * Represents a physical spring. Spring connects two bodies, has rest length
	 * stiffness coefficient and optional weight
	 */
	function Spring(fromBody, toBody, length, coeff, weight) {
	    this.from = fromBody;
	    this.to = toBody;
	    this.length = length;
	    this.coeff = coeff;

	    this.weight = typeof weight === 'number' ? weight : 1;
	};


/***/ }),
/* 31 */
/***/ (function(module, exports) {

	module.exports = exposeProperties;

	/**
	 * Augments `target` object with getter/setter functions, which modify settings
	 *
	 * @example
	 *  var target = {};
	 *  exposeProperties({ age: 42}, target);
	 *  target.age(); // returns 42
	 *  target.age(24); // make age 24;
	 *
	 *  var filteredTarget = {};
	 *  exposeProperties({ age: 42, name: 'John'}, filteredTarget, ['name']);
	 *  filteredTarget.name(); // returns 'John'
	 *  filteredTarget.age === undefined; // true
	 */
	function exposeProperties(settings, target, filter) {
	  var needsFilter = Object.prototype.toString.call(filter) === '[object Array]';
	  if (needsFilter) {
	    for (var i = 0; i < filter.length; ++i) {
	      augment(settings, target, filter[i]);
	    }
	  } else {
	    for (var key in settings) {
	      augment(settings, target, key);
	    }
	  }
	}

	function augment(source, target, key) {
	  if (source.hasOwnProperty(key)) {
	    if (typeof target[key] === 'function') {
	      // this accessor is already defined. Ignore it
	      return;
	    }
	    target[key] = function (value) {
	      if (value !== undefined) {
	        source[key] = value;
	        return target;
	      }
	      return source[key];
	    }
	  }
	}


/***/ }),
/* 32 */
/***/ (function(module, exports) {

	module.exports = merge;

	/**
	 * Augments `target` with properties in `options`. Does not override
	 * target's properties if they are defined and matches expected type in
	 * options
	 *
	 * @returns {Object} merged object
	 */
	function merge(target, options) {
	  var key;
	  if (!target) { target = {}; }
	  if (options) {
	    for (key in options) {
	      if (options.hasOwnProperty(key)) {
	        var targetHasIt = target.hasOwnProperty(key),
	            optionsValueType = typeof options[key],
	            shouldReplace = !targetHasIt || (typeof target[key] !== optionsValueType);

	        if (shouldReplace) {
	          target[key] = options[key];
	        } else if (optionsValueType === 'object') {
	          // go deep, don't care about loops here, we are simple API!:
	          target[key] = merge(target[key], options[key]);
	        }
	      }
	    }
	  }

	  return target;
	}


/***/ }),
/* 33 */
/***/ (function(module, exports) {

	module.exports = function(subject) {
	  validateSubject(subject);

	  var eventsStorage = createEventsStorage(subject);
	  subject.on = eventsStorage.on;
	  subject.off = eventsStorage.off;
	  subject.fire = eventsStorage.fire;
	  return subject;
	};

	function createEventsStorage(subject) {
	  // Store all event listeners to this hash. Key is event name, value is array
	  // of callback records.
	  //
	  // A callback record consists of callback function and its optional context:
	  // { 'eventName' => [{callback: function, ctx: object}] }
	  var registeredEvents = Object.create(null);

	  return {
	    on: function (eventName, callback, ctx) {
	      if (typeof callback !== 'function') {
	        throw new Error('callback is expected to be a function');
	      }
	      var handlers = registeredEvents[eventName];
	      if (!handlers) {
	        handlers = registeredEvents[eventName] = [];
	      }
	      handlers.push({callback: callback, ctx: ctx});

	      return subject;
	    },

	    off: function (eventName, callback) {
	      var wantToRemoveAll = (typeof eventName === 'undefined');
	      if (wantToRemoveAll) {
	        // Killing old events storage should be enough in this case:
	        registeredEvents = Object.create(null);
	        return subject;
	      }

	      if (registeredEvents[eventName]) {
	        var deleteAllCallbacksForEvent = (typeof callback !== 'function');
	        if (deleteAllCallbacksForEvent) {
	          delete registeredEvents[eventName];
	        } else {
	          var callbacks = registeredEvents[eventName];
	          for (var i = 0; i < callbacks.length; ++i) {
	            if (callbacks[i].callback === callback) {
	              callbacks.splice(i, 1);
	            }
	          }
	        }
	      }

	      return subject;
	    },

	    fire: function (eventName) {
	      var callbacks = registeredEvents[eventName];
	      if (!callbacks) {
	        return subject;
	      }

	      var fireArguments;
	      if (arguments.length > 1) {
	        fireArguments = Array.prototype.splice.call(arguments, 1);
	      }
	      for(var i = 0; i < callbacks.length; ++i) {
	        var callbackInfo = callbacks[i];
	        callbackInfo.callback.apply(callbackInfo.ctx, fireArguments);
	      }

	      return subject;
	    }
	  };
	}

	function validateSubject(subject) {
	  if (!subject) {
	    throw new Error('Eventify cannot use falsy object as events subject');
	  }
	  var reservedWords = ['on', 'fire', 'off'];
	  for (var i = 0; i < reservedWords.length; ++i) {
	    if (subject.hasOwnProperty(reservedWords[i])) {
	      throw new Error("Subject cannot be eventified, since it already has property '" + reservedWords[i] + "'");
	    }
	  }
	}


/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * This is Barnes Hut simulation algorithm for 2d case. Implementation
	 * is highly optimized (avoids recusion and gc pressure)
	 *
	 * http://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html
	 */

	module.exports = function(options) {
	  options = options || {};
	  options.gravity = typeof options.gravity === 'number' ? options.gravity : -1;
	  options.theta = typeof options.theta === 'number' ? options.theta : 0.8;

	  // we require deterministic randomness here
	  var random = __webpack_require__(35).random(1984),
	    Node = __webpack_require__(36),
	    InsertStack = __webpack_require__(37),
	    isSamePosition = __webpack_require__(38);

	  var gravity = options.gravity,
	    updateQueue = [],
	    insertStack = new InsertStack(),
	    theta = options.theta,

	    nodesCache = [],
	    currentInCache = 0,
	    newNode = function() {
	      // To avoid pressure on GC we reuse nodes.
	      var node = nodesCache[currentInCache];
	      if (node) {
	        node.quad0 = null;
	        node.quad1 = null;
	        node.quad2 = null;
	        node.quad3 = null;
	        node.body = null;
	        node.mass = node.massX = node.massY = 0;
	        node.left = node.right = node.top = node.bottom = 0;
	      } else {
	        node = new Node();
	        nodesCache[currentInCache] = node;
	      }

	      ++currentInCache;
	      return node;
	    },

	    root = newNode(),

	    // Inserts body to the tree
	    insert = function(newBody) {
	      insertStack.reset();
	      insertStack.push(root, newBody);

	      while (!insertStack.isEmpty()) {
	        var stackItem = insertStack.pop(),
	          node = stackItem.node,
	          body = stackItem.body;

	        if (!node.body) {
	          // This is internal node. Update the total mass of the node and center-of-mass.
	          var x = body.pos.x;
	          var y = body.pos.y;
	          node.mass = node.mass + body.mass;
	          node.massX = node.massX + body.mass * x;
	          node.massY = node.massY + body.mass * y;

	          // Recursively insert the body in the appropriate quadrant.
	          // But first find the appropriate quadrant.
	          var quadIdx = 0, // Assume we are in the 0's quad.
	            left = node.left,
	            right = (node.right + left) / 2,
	            top = node.top,
	            bottom = (node.bottom + top) / 2;

	          if (x > right) { // somewhere in the eastern part.
	            quadIdx = quadIdx + 1;
	            var oldLeft = left;
	            left = right;
	            right = right + (right - oldLeft);
	          }
	          if (y > bottom) { // and in south.
	            quadIdx = quadIdx + 2;
	            var oldTop = top;
	            top = bottom;
	            bottom = bottom + (bottom - oldTop);
	          }

	          var child = getChild(node, quadIdx);
	          if (!child) {
	            // The node is internal but this quadrant is not taken. Add
	            // subnode to it.
	            child = newNode();
	            child.left = left;
	            child.top = top;
	            child.right = right;
	            child.bottom = bottom;
	            child.body = body;

	            setChild(node, quadIdx, child);
	          } else {
	            // continue searching in this quadrant.
	            insertStack.push(child, body);
	          }
	        } else {
	          // We are trying to add to the leaf node.
	          // We have to convert current leaf into internal node
	          // and continue adding two nodes.
	          var oldBody = node.body;
	          node.body = null; // internal nodes do not cary bodies

	          if (isSamePosition(oldBody.pos, body.pos)) {
	            // Prevent infinite subdivision by bumping one node
	            // anywhere in this quadrant
	            var retriesCount = 3;
	            do {
	              var offset = random.nextDouble();
	              var dx = (node.right - node.left) * offset;
	              var dy = (node.bottom - node.top) * offset;

	              oldBody.pos.x = node.left + dx;
	              oldBody.pos.y = node.top + dy;
	              retriesCount -= 1;
	              // Make sure we don't bump it out of the box. If we do, next iteration should fix it
	            } while (retriesCount > 0 && isSamePosition(oldBody.pos, body.pos));

	            if (retriesCount === 0 && isSamePosition(oldBody.pos, body.pos)) {
	              // This is very bad, we ran out of precision.
	              // if we do not return from the method we'll get into
	              // infinite loop here. So we sacrifice correctness of layout, and keep the app running
	              // Next layout iteration should get larger bounding box in the first step and fix this
	              return;
	            }
	          }
	          // Next iteration should subdivide node further.
	          insertStack.push(node, oldBody);
	          insertStack.push(node, body);
	        }
	      }
	    },

	    update = function(sourceBody) {
	      var queue = updateQueue,
	        v,
	        dx,
	        dy,
	        r, fx = 0,
	        fy = 0,
	        queueLength = 1,
	        shiftIdx = 0,
	        pushIdx = 1;

	      queue[0] = root;

	      while (queueLength) {
	        var node = queue[shiftIdx],
	          body = node.body;

	        queueLength -= 1;
	        shiftIdx += 1;
	        var differentBody = (body !== sourceBody);
	        if (body && differentBody) {
	          // If the current node is a leaf node (and it is not source body),
	          // calculate the force exerted by the current node on body, and add this
	          // amount to body's net force.
	          dx = body.pos.x - sourceBody.pos.x;
	          dy = body.pos.y - sourceBody.pos.y;
	          r = Math.sqrt(dx * dx + dy * dy);

	          if (r === 0) {
	            // Poor man's protection against zero distance.
	            dx = (random.nextDouble() - 0.5) / 50;
	            dy = (random.nextDouble() - 0.5) / 50;
	            r = Math.sqrt(dx * dx + dy * dy);
	          }

	          // This is standard gravition force calculation but we divide
	          // by r^3 to save two operations when normalizing force vector.
	          v = gravity * body.mass * sourceBody.mass / (r * r * r);
	          fx += v * dx;
	          fy += v * dy;
	        } else if (differentBody) {
	          // Otherwise, calculate the ratio s / r,  where s is the width of the region
	          // represented by the internal node, and r is the distance between the body
	          // and the node's center-of-mass
	          dx = node.massX / node.mass - sourceBody.pos.x;
	          dy = node.massY / node.mass - sourceBody.pos.y;
	          r = Math.sqrt(dx * dx + dy * dy);

	          if (r === 0) {
	            // Sorry about code duplucation. I don't want to create many functions
	            // right away. Just want to see performance first.
	            dx = (random.nextDouble() - 0.5) / 50;
	            dy = (random.nextDouble() - 0.5) / 50;
	            r = Math.sqrt(dx * dx + dy * dy);
	          }
	          // If s / r < θ, treat this internal node as a single body, and calculate the
	          // force it exerts on sourceBody, and add this amount to sourceBody's net force.
	          if ((node.right - node.left) / r < theta) {
	            // in the if statement above we consider node's width only
	            // because the region was squarified during tree creation.
	            // Thus there is no difference between using width or height.
	            v = gravity * node.mass * sourceBody.mass / (r * r * r);
	            fx += v * dx;
	            fy += v * dy;
	          } else {
	            // Otherwise, run the procedure recursively on each of the current node's children.

	            // I intentionally unfolded this loop, to save several CPU cycles.
	            if (node.quad0) {
	              queue[pushIdx] = node.quad0;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad1) {
	              queue[pushIdx] = node.quad1;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad2) {
	              queue[pushIdx] = node.quad2;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad3) {
	              queue[pushIdx] = node.quad3;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	          }
	        }
	      }

	      sourceBody.force.x += fx;
	      sourceBody.force.y += fy;
	    },

	    insertBodies = function(bodies) {
	      var x1 = Number.MAX_VALUE,
	        y1 = Number.MAX_VALUE,
	        x2 = Number.MIN_VALUE,
	        y2 = Number.MIN_VALUE,
	        i,
	        max = bodies.length;

	      // To reduce quad tree depth we are looking for exact bounding box of all particles.
	      i = max;
	      while (i--) {
	        var x = bodies[i].pos.x;
	        var y = bodies[i].pos.y;
	        if (x < x1) {
	          x1 = x;
	        }
	        if (x > x2) {
	          x2 = x;
	        }
	        if (y < y1) {
	          y1 = y;
	        }
	        if (y > y2) {
	          y2 = y;
	        }
	      }

	      // Squarify the bounds.
	      var dx = x2 - x1,
	        dy = y2 - y1;
	      if (dx > dy) {
	        y2 = y1 + dx;
	      } else {
	        x2 = x1 + dy;
	      }

	      currentInCache = 0;
	      root = newNode();
	      root.left = x1;
	      root.right = x2;
	      root.top = y1;
	      root.bottom = y2;

	      i = max - 1;
	      if (i > 0) {
	        root.body = bodies[i];
	      }
	      while (i--) {
	        insert(bodies[i], root);
	      }
	    };

	  return {
	    insertBodies: insertBodies,
	    updateBodyForce: update,
	    options: function(newOptions) {
	      if (newOptions) {
	        if (typeof newOptions.gravity === 'number') {
	          gravity = newOptions.gravity;
	        }
	        if (typeof newOptions.theta === 'number') {
	          theta = newOptions.theta;
	        }

	        return this;
	      }

	      return {
	        gravity: gravity,
	        theta: theta
	      };
	    }
	  };
	};

	function getChild(node, idx) {
	  if (idx === 0) return node.quad0;
	  if (idx === 1) return node.quad1;
	  if (idx === 2) return node.quad2;
	  if (idx === 3) return node.quad3;
	  return null;
	}

	function setChild(node, idx, child) {
	  if (idx === 0) node.quad0 = child;
	  else if (idx === 1) node.quad1 = child;
	  else if (idx === 2) node.quad2 = child;
	  else if (idx === 3) node.quad3 = child;
	}


/***/ }),
/* 35 */
/***/ (function(module, exports) {

	module.exports = {
	  random: random,
	  randomIterator: randomIterator
	};

	/**
	 * Creates seeded PRNG with two methods:
	 *   next() and nextDouble()
	 */
	function random(inputSeed) {
	  var seed = typeof inputSeed === 'number' ? inputSeed : (+ new Date());
	  var randomFunc = function() {
	      // Robert Jenkins' 32 bit integer hash function.
	      seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
	      seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
	      seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
	      seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
	      seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
	      seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
	      return (seed & 0xfffffff) / 0x10000000;
	  };

	  return {
	      /**
	       * Generates random integer number in the range from 0 (inclusive) to maxValue (exclusive)
	       *
	       * @param maxValue Number REQUIRED. Ommitting this number will result in NaN values from PRNG.
	       */
	      next : function (maxValue) {
	          return Math.floor(randomFunc() * maxValue);
	      },

	      /**
	       * Generates random double number in the range from 0 (inclusive) to 1 (exclusive)
	       * This function is the same as Math.random() (except that it could be seeded)
	       */
	      nextDouble : function () {
	          return randomFunc();
	      }
	  };
	}

	/*
	 * Creates iterator over array, which returns items of array in random order
	 * Time complexity is guaranteed to be O(n);
	 */
	function randomIterator(array, customRandom) {
	    var localRandom = customRandom || random();
	    if (typeof localRandom.next !== 'function') {
	      throw new Error('customRandom does not match expected API: next() function is missing');
	    }

	    return {
	        forEach : function (callback) {
	            var i, j, t;
	            for (i = array.length - 1; i > 0; --i) {
	                j = localRandom.next(i + 1); // i inclusive
	                t = array[j];
	                array[j] = array[i];
	                array[i] = t;

	                callback(t);
	            }

	            if (array.length) {
	                callback(array[0]);
	            }
	        },

	        /**
	         * Shuffles array randomly, in place.
	         */
	        shuffle : function () {
	            var i, j, t;
	            for (i = array.length - 1; i > 0; --i) {
	                j = localRandom.next(i + 1); // i inclusive
	                t = array[j];
	                array[j] = array[i];
	                array[i] = t;
	            }

	            return array;
	        }
	    };
	}


/***/ }),
/* 36 */
/***/ (function(module, exports) {

	/**
	 * Internal data structure to represent 2D QuadTree node
	 */
	module.exports = function Node() {
	  // body stored inside this node. In quad tree only leaf nodes (by construction)
	  // contain boides:
	  this.body = null;

	  // Child nodes are stored in quads. Each quad is presented by number:
	  // 0 | 1
	  // -----
	  // 2 | 3
	  this.quad0 = null;
	  this.quad1 = null;
	  this.quad2 = null;
	  this.quad3 = null;

	  // Total mass of current node
	  this.mass = 0;

	  // Center of mass coordinates
	  this.massX = 0;
	  this.massY = 0;

	  // bounding box coordinates
	  this.left = 0;
	  this.top = 0;
	  this.bottom = 0;
	  this.right = 0;
	};


/***/ }),
/* 37 */
/***/ (function(module, exports) {

	module.exports = InsertStack;

	/**
	 * Our implmentation of QuadTree is non-recursive to avoid GC hit
	 * This data structure represent stack of elements
	 * which we are trying to insert into quad tree.
	 */
	function InsertStack () {
	    this.stack = [];
	    this.popIdx = 0;
	}

	InsertStack.prototype = {
	    isEmpty: function() {
	        return this.popIdx === 0;
	    },
	    push: function (node, body) {
	        var item = this.stack[this.popIdx];
	        if (!item) {
	            // we are trying to avoid memory pressue: create new element
	            // only when absolutely necessary
	            this.stack[this.popIdx] = new InsertStackElement(node, body);
	        } else {
	            item.node = node;
	            item.body = body;
	        }
	        ++this.popIdx;
	    },
	    pop: function () {
	        if (this.popIdx > 0) {
	            return this.stack[--this.popIdx];
	        }
	    },
	    reset: function () {
	        this.popIdx = 0;
	    }
	};

	function InsertStackElement(node, body) {
	    this.node = node; // QuadTree node
	    this.body = body; // physical body which needs to be inserted to node
	}


/***/ }),
/* 38 */
/***/ (function(module, exports) {

	module.exports = function isSamePosition(point1, point2) {
	    var dx = Math.abs(point1.x - point2.x);
	    var dy = Math.abs(point1.y - point2.y);

	    return (dx < 1e-8 && dy < 1e-8);
	};


/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = function (bodies, settings) {
	  var random = __webpack_require__(35).random(42);
	  var boundingBox =  { x1: 0, y1: 0, x2: 0, y2: 0 };

	  return {
	    box: boundingBox,

	    update: updateBoundingBox,

	    reset : function () {
	      boundingBox.x1 = boundingBox.y1 = 0;
	      boundingBox.x2 = boundingBox.y2 = 0;
	    },

	    getBestNewPosition: function (neighbors) {
	      var graphRect = boundingBox;

	      var baseX = 0, baseY = 0;

	      if (neighbors.length) {
	        for (var i = 0; i < neighbors.length; ++i) {
	          baseX += neighbors[i].pos.x;
	          baseY += neighbors[i].pos.y;
	        }

	        baseX /= neighbors.length;
	        baseY /= neighbors.length;
	      } else {
	        baseX = (graphRect.x1 + graphRect.x2) / 2;
	        baseY = (graphRect.y1 + graphRect.y2) / 2;
	      }

	      var springLength = settings.springLength;
	      return {
	        x: baseX + random.next(springLength) - springLength / 2,
	        y: baseY + random.next(springLength) - springLength / 2
	      };
	    }
	  };

	  function updateBoundingBox() {
	    var i = bodies.length;
	    if (i === 0) { return; } // don't have to wory here.

	    var x1 = Number.MAX_VALUE,
	        y1 = Number.MAX_VALUE,
	        x2 = Number.MIN_VALUE,
	        y2 = Number.MIN_VALUE;

	    while(i--) {
	      // this is O(n), could it be done faster with quadtree?
	      // how about pinned nodes?
	      var body = bodies[i];
	      if (body.isPinned) {
	        body.pos.x = body.prevPos.x;
	        body.pos.y = body.prevPos.y;
	      } else {
	        body.prevPos.x = body.pos.x;
	        body.prevPos.y = body.pos.y;
	      }
	      if (body.pos.x < x1) {
	        x1 = body.pos.x;
	      }
	      if (body.pos.x > x2) {
	        x2 = body.pos.x;
	      }
	      if (body.pos.y < y1) {
	        y1 = body.pos.y;
	      }
	      if (body.pos.y > y2) {
	        y2 = body.pos.y;
	      }
	    }

	    boundingBox.x1 = x1;
	    boundingBox.x2 = x2;
	    boundingBox.y1 = y1;
	    boundingBox.y2 = y2;
	  }
	}


/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents drag force, which reduces force value on each step by given
	 * coefficient.
	 *
	 * @param {Object} options for the drag force
	 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(32),
	      expose = __webpack_require__(31);

	  options = merge(options, {
	    dragCoeff: 0.02
	  });

	  var api = {
	    update : function (body) {
	      body.force.x -= options.dragCoeff * body.velocity.x;
	      body.force.y -= options.dragCoeff * body.velocity.y;
	    }
	  };

	  // let easy access to dragCoeff:
	  expose(options, api, ['dragCoeff']);

	  return api;
	};


/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents spring force, which updates forces acting on two bodies, conntected
	 * by a spring.
	 *
	 * @param {Object} options for the spring force
	 * @param {Number=} options.springCoeff spring force coefficient.
	 * @param {Number=} options.springLength desired length of a spring at rest.
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(32);
	  var random = __webpack_require__(35).random(42);
	  var expose = __webpack_require__(31);

	  options = merge(options, {
	    springCoeff: 0.0002,
	    springLength: 80
	  });

	  var api = {
	    /**
	     * Upsates forces acting on a spring
	     */
	    update : function (spring) {
	      var body1 = spring.from,
	          body2 = spring.to,
	          length = spring.length < 0 ? options.springLength : spring.length,
	          dx = body2.pos.x - body1.pos.x,
	          dy = body2.pos.y - body1.pos.y,
	          r = Math.sqrt(dx * dx + dy * dy);

	      if (r === 0) {
	          dx = (random.nextDouble() - 0.5) / 50;
	          dy = (random.nextDouble() - 0.5) / 50;
	          r = Math.sqrt(dx * dx + dy * dy);
	      }

	      var d = r - length;
	      var coeff = ((!spring.coeff || spring.coeff < 0) ? options.springCoeff : spring.coeff) * d / r * spring.weight;

	      body1.force.x += coeff * dx;
	      body1.force.y += coeff * dy;

	      body2.force.x -= coeff * dx;
	      body2.force.y -= coeff * dy;
	    }
	  };

	  expose(options, api, ['springCoeff', 'springLength']);
	  return api;
	}


/***/ }),
/* 42 */
/***/ (function(module, exports) {

	/**
	 * Performs forces integration, using given timestep. Uses Euler method to solve
	 * differential equation (http://en.wikipedia.org/wiki/Euler_method ).
	 *
	 * @returns {Number} squared distance of total position updates.
	 */

	module.exports = integrate;

	function integrate(bodies, timeStep) {
	  var dx = 0, tx = 0,
	      dy = 0, ty = 0,
	      i,
	      max = bodies.length;

	  if (max === 0) {
	    return 0;
	  }

	  for (i = 0; i < max; ++i) {
	    var body = bodies[i],
	        coeff = timeStep / body.mass;

	    body.velocity.x += coeff * body.force.x;
	    body.velocity.y += coeff * body.force.y;
	    var vx = body.velocity.x,
	        vy = body.velocity.y,
	        v = Math.sqrt(vx * vx + vy * vy);

	    if (v > 1) {
	      body.velocity.x = vx / v;
	      body.velocity.y = vy / v;
	    }

	    dx = timeStep * body.velocity.x;
	    dy = timeStep * body.velocity.y;

	    body.pos.x += dx;
	    body.pos.y += dy;

	    tx += Math.abs(dx); ty += Math.abs(dy);
	  }

	  return (tx * tx + ty * ty)/max;
	}


/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

	var physics = __webpack_require__(44);

	module.exports = function(pos) {
	  return new physics.Body(pos);
	}


/***/ }),
/* 44 */
/***/ (function(module, exports) {

	module.exports = {
	  Body: Body,
	  Vector2d: Vector2d,
	  Body3d: Body3d,
	  Vector3d: Vector3d
	};

	function Body(x, y) {
	  this.pos = new Vector2d(x, y);
	  this.prevPos = new Vector2d(x, y);
	  this.force = new Vector2d();
	  this.velocity = new Vector2d();
	  this.mass = 1;
	}

	Body.prototype.setPosition = function (x, y) {
	  this.prevPos.x = this.pos.x = x;
	  this.prevPos.y = this.pos.y = y;
	};

	function Vector2d(x, y) {
	  if (x && typeof x !== 'number') {
	    // could be another vector
	    this.x = typeof x.x === 'number' ? x.x : 0;
	    this.y = typeof x.y === 'number' ? x.y : 0;
	  } else {
	    this.x = typeof x === 'number' ? x : 0;
	    this.y = typeof y === 'number' ? y : 0;
	  }
	}

	Vector2d.prototype.reset = function () {
	  this.x = this.y = 0;
	};

	function Body3d(x, y, z) {
	  this.pos = new Vector3d(x, y, z);
	  this.prevPos = new Vector3d(x, y, z);
	  this.force = new Vector3d();
	  this.velocity = new Vector3d();
	  this.mass = 1;
	}

	Body3d.prototype.setPosition = function (x, y, z) {
	  this.prevPos.x = this.pos.x = x;
	  this.prevPos.y = this.pos.y = y;
	  this.prevPos.z = this.pos.z = z;
	};

	function Vector3d(x, y, z) {
	  if (x && typeof x !== 'number') {
	    // could be another vector
	    this.x = typeof x.x === 'number' ? x.x : 0;
	    this.y = typeof x.y === 'number' ? x.y : 0;
	    this.z = typeof x.z === 'number' ? x.z : 0;
	  } else {
	    this.x = typeof x === 'number' ? x : 0;
	    this.y = typeof y === 'number' ? y : 0;
	    this.z = typeof z === 'number' ? z : 0;
	  }
	};

	Vector3d.prototype.reset = function () {
	  this.x = this.y = this.z = 0;
	};


/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * This is Barnes Hut simulation algorithm for 3d case. Implementation
	 * is highly optimized (avoids recusion and gc pressure)
	 *
	 * http://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html
	 *
	 * NOTE: This module duplicates a lot of code from 2d case. Primary reason for
	 * this is performance. Every time I tried to abstract away vector operations
	 * I had negative impact on performance. So in this case I'm scarifying code
	 * reuse in favor of speed
	 */

	module.exports = function(options) {
	  options = options || {};
	  options.gravity = typeof options.gravity === 'number' ? options.gravity : -1;
	  options.theta = typeof options.theta === 'number' ? options.theta : 0.8;

	  // we require deterministic randomness here
	  var random = __webpack_require__(35).random(1984),
	    Node = __webpack_require__(46),
	    InsertStack = __webpack_require__(47),
	    isSamePosition = __webpack_require__(48);

	  var gravity = options.gravity,
	    updateQueue = [],
	    insertStack = new InsertStack(),
	    theta = options.theta,

	    nodesCache = [],
	    currentInCache = 0,
	    newNode = function() {
	      // To avoid pressure on GC we reuse nodes.
	      var node = nodesCache[currentInCache];
	      if (node) {
	        node.quad0 = null;
	        node.quad4 = null;
	        node.quad1 = null;
	        node.quad5 = null;
	        node.quad2 = null;
	        node.quad6 = null;
	        node.quad3 = null;
	        node.quad7 = null;
	        node.body = null;
	        node.mass = node.massX = node.massY = node.massZ = 0;
	        node.left = node.right = node.top = node.bottom = node.front = node.back = 0;
	      } else {
	        node = new Node();
	        nodesCache[currentInCache] = node;
	      }

	      ++currentInCache;
	      return node;
	    },

	    root = newNode(),

	    // Inserts body to the tree
	    insert = function(newBody) {
	      insertStack.reset();
	      insertStack.push(root, newBody);

	      while (!insertStack.isEmpty()) {
	        var stackItem = insertStack.pop(),
	          node = stackItem.node,
	          body = stackItem.body;

	        if (!node.body) {
	          // This is internal node. Update the total mass of the node and center-of-mass.
	          var x = body.pos.x;
	          var y = body.pos.y;
	          var z = body.pos.z;
	          node.mass += body.mass;
	          node.massX += body.mass * x;
	          node.massY += body.mass * y;
	          node.massZ += body.mass * z;

	          // Recursively insert the body in the appropriate quadrant.
	          // But first find the appropriate quadrant.
	          var quadIdx = 0, // Assume we are in the 0's quad.
	            left = node.left,
	            right = (node.right + left) / 2,
	            top = node.top,
	            bottom = (node.bottom + top) / 2,
	            back = node.back,
	            front = (node.front + back) / 2;

	          if (x > right) { // somewhere in the eastern part.
	            quadIdx += 1;
	            var oldLeft = left;
	            left = right;
	            right = right + (right - oldLeft);
	          }
	          if (y > bottom) { // and in south.
	            quadIdx += 2;
	            var oldTop = top;
	            top = bottom;
	            bottom = bottom + (bottom - oldTop);
	          }
	          if (z > front) { // and in frontal part
	            quadIdx += 4;
	            var oldBack = back;
	            back = front;
	            front = back + (back - oldBack);
	          }

	          var child = getChild(node, quadIdx);
	          if (!child) {
	            // The node is internal but this quadrant is not taken. Add subnode to it.
	            child = newNode();
	            child.left = left;
	            child.top = top;
	            child.right = right;
	            child.bottom = bottom;
	            child.back = back;
	            child.front = front;
	            child.body = body;

	            setChild(node, quadIdx, child);
	          } else {
	            // continue searching in this quadrant.
	            insertStack.push(child, body);
	          }
	        } else {
	          // We are trying to add to the leaf node.
	          // We have to convert current leaf into internal node
	          // and continue adding two nodes.
	          var oldBody = node.body;
	          node.body = null; // internal nodes do not carry bodies

	          if (isSamePosition(oldBody.pos, body.pos)) {
	            // Prevent infinite subdivision by bumping one node
	            // anywhere in this quadrant
	            var retriesCount = 3;
	            do {
	              var offset = random.nextDouble();
	              var dx = (node.right - node.left) * offset;
	              var dy = (node.bottom - node.top) * offset;
	              var dz = (node.front - node.back) * offset;

	              oldBody.pos.x = node.left + dx;
	              oldBody.pos.y = node.top + dy;
	              oldBody.pos.z = node.back + dz;
	              retriesCount -= 1;
	              // Make sure we don't bump it out of the box. If we do, next iteration should fix it
	            } while (retriesCount > 0 && isSamePosition(oldBody.pos, body.pos));

	            if (retriesCount === 0 && isSamePosition(oldBody.pos, body.pos)) {
	              // This is very bad, we ran out of precision.
	              // if we do not return from the method we'll get into
	              // infinite loop here. So we sacrifice correctness of layout, and keep the app running
	              // Next layout iteration should get larger bounding box in the first step and fix this
	              return;
	            }
	          }
	          // Next iteration should subdivide node further.
	          insertStack.push(node, oldBody);
	          insertStack.push(node, body);
	        }
	      }
	    },

	    update = function(sourceBody) {
	      var queue = updateQueue,
	        v,
	        dx, dy, dz,
	        r, fx = 0,
	        fy = 0,
	        fz = 0,
	        queueLength = 1,
	        shiftIdx = 0,
	        pushIdx = 1;

	      queue[0] = root;

	      while (queueLength) {
	        var node = queue[shiftIdx],
	          body = node.body;

	        queueLength -= 1;
	        shiftIdx += 1;
	        var differentBody = (body !== sourceBody);
	        if (body && differentBody) {
	          // If the current node is a leaf node (and it is not source body),
	          // calculate the force exerted by the current node on body, and add this
	          // amount to body's net force.
	          dx = body.pos.x - sourceBody.pos.x;
	          dy = body.pos.y - sourceBody.pos.y;
	          dz = body.pos.z - sourceBody.pos.z;
	          r = Math.sqrt(dx * dx + dy * dy + dz * dz);

	          if (r === 0) {
	            // Poor man's protection against zero distance.
	            dx = (random.nextDouble() - 0.5) / 50;
	            dy = (random.nextDouble() - 0.5) / 50;
	            dz = (random.nextDouble() - 0.5) / 50;
	            r = Math.sqrt(dx * dx + dy * dy + dz * dz);
	          }

	          // This is standard gravitation force calculation but we divide
	          // by r^3 to save two operations when normalizing force vector.
	          v = gravity * body.mass * sourceBody.mass / (r * r * r);
	          fx += v * dx;
	          fy += v * dy;
	          fz += v * dz;
	        } else if (differentBody) {
	          // Otherwise, calculate the ratio s / r,  where s is the width of the region
	          // represented by the internal node, and r is the distance between the body
	          // and the node's center-of-mass
	          dx = node.massX / node.mass - sourceBody.pos.x;
	          dy = node.massY / node.mass - sourceBody.pos.y;
	          dz = node.massZ / node.mass - sourceBody.pos.z;

	          r = Math.sqrt(dx * dx + dy * dy + dz * dz);

	          if (r === 0) {
	            // Sorry about code duplication. I don't want to create many functions
	            // right away. Just want to see performance first.
	            dx = (random.nextDouble() - 0.5) / 50;
	            dy = (random.nextDouble() - 0.5) / 50;
	            dz = (random.nextDouble() - 0.5) / 50;
	            r = Math.sqrt(dx * dx + dy * dy + dz * dz);
	          }

	          // If s / r < θ, treat this internal node as a single body, and calculate the
	          // force it exerts on sourceBody, and add this amount to sourceBody's net force.
	          if ((node.right - node.left) / r < theta) {
	            // in the if statement above we consider node's width only
	            // because the region was squarified during tree creation.
	            // Thus there is no difference between using width or height.
	            v = gravity * node.mass * sourceBody.mass / (r * r * r);
	            fx += v * dx;
	            fy += v * dy;
	            fz += v * dz;
	          } else {
	            // Otherwise, run the procedure recursively on each of the current node's children.

	            // I intentionally unfolded this loop, to save several CPU cycles.
	            if (node.quad0) {
	              queue[pushIdx] = node.quad0;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad1) {
	              queue[pushIdx] = node.quad1;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad2) {
	              queue[pushIdx] = node.quad2;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad3) {
	              queue[pushIdx] = node.quad3;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad4) {
	              queue[pushIdx] = node.quad4;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad5) {
	              queue[pushIdx] = node.quad5;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad6) {
	              queue[pushIdx] = node.quad6;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad7) {
	              queue[pushIdx] = node.quad7;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	          }
	        }
	      }

	      sourceBody.force.x += fx;
	      sourceBody.force.y += fy;
	      sourceBody.force.z += fz;
	    },

	    insertBodies = function(bodies) {
	      var x1 = Number.MAX_VALUE,
	        y1 = Number.MAX_VALUE,
	        z1 = Number.MAX_VALUE,
	        x2 = Number.MIN_VALUE,
	        y2 = Number.MIN_VALUE,
	        z2 = Number.MIN_VALUE,
	        i,
	        max = bodies.length;

	      // To reduce quad tree depth we are looking for exact bounding box of all particles.
	      i = max;
	      while (i--) {
	        var pos = bodies[i].pos;
	        var x = pos.x;
	        var y = pos.y;
	        var z = pos.z;
	        if (x < x1) {
	          x1 = x;
	        }
	        if (x > x2) {
	          x2 = x;
	        }
	        if (y < y1) {
	          y1 = y;
	        }
	        if (y > y2) {
	          y2 = y;
	        }
	        if (z < z1) {
	          z1 = z;
	        }
	        if (z > z2) {
	          z2 = z;
	        }
	      }

	      // Squarify the bounds.
	      var maxSide = Math.max(x2 - x1, Math.max(y2 - y1, z2 - z1));

	      x2 = x1 + maxSide;
	      y2 = y1 + maxSide;
	      z2 = z1 + maxSide;

	      currentInCache = 0;
	      root = newNode();
	      root.left = x1;
	      root.right = x2;
	      root.top = y1;
	      root.bottom = y2;
	      root.back = z1;
	      root.front = z2;

	      i = max - 1;
	      if (i > 0) {
	        root.body = bodies[i];
	      }
	      while (i--) {
	        insert(bodies[i], root);
	      }
	    };

	  return {
	    insertBodies: insertBodies,
	    updateBodyForce: update,
	    options: function(newOptions) {
	      if (newOptions) {
	        if (typeof newOptions.gravity === 'number') {
	          gravity = newOptions.gravity;
	        }
	        if (typeof newOptions.theta === 'number') {
	          theta = newOptions.theta;
	        }

	        return this;
	      }

	      return {
	        gravity: gravity,
	        theta: theta
	      };
	    }
	  };
	};

	function getChild(node, idx) {
	  if (idx === 0) return node.quad0;
	  if (idx === 1) return node.quad1;
	  if (idx === 2) return node.quad2;
	  if (idx === 3) return node.quad3;
	  if (idx === 4) return node.quad4;
	  if (idx === 5) return node.quad5;
	  if (idx === 6) return node.quad6;
	  if (idx === 7) return node.quad7;
	  return null;
	}

	function setChild(node, idx, child) {
	  if (idx === 0) node.quad0 = child;
	  else if (idx === 1) node.quad1 = child;
	  else if (idx === 2) node.quad2 = child;
	  else if (idx === 3) node.quad3 = child;
	  else if (idx === 4) node.quad4 = child;
	  else if (idx === 5) node.quad5 = child;
	  else if (idx === 6) node.quad6 = child;
	  else if (idx === 7) node.quad7 = child;
	}


/***/ }),
/* 46 */
/***/ (function(module, exports) {

	/**
	 * Internal data structure to represent 3D QuadTree node
	 */
	module.exports = function Node() {
	  // body stored inside this node. In quad tree only leaf nodes (by construction)
	  // contain boides:
	  this.body = null;

	  // Child nodes are stored in quads. Each quad is presented by number:
	  // Behind Z median:
	  // 0 | 1
	  // -----
	  // 2 | 3
	  // In front of Z median:
	  // 4 | 5
	  // -----
	  // 6 | 7
	  this.quad0 = null;
	  this.quad1 = null;
	  this.quad2 = null;
	  this.quad3 = null;
	  this.quad4 = null;
	  this.quad5 = null;
	  this.quad6 = null;
	  this.quad7 = null;

	  // Total mass of current node
	  this.mass = 0;

	  // Center of mass coordinates
	  this.massX = 0;
	  this.massY = 0;
	  this.massZ = 0;

	  // bounding box coordinates
	  this.left = 0;
	  this.top = 0;
	  this.bottom = 0;
	  this.right = 0;
	  this.front = 0;
	  this.back = 0;
	};


/***/ }),
/* 47 */
/***/ (function(module, exports) {

	module.exports = InsertStack;

	/**
	 * Our implementation of QuadTree is non-recursive to avoid GC hit
	 * This data structure represent stack of elements
	 * which we are trying to insert into quad tree.
	 */
	function InsertStack () {
	    this.stack = [];
	    this.popIdx = 0;
	}

	InsertStack.prototype = {
	    isEmpty: function() {
	        return this.popIdx === 0;
	    },
	    push: function (node, body) {
	        var item = this.stack[this.popIdx];
	        if (!item) {
	            // we are trying to avoid memory pressure: create new element
	            // only when absolutely necessary
	            this.stack[this.popIdx] = new InsertStackElement(node, body);
	        } else {
	            item.node = node;
	            item.body = body;
	        }
	        ++this.popIdx;
	    },
	    pop: function () {
	        if (this.popIdx > 0) {
	            return this.stack[--this.popIdx];
	        }
	    },
	    reset: function () {
	        this.popIdx = 0;
	    }
	};

	function InsertStackElement(node, body) {
	    this.node = node; // QuadTree node
	    this.body = body; // physical body which needs to be inserted to node
	}


/***/ }),
/* 48 */
/***/ (function(module, exports) {

	module.exports = function isSamePosition(point1, point2) {
	    var dx = Math.abs(point1.x - point2.x);
	    var dy = Math.abs(point1.y - point2.y);
	    var dz = Math.abs(point1.z - point2.z);

	    return (dx < 1e-8 && dy < 1e-8 && dz < 1e-8);
	};


/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = function (bodies, settings) {
	  var random = __webpack_require__(35).random(42);
	  var boundingBox =  { x1: 0, y1: 0, z1: 0, x2: 0, y2: 0, z2: 0 };

	  return {
	    box: boundingBox,

	    update: updateBoundingBox,

	    reset : function () {
	      boundingBox.x1 = boundingBox.y1 = 0;
	      boundingBox.x2 = boundingBox.y2 = 0;
	      boundingBox.z1 = boundingBox.z2 = 0;
	    },

	    getBestNewPosition: function (neighbors) {
	      var graphRect = boundingBox;

	      var baseX = 0, baseY = 0, baseZ = 0;

	      if (neighbors.length) {
	        for (var i = 0; i < neighbors.length; ++i) {
	          baseX += neighbors[i].pos.x;
	          baseY += neighbors[i].pos.y;
	          baseZ += neighbors[i].pos.z;
	        }

	        baseX /= neighbors.length;
	        baseY /= neighbors.length;
	        baseZ /= neighbors.length;
	      } else {
	        baseX = (graphRect.x1 + graphRect.x2) / 2;
	        baseY = (graphRect.y1 + graphRect.y2) / 2;
	        baseZ = (graphRect.z1 + graphRect.z2) / 2;
	      }

	      var springLength = settings.springLength;
	      return {
	        x: baseX + random.next(springLength) - springLength / 2,
	        y: baseY + random.next(springLength) - springLength / 2,
	        z: baseZ + random.next(springLength) - springLength / 2
	      };
	    }
	  };

	  function updateBoundingBox() {
	    var i = bodies.length;
	    if (i === 0) { return; } // don't have to wory here.

	    var x1 = Number.MAX_VALUE,
	        y1 = Number.MAX_VALUE,
	        z1 = Number.MAX_VALUE,
	        x2 = Number.MIN_VALUE,
	        y2 = Number.MIN_VALUE,
	        z2 = Number.MIN_VALUE;

	    while(i--) {
	      // this is O(n), could it be done faster with quadtree?
	      // how about pinned nodes?
	      var body = bodies[i];
	      if (body.isPinned) {
	        body.pos.x = body.prevPos.x;
	        body.pos.y = body.prevPos.y;
	        body.pos.z = body.prevPos.z;
	      } else {
	        body.prevPos.x = body.pos.x;
	        body.prevPos.y = body.pos.y;
	        body.prevPos.z = body.pos.z;
	      }
	      if (body.pos.x < x1) {
	        x1 = body.pos.x;
	      }
	      if (body.pos.x > x2) {
	        x2 = body.pos.x;
	      }
	      if (body.pos.y < y1) {
	        y1 = body.pos.y;
	      }
	      if (body.pos.y > y2) {
	        y2 = body.pos.y;
	      }
	      if (body.pos.z < z1) {
	        z1 = body.pos.z;
	      }
	      if (body.pos.z > z2) {
	        z2 = body.pos.z;
	      }
	    }

	    boundingBox.x1 = x1;
	    boundingBox.x2 = x2;
	    boundingBox.y1 = y1;
	    boundingBox.y2 = y2;
	    boundingBox.z1 = z1;
	    boundingBox.z2 = z2;
	  }
	};


/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents 3d drag force, which reduces force value on each step by given
	 * coefficient.
	 *
	 * @param {Object} options for the drag force
	 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(32),
	      expose = __webpack_require__(31);

	  options = merge(options, {
	    dragCoeff: 0.02
	  });

	  var api = {
	    update : function (body) {
	      body.force.x -= options.dragCoeff * body.velocity.x;
	      body.force.y -= options.dragCoeff * body.velocity.y;
	      body.force.z -= options.dragCoeff * body.velocity.z;
	    }
	  };

	  // let easy access to dragCoeff:
	  expose(options, api, ['dragCoeff']);

	  return api;
	};


/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents 3d spring force, which updates forces acting on two bodies, conntected
	 * by a spring.
	 *
	 * @param {Object} options for the spring force
	 * @param {Number=} options.springCoeff spring force coefficient.
	 * @param {Number=} options.springLength desired length of a spring at rest.
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(32);
	  var random = __webpack_require__(35).random(42);
	  var expose = __webpack_require__(31);

	  options = merge(options, {
	    springCoeff: 0.0002,
	    springLength: 80
	  });

	  var api = {
	    /**
	     * Upsates forces acting on a spring
	     */
	    update : function (spring) {
	      var body1 = spring.from,
	          body2 = spring.to,
	          length = spring.length < 0 ? options.springLength : spring.length,
	          dx = body2.pos.x - body1.pos.x,
	          dy = body2.pos.y - body1.pos.y,
	          dz = body2.pos.z - body1.pos.z,
	          r = Math.sqrt(dx * dx + dy * dy + dz * dz);

	      if (r === 0) {
	          dx = (random.nextDouble() - 0.5) / 50;
	          dy = (random.nextDouble() - 0.5) / 50;
	          dz = (random.nextDouble() - 0.5) / 50;
	          r = Math.sqrt(dx * dx + dy * dy + dz * dz);
	      }

	      var d = r - length;
	      var coeff = ((!spring.coeff || spring.coeff < 0) ? options.springCoeff : spring.coeff) * d / r * spring.weight;

	      body1.force.x += coeff * dx;
	      body1.force.y += coeff * dy;
	      body1.force.z += coeff * dz;

	      body2.force.x -= coeff * dx;
	      body2.force.y -= coeff * dy;
	      body2.force.z -= coeff * dz;
	    }
	  };

	  expose(options, api, ['springCoeff', 'springLength']);
	  return api;
	}


/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

	var physics = __webpack_require__(44);

	module.exports = function(pos) {
	  return new physics.Body3d(pos);
	}


/***/ }),
/* 53 */
/***/ (function(module, exports) {

	module.exports = integrate;

	function integrate(bodies, timeStep) {
	  var tx = 0, ty = 0, tz = 0,
	      i, max = bodies.length;

	  for (i = 0; i < max; ++i) {
	    var body = bodies[i],
	      coeff = timeStep * timeStep / body.mass;

	    body.pos.x = 2 * body.pos.x - body.prevPos.x + body.force.x * coeff;
	    body.pos.y = 2 * body.pos.y - body.prevPos.y + body.force.y * coeff;
	    body.pos.z = 2 * body.pos.z - body.prevPos.z + body.force.z * coeff;

	    tx += Math.abs(body.pos.x - body.prevPos.x)
	    ty += Math.abs(body.pos.y - body.prevPos.y)
	    tz += Math.abs(body.pos.z - body.prevPos.z)
	  }

	  return (tx * tx + ty * ty + tz * tz)/bodies.length;
	}


/***/ }),
/* 54 */
/***/ (function(module, exports) {

	/**
	 * Performs 3d forces integration, using given timestep. Uses Euler method to solve
	 * differential equation (http://en.wikipedia.org/wiki/Euler_method ).
	 *
	 * @returns {Number} squared distance of total position updates.
	 */

	module.exports = integrate;

	function integrate(bodies, timeStep) {
	  var dx = 0, tx = 0,
	      dy = 0, ty = 0,
	      dz = 0, tz = 0,
	      i,
	      max = bodies.length;

	  for (i = 0; i < max; ++i) {
	    var body = bodies[i],
	        coeff = timeStep / body.mass;

	    body.velocity.x += coeff * body.force.x;
	    body.velocity.y += coeff * body.force.y;
	    body.velocity.z += coeff * body.force.z;

	    var vx = body.velocity.x,
	        vy = body.velocity.y,
	        vz = body.velocity.z,
	        v = Math.sqrt(vx * vx + vy * vy + vz * vz);

	    if (v > 1) {
	      body.velocity.x = vx / v;
	      body.velocity.y = vy / v;
	      body.velocity.z = vz / v;
	    }

	    dx = timeStep * body.velocity.x;
	    dy = timeStep * body.velocity.y;
	    dz = timeStep * body.velocity.z;

	    body.pos.x += dx;
	    body.pos.y += dy;
	    body.pos.z += dz;

	    tx += Math.abs(dx); ty += Math.abs(dy); tz += Math.abs(dz);
	  }

	  return (tx * tx + ty * ty + tz * tz)/bodies.length;
	}


/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

	/*! qwest 4.4.5 (https://github.com/pyrsmk/qwest) */

	module.exports = function() {

		var global = typeof window != 'undefined' ? window : self,
			pinkyswear = __webpack_require__(56),
			jparam = __webpack_require__(61),
			defaultOptions = {},
			// Default response type for XDR in auto mode
			defaultXdrResponseType = 'json',
			// Default data type
			defaultDataType = 'post',
			// Variables for limit mechanism
			limit = null,
			requests = 0,
			request_stack = [],
			// Get XMLHttpRequest object
			getXHR = global.XMLHttpRequest? function(){
				return new global.XMLHttpRequest();
			}: function(){
				return new ActiveXObject('Microsoft.XMLHTTP');
			},
			// Guess XHR version
			xhr2 = (getXHR().responseType===''),

		// Core function
		qwest = function(method, url, data, options, before) {
			// Format
			method = method.toUpperCase();
			data = data || null;
			options = options || {};
			for(var name in defaultOptions) {
				if(!(name in options)) {
					if(typeof defaultOptions[name] == 'object' && typeof options[name] == 'object') {
						for(var name2 in defaultOptions[name]) {
							options[name][name2] = defaultOptions[name][name2];
						}
					}
					else {
						options[name] = defaultOptions[name];
					}
				}
			}

			// Define variables
			var nativeResponseParsing = false,
				crossOrigin,
				xhr,
				xdr = false,
				timeout,
				aborted = false,
				attempts = 0,
				headers = {},
				mimeTypes = {
					text: '*/*',
					xml: 'text/xml',
					json: 'application/json',
					post: 'application/x-www-form-urlencoded',
					document: 'text/html'
				},
				accept = {
					text: '*/*',
					xml: 'application/xml; q=1.0, text/xml; q=0.8, */*; q=0.1',
					json: 'application/json; q=1.0, text/*; q=0.8, */*; q=0.1'
				},
				i, j,
				response,
				sending = false,

			// Create the promise
			promise = pinkyswear(function(pinky) {
				pinky.abort = function() {
					if(!aborted) {
						if(xhr && xhr.readyState != 4) { // https://stackoverflow.com/questions/7287706/ie-9-javascript-error-c00c023f
							xhr.abort();
						}
						if(sending) {
							--requests;
							sending = false;
						}
						aborted = true;
					}
				};
				pinky.send = function() {
					// Prevent further send() calls
					if(sending) {
						return;
					}
					// Reached request limit, get out!
					if(requests == limit) {
						request_stack.push(pinky);
						return;
					}
					// Verify if the request has not been previously aborted
					if(aborted) {
						if(request_stack.length) {
							request_stack.shift().send();
						}
						return;
					}
					// The sending is running
					++requests;
					sending = true;
					// Get XHR object
					xhr = getXHR();
					if(crossOrigin) {
						if(!('withCredentials' in xhr) && global.XDomainRequest) {
							xhr = new XDomainRequest(); // CORS with IE8/9
							xdr = true;
							if(method != 'GET' && method != 'POST') {
								method = 'POST';
							}
						}
					}
					// Open connection
					if(xdr) {
						xhr.open(method, url);
					}
					else {
						xhr.open(method, url, options.async, options.user, options.password);
						if(xhr2 && options.async) {
							xhr.withCredentials = options.withCredentials;
						}
					}
					// Set headers
					if(!xdr) {
						for(var i in headers) {
							if(headers[i]) {
								xhr.setRequestHeader(i, headers[i]);
							}
						}
					}
					// Verify if the response type is supported by the current browser
					if(xhr2 && options.responseType != 'auto') {
						try {
							xhr.responseType = options.responseType;
							nativeResponseParsing = (xhr.responseType == options.responseType);
						}
						catch(e) {}
					}
					// Plug response handler
					if(xhr2 || xdr) {
						xhr.onload = handleResponse;
						xhr.onerror = handleError;
						// http://cypressnorth.com/programming/internet-explorer-aborting-ajax-requests-fixed/
						if(xdr) {
							xhr.onprogress = function() {};
						}
					}
					else {
						xhr.onreadystatechange = function() {
							if(xhr.readyState == 4) {
								handleResponse();
							}
						};
					}
					// Plug timeout
					if(options.async) {
						if('timeout' in xhr) {
							xhr.timeout = options.timeout;
							xhr.ontimeout = handleTimeout;
						}
						else {
							timeout = setTimeout(handleTimeout, options.timeout);
						}
					}
					// http://cypressnorth.com/programming/internet-explorer-aborting-ajax-requests-fixed/
					else if(xdr) {
						xhr.ontimeout = function() {};
					}
					// Override mime type to ensure the response is well parsed
					if(options.responseType != 'auto' && 'overrideMimeType' in xhr) {
						xhr.overrideMimeType(mimeTypes[options.responseType]);
					}
					// Run 'before' callback
					if(before) {
						before(xhr);
					}
					// Send request
					if(xdr) {
						// https://developer.mozilla.org/en-US/docs/Web/API/XDomainRequest
						setTimeout(function() {
							xhr.send(method != 'GET'? data : null);
						}, 0);
					}
					else {
						xhr.send(method != 'GET' ? data : null);
					}
				};
				return pinky;
			}),

			// Handle the response
			handleResponse = function() {
				var i, responseType;
				// Stop sending state
				sending = false;
				clearTimeout(timeout);
				// Launch next stacked request
				if(request_stack.length) {
					request_stack.shift().send();
				}
				// Verify if the request has not been previously aborted
				if(aborted) {
					return;
				}
				// Decrease the number of requests
				--requests;
				// Handle response
				try{
					// Process response
					if(nativeResponseParsing) {
						if('response' in xhr && xhr.response === null) {
							throw 'The request response is empty';
						}
						response = xhr.response;
					}
					else {
						// Guess response type
						responseType = options.responseType;
						if(responseType == 'auto') {
							if(xdr) {
								responseType = defaultXdrResponseType;
							}
							else {
								var ct = xhr.getResponseHeader('Content-Type') || '';
								if(ct.indexOf(mimeTypes.json)>-1) {
									responseType = 'json';
								}
								else if(ct.indexOf(mimeTypes.xml) > -1) {
									responseType = 'xml';
								}
								else {
									responseType = 'text';
								}
							}
						}
						// Handle response type
						switch(responseType) {
							case 'json':
								if(xhr.responseText.length) {
									try {
										if('JSON' in global) {
											response = JSON.parse(xhr.responseText);
										}
										else {
											response = new Function('return (' + xhr.responseText + ')')();
										}
									}
									catch(e) {
										throw "Error while parsing JSON body : "+e;
									}
								}
								break;
							case 'xml':
								// Based on jQuery's parseXML() function
								try {
									// Standard
									if(global.DOMParser) {
										response = (new DOMParser()).parseFromString(xhr.responseText,'text/xml');
									}
									// IE<9
									else {
										response = new ActiveXObject('Microsoft.XMLDOM');
										response.async = 'false';
										response.loadXML(xhr.responseText);
									}
								}
								catch(e) {
									response = undefined;
								}
								if(!response || !response.documentElement || response.getElementsByTagName('parsererror').length) {
									throw 'Invalid XML';
								}
								break;
							default:
								response = xhr.responseText;
						}
					}
					// Late status code verification to allow passing data when, per example, a 409 is returned
					// --- https://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
					if('status' in xhr && !/^2|1223/.test(xhr.status)) {
						throw xhr.status + ' (' + xhr.statusText + ')';
					}
					// Fulfilled
					promise(true, [xhr, response]);
				}
				catch(e) {
					// Rejected
					promise(false, [e, xhr, response]);
				}
			},

			// Handle errors
			handleError = function(message) {
				if(!aborted) {
					message = typeof message == 'string' ? message : 'Connection aborted';
					promise.abort();
					promise(false, [new Error(message), xhr, null]);
				}
			},

			// Handle timeouts
			handleTimeout = function() {
				if(!aborted) {
					if(!options.attempts || ++attempts != options.attempts) {
						xhr.abort();
						sending = false;
						promise.send();
					}
					else {
						handleError('Timeout (' + url + ')');
					}
				}
			};

			// Normalize options
			options.async = 'async' in options ? !!options.async : true;
			options.cache = 'cache' in options ? !!options.cache : false;
			options.dataType = 'dataType' in options ? options.dataType.toLowerCase() : defaultDataType;
			options.responseType = 'responseType' in options ? options.responseType.toLowerCase() : 'auto';
			options.user = options.user || '';
			options.password = options.password || '';
			options.withCredentials = !!options.withCredentials;
			options.timeout = 'timeout' in options ? parseInt(options.timeout, 10) : 30000;
			options.attempts = 'attempts' in options ? parseInt(options.attempts, 10) : 1;

			// Guess if we're dealing with a cross-origin request
			i = url.match(/\/\/(.+?)\//);
			crossOrigin = i && (i[1] ? i[1] != location.host : false);

			// Prepare data
			if('ArrayBuffer' in global && data instanceof ArrayBuffer) {
				options.dataType = 'arraybuffer';
			}
			else if('Blob' in global && data instanceof Blob) {
				options.dataType = 'blob';
			}
			else if('Document' in global && data instanceof Document) {
				options.dataType = 'document';
			}
			else if('FormData' in global && data instanceof FormData) {
				options.dataType = 'formdata';
			}
			if(data !== null) {
				switch(options.dataType) {
					case 'json':
						data = JSON.stringify(data);
						break;
					case 'post':
						data = jparam(data);
				}
			}

			// Prepare headers
			if(options.headers) {
				var format = function(match,p1,p2) {
					return p1 + p2.toUpperCase();
				};
				for(i in options.headers) {
					headers[i.replace(/(^|-)([^-])/g,format)] = options.headers[i];
				}
			}
			if(!('Content-Type' in headers) && method!='GET') {
				if(options.dataType in mimeTypes) {
					if(mimeTypes[options.dataType]) {
						headers['Content-Type'] = mimeTypes[options.dataType];
					}
				}
			}
			if(!headers.Accept) {
				headers.Accept = (options.responseType in accept) ? accept[options.responseType] : '*/*';
			}
			if(!crossOrigin && !('X-Requested-With' in headers)) { // (that header breaks in legacy browsers with CORS)
				headers['X-Requested-With'] = 'XMLHttpRequest';
			}
			if(!options.cache && !('Cache-Control' in headers)) {
				headers['Cache-Control'] = 'no-cache';
			}

			// Prepare URL
			if(method == 'GET' && data && typeof data == 'string') {
				url += (/\?/.test(url)?'&':'?') + data;
			}

			// Start the request
			if(options.async) {
				promise.send();
			}

			// Return promise
			return promise;

		};

		// Define external qwest object
		var getNewPromise = function(q) {
				// Prepare
				var promises = [],
					loading = 0,
					values = [];
				// Create a new promise to handle all requests
				return pinkyswear(function(pinky) {
					// Basic request method
					var method_index = -1,
						createMethod = function(method) {
							return function(url, data, options, before) {
								var index = ++method_index;
								++loading;
								promises.push(qwest(method, pinky.base + url, data, options, before).then(function(xhr, response) {
									values[index] = arguments;
									if(!--loading) {
										pinky(true, values.length == 1 ? values[0] : [values]);
									}
								}, function() {
									pinky(false, arguments);
								}));
								return pinky;
							};
						};
					// Define external API
					pinky.get = createMethod('GET');
					pinky.post = createMethod('POST');
					pinky.put = createMethod('PUT');
					pinky['delete'] = createMethod('DELETE');
					pinky['catch'] = function(f) {
						return pinky.then(null, f);
					};
					pinky.complete = function(f) {
						var func = function() {
							f(); // otherwise arguments will be passed to the callback
						};
						return pinky.then(func, func);
					};
					pinky.map = function(type, url, data, options, before) {
						return createMethod(type.toUpperCase()).call(this, url, data, options, before);
					};
					// Populate methods from external object
					for(var prop in q) {
						if(!(prop in pinky)) {
							pinky[prop] = q[prop];
						}
					}
					// Set last methods
					pinky.send = function() {
						for(var i=0, j=promises.length; i<j; ++i) {
							promises[i].send();
						}
						return pinky;
					};
					pinky.abort = function() {
						for(var i=0, j=promises.length; i<j; ++i) {
							promises[i].abort();
						}
						return pinky;
					};
					return pinky;
				});
			},
			q = {
				base: '',
				get: function() {
					return getNewPromise(q).get.apply(this, arguments);
				},
				post: function() {
					return getNewPromise(q).post.apply(this, arguments);
				},
				put: function() {
					return getNewPromise(q).put.apply(this, arguments);
				},
				'delete': function() {
					return getNewPromise(q)['delete'].apply(this, arguments);
				},
				map: function() {
					return getNewPromise(q).map.apply(this, arguments);
				},
				xhr2: xhr2,
				limit: function(by) {
					limit = by;
					return q;
				},
				setDefaultOptions: function(options) {
					defaultOptions = options;
					return q;
				},
				setDefaultXdrResponseType: function(type) {
					defaultXdrResponseType = type.toLowerCase();
					return q;
				},
				setDefaultDataType: function(type) {
					defaultDataType = type.toLowerCase();
					return q;
				},
				getOpenRequests: function() {
					return requests;
				}
			};

		return q;

	}();


/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(module, setImmediate, process) {/*
	 * PinkySwear.js 2.2.2 - Minimalistic implementation of the Promises/A+ spec
	 *
	 * Public Domain. Use, modify and distribute it any way you like. No attribution required.
	 *
	 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
	 *
	 * PinkySwear is a very small implementation of the Promises/A+ specification. After compilation with the
	 * Google Closure Compiler and gzipping it weighs less than 500 bytes. It is based on the implementation for
	 * Minified.js and should be perfect for embedding.
	 *
	 *
	 * PinkySwear has just three functions.
	 *
	 * To create a new promise in pending state, call pinkySwear():
	 *         var promise = pinkySwear();
	 *
	 * The returned object has a Promises/A+ compatible then() implementation:
	 *          promise.then(function(value) { alert("Success!"); }, function(value) { alert("Failure!"); });
	 *
	 *
	 * The promise returned by pinkySwear() is a function. To fulfill the promise, call the function with true as first argument and
	 * an optional array of values to pass to the then() handler. By putting more than one value in the array, you can pass more than one
	 * value to the then() handlers. Here an example to fulfill a promsise, this time with only one argument:
	 *         promise(true, [42]);
	 *
	 * When the promise has been rejected, call it with false. Again, there may be more than one argument for the then() handler:
	 *         promise(true, [6, 6, 6]);
	 *
	 * You can obtain the promise's current state by calling the function without arguments. It will be true if fulfilled,
	 * false if rejected, and otherwise undefined.
	 * 		   var state = promise();
	 *
	 * https://github.com/timjansen/PinkySwear.js
	 */
	(function(target) {
		var undef;

		function isFunction(f) {
			return typeof f == 'function';
		}
		function isObject(f) {
			return typeof f == 'object';
		}
		function defer(callback) {
			if (typeof setImmediate != 'undefined')
				setImmediate(callback);
			else if (typeof process != 'undefined' && process['nextTick'])
				process['nextTick'](callback);
			else
				setTimeout(callback, 0);
		}

		target[0][target[1]] = function pinkySwear(extend) {
			var state;           // undefined/null = pending, true = fulfilled, false = rejected
			var values = [];     // an array of values as arguments for the then() handlers
			var deferred = [];   // functions to call when set() is invoked

			var set = function(newState, newValues) {
				if (state == null && newState != null) {
					state = newState;
					values = newValues;
					if (deferred.length)
						defer(function() {
							for (var i = 0; i < deferred.length; i++)
								deferred[i]();
						});
				}
				return state;
			};

			set['then'] = function (onFulfilled, onRejected) {
				var promise2 = pinkySwear(extend);
				var callCallbacks = function() {
		    		try {
		    			var f = (state ? onFulfilled : onRejected);
		    			if (isFunction(f)) {
			   				function resolve(x) {
							    var then, cbCalled = 0;
			   					try {
					   				if (x && (isObject(x) || isFunction(x)) && isFunction(then = x['then'])) {
											if (x === promise2)
												throw new TypeError();
											then['call'](x,
												function() { if (!cbCalled++) resolve.apply(undef,arguments); } ,
												function(value){ if (!cbCalled++) promise2(false,[value]);});
					   				}
					   				else
					   					promise2(true, arguments);
			   					}
			   					catch(e) {
			   						if (!cbCalled++)
			   							promise2(false, [e]);
			   					}
			   				}
			   				resolve(f.apply(undef, values || []));
			   			}
			   			else
			   				promise2(state, values);
					}
					catch (e) {
						promise2(false, [e]);
					}
				};
				if (state != null)
					defer(callCallbacks);
				else
					deferred.push(callCallbacks);
				return promise2;
			};
	        if(extend){
	            set = extend(set);
	        }
			return set;
		};
	})( false ? [window, 'pinkySwear'] : [module, 'exports']);


	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(57)(module), __webpack_require__(58).setImmediate, __webpack_require__(60)))

/***/ }),
/* 57 */
/***/ (function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

	var apply = Function.prototype.apply;

	// DOM APIs, for completeness

	exports.setTimeout = function() {
	  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
	};
	exports.setInterval = function() {
	  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
	};
	exports.clearTimeout =
	exports.clearInterval = function(timeout) {
	  if (timeout) {
	    timeout.close();
	  }
	};

	function Timeout(id, clearFn) {
	  this._id = id;
	  this._clearFn = clearFn;
	}
	Timeout.prototype.unref = Timeout.prototype.ref = function() {};
	Timeout.prototype.close = function() {
	  this._clearFn.call(window, this._id);
	};

	// Does not start the time, just sets up the members needed.
	exports.enroll = function(item, msecs) {
	  clearTimeout(item._idleTimeoutId);
	  item._idleTimeout = msecs;
	};

	exports.unenroll = function(item) {
	  clearTimeout(item._idleTimeoutId);
	  item._idleTimeout = -1;
	};

	exports._unrefActive = exports.active = function(item) {
	  clearTimeout(item._idleTimeoutId);

	  var msecs = item._idleTimeout;
	  if (msecs >= 0) {
	    item._idleTimeoutId = setTimeout(function onTimeout() {
	      if (item._onTimeout)
	        item._onTimeout();
	    }, msecs);
	  }
	};

	// setimmediate attaches itself to the global object
	__webpack_require__(59);
	exports.setImmediate = setImmediate;
	exports.clearImmediate = clearImmediate;


/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {(function (global, undefined) {
	    "use strict";

	    if (global.setImmediate) {
	        return;
	    }

	    var nextHandle = 1; // Spec says greater than zero
	    var tasksByHandle = {};
	    var currentlyRunningATask = false;
	    var doc = global.document;
	    var registerImmediate;

	    function setImmediate(callback) {
	      // Callback can either be a function or a string
	      if (typeof callback !== "function") {
	        callback = new Function("" + callback);
	      }
	      // Copy function arguments
	      var args = new Array(arguments.length - 1);
	      for (var i = 0; i < args.length; i++) {
	          args[i] = arguments[i + 1];
	      }
	      // Store and register the task
	      var task = { callback: callback, args: args };
	      tasksByHandle[nextHandle] = task;
	      registerImmediate(nextHandle);
	      return nextHandle++;
	    }

	    function clearImmediate(handle) {
	        delete tasksByHandle[handle];
	    }

	    function run(task) {
	        var callback = task.callback;
	        var args = task.args;
	        switch (args.length) {
	        case 0:
	            callback();
	            break;
	        case 1:
	            callback(args[0]);
	            break;
	        case 2:
	            callback(args[0], args[1]);
	            break;
	        case 3:
	            callback(args[0], args[1], args[2]);
	            break;
	        default:
	            callback.apply(undefined, args);
	            break;
	        }
	    }

	    function runIfPresent(handle) {
	        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
	        // So if we're currently running a task, we'll need to delay this invocation.
	        if (currentlyRunningATask) {
	            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
	            // "too much recursion" error.
	            setTimeout(runIfPresent, 0, handle);
	        } else {
	            var task = tasksByHandle[handle];
	            if (task) {
	                currentlyRunningATask = true;
	                try {
	                    run(task);
	                } finally {
	                    clearImmediate(handle);
	                    currentlyRunningATask = false;
	                }
	            }
	        }
	    }

	    function installNextTickImplementation() {
	        registerImmediate = function(handle) {
	            process.nextTick(function () { runIfPresent(handle); });
	        };
	    }

	    function canUsePostMessage() {
	        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
	        // where `global.postMessage` means something completely different and can't be used for this purpose.
	        if (global.postMessage && !global.importScripts) {
	            var postMessageIsAsynchronous = true;
	            var oldOnMessage = global.onmessage;
	            global.onmessage = function() {
	                postMessageIsAsynchronous = false;
	            };
	            global.postMessage("", "*");
	            global.onmessage = oldOnMessage;
	            return postMessageIsAsynchronous;
	        }
	    }

	    function installPostMessageImplementation() {
	        // Installs an event handler on `global` for the `message` event: see
	        // * https://developer.mozilla.org/en/DOM/window.postMessage
	        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

	        var messagePrefix = "setImmediate$" + Math.random() + "$";
	        var onGlobalMessage = function(event) {
	            if (event.source === global &&
	                typeof event.data === "string" &&
	                event.data.indexOf(messagePrefix) === 0) {
	                runIfPresent(+event.data.slice(messagePrefix.length));
	            }
	        };

	        if (global.addEventListener) {
	            global.addEventListener("message", onGlobalMessage, false);
	        } else {
	            global.attachEvent("onmessage", onGlobalMessage);
	        }

	        registerImmediate = function(handle) {
	            global.postMessage(messagePrefix + handle, "*");
	        };
	    }

	    function installMessageChannelImplementation() {
	        var channel = new MessageChannel();
	        channel.port1.onmessage = function(event) {
	            var handle = event.data;
	            runIfPresent(handle);
	        };

	        registerImmediate = function(handle) {
	            channel.port2.postMessage(handle);
	        };
	    }

	    function installReadyStateChangeImplementation() {
	        var html = doc.documentElement;
	        registerImmediate = function(handle) {
	            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
	            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
	            var script = doc.createElement("script");
	            script.onreadystatechange = function () {
	                runIfPresent(handle);
	                script.onreadystatechange = null;
	                html.removeChild(script);
	                script = null;
	            };
	            html.appendChild(script);
	        };
	    }

	    function installSetTimeoutImplementation() {
	        registerImmediate = function(handle) {
	            setTimeout(runIfPresent, 0, handle);
	        };
	    }

	    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
	    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
	    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

	    // Don't get fooled by e.g. browserify environments.
	    if ({}.toString.call(global.process) === "[object process]") {
	        // For Node.js before 0.9
	        installNextTickImplementation();

	    } else if (canUsePostMessage()) {
	        // For non-IE10 modern browsers
	        installPostMessageImplementation();

	    } else if (global.MessageChannel) {
	        // For web workers, where supported
	        installMessageChannelImplementation();

	    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
	        // For IE 6–8
	        installReadyStateChangeImplementation();

	    } else {
	        // For older browsers
	        installSetTimeoutImplementation();
	    }

	    attachTo.setImmediate = setImmediate;
	    attachTo.clearImmediate = clearImmediate;
	}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(60)))

/***/ }),
/* 60 */
/***/ (function(module, exports) {

	// shim for using process in browser
	var process = module.exports = {};

	// cached from whatever global is present so that test runners that stub it
	// don't break things.  But we need to wrap it in a try catch in case it is
	// wrapped in strict mode code which doesn't define any globals.  It's inside a
	// function because try/catches deoptimize in certain engines.

	var cachedSetTimeout;
	var cachedClearTimeout;

	function defaultSetTimout() {
	    throw new Error('setTimeout has not been defined');
	}
	function defaultClearTimeout () {
	    throw new Error('clearTimeout has not been defined');
	}
	(function () {
	    try {
	        if (typeof setTimeout === 'function') {
	            cachedSetTimeout = setTimeout;
	        } else {
	            cachedSetTimeout = defaultSetTimout;
	        }
	    } catch (e) {
	        cachedSetTimeout = defaultSetTimout;
	    }
	    try {
	        if (typeof clearTimeout === 'function') {
	            cachedClearTimeout = clearTimeout;
	        } else {
	            cachedClearTimeout = defaultClearTimeout;
	        }
	    } catch (e) {
	        cachedClearTimeout = defaultClearTimeout;
	    }
	} ())
	function runTimeout(fun) {
	    if (cachedSetTimeout === setTimeout) {
	        //normal enviroments in sane situations
	        return setTimeout(fun, 0);
	    }
	    // if setTimeout wasn't available but was latter defined
	    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
	        cachedSetTimeout = setTimeout;
	        return setTimeout(fun, 0);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedSetTimeout(fun, 0);
	    } catch(e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
	            return cachedSetTimeout.call(null, fun, 0);
	        } catch(e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
	            return cachedSetTimeout.call(this, fun, 0);
	        }
	    }


	}
	function runClearTimeout(marker) {
	    if (cachedClearTimeout === clearTimeout) {
	        //normal enviroments in sane situations
	        return clearTimeout(marker);
	    }
	    // if clearTimeout wasn't available but was latter defined
	    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
	        cachedClearTimeout = clearTimeout;
	        return clearTimeout(marker);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedClearTimeout(marker);
	    } catch (e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
	            return cachedClearTimeout.call(null, marker);
	        } catch (e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
	            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
	            return cachedClearTimeout.call(this, marker);
	        }
	    }



	}
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    if (!draining || !currentQueue) {
	        return;
	    }
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = runTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    runClearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        runTimeout(drainQueue);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;
	process.prependListener = noop;
	process.prependOnceListener = noop;

	process.listeners = function (name) { return [] }

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * @preserve jquery-param (c) 2015 KNOWLEDGECODE | MIT
	 */
	/*global define */
	(function (global) {
	    'use strict';

	    var param = function (a) {
	        var add = function (s, k, v) {
	            v = typeof v === 'function' ? v() : v === null ? '' : v === undefined ? '' : v;
	            s[s.length] = encodeURIComponent(k) + '=' + encodeURIComponent(v);
	        }, buildParams = function (prefix, obj, s) {
	            var i, len, key;

	            if (Object.prototype.toString.call(obj) === '[object Array]') {
	                for (i = 0, len = obj.length; i < len; i++) {
	                    buildParams(prefix + '[' + (typeof obj[i] === 'object' ? i : '') + ']', obj[i], s);
	                }
	            } else if (obj && obj.toString() === '[object Object]') {
	                for (key in obj) {
	                    if (obj.hasOwnProperty(key)) {
	                        if (prefix) {
	                            buildParams(prefix + '[' + key + ']', obj[key], s, add);
	                        } else {
	                            buildParams(key, obj[key], s, add);
	                        }
	                    }
	                }
	            } else if (prefix) {
	                add(s, prefix, obj);
	            } else {
	                for (key in obj) {
	                    add(s, key, obj[key]);
	                }
	            }
	            return s;
	        };
	        return buildParams('', a, []).join('&').replace(/%20/g, '+');
	    };

	    if (typeof module === 'object' && typeof module.exports === 'object') {
	        module.exports = param;
	    } else if (true) {
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function () {
	            return param;
	        }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else {
	        global.param = param;
	    }

	}(this));


/***/ })
/******/ ]);
