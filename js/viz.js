// eslint-disable-next-line no-unused-vars
const viz = {
  draw(context, websites) {
    const pi = Math.PI * 2;
    let x = 50, y = 50;

    context.fillStyle = 'white';
    context.beginPath();

    for (const website in websites) {
      context.moveTo(x, y);
      context.arc(x, y, 10, 0, pi);
      context.fillText(website, x, y);

      let x1 = x;
      for (const thirdParty in websites[website].thirdPartyRequests) {
        x1+=150;
        context.moveTo(x1, y);
        context.arc(x1, y, 5, 0, pi);
        context.fillText(thirdParty, x1, y);
      }

      x+=20; y+=20;
    }

    context.stroke();
    context.fill();
  }
};
