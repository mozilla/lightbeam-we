async function renderGraph() {
  const canvas = document.getElementById('canvas');
  const context = canvas.getContext('2d');
  const websites = await storeChild.getAll();

  viz.draw(context, websites);
}

renderGraph();
