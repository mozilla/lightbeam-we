function renderGraph() {
  const canvas = document.getElementById('canvas');
  const context = canvas.getContext('2d');
  const websites = store.getAll();

  viz.draw(context, websites);
}

setTimeout(renderGraph, 5000);
