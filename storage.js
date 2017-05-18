const store = {
	currentStore: null,

	init() {
		//get items from storage
		//add listeners
	},

	get(params) {
		// use async, await here because the below returns a promise
		// empty params, return all items from storage
		return browser.storage.local.get();
	},

	add(item) {
	 	this.set(item);	
	},

	update(item) {
		this.set(item);
	},

	set(item) {
		// item ? update : add;
		browser.storage.local.set({ item });
	},

	remove(key) {
		browser.storage.local.remove(key);
	},

	addListeners() {
		browser.storage.local.addListener((change) => {
			//update currentStore
		});
	}
}