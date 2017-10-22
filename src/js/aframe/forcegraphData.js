// eslint-disable-next-line no-unused-vars
const forcegraphData = {
  async getData() {
    const data = await storeChild.getAll();
    return this.transformData(data);
  },

  transformData(data) {
    const nodes = [];
    let links = [];
    for (const website in data) {
      const site = data[website];
      data[website].id = site.hostname;
      data[website].name = site.hostname;
      if (site.thirdParties) {
        const thirdPartyLinks = site.thirdParties.map((thirdParty) => {
          return {
            source: website,
            target: thirdParty
          };
        });
        links = links.concat(thirdPartyLinks);
      }
      nodes.push(data[website]);
    }

    return {
      nodes,
      links
    };
  }
};
