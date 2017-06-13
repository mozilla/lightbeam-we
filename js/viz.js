// eslint-disable-next-line no-unused-vars
const viz = {
  draw(context, websites) {
    const pi = Math.PI * 2;
    let x = 50, y = 50;

    context.fillStyle = 'red';
    context.beginPath();

    for(const website in websites) {
      context.moveTo(x, y);
      context.arc(x, y, 5, 0, pi);
      context.fillText(website, x, y);
      x+=20; y+=20;
    }

    context.stroke();
    context.fill();
  }
};
