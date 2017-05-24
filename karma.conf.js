module.exports = function(config) {
  config.set({
    singleRun: true,
    browsers: ['Firefox'],
    frameworks: ['mocha', 'chai'],
    files: [
      'node_modules/sinon/pkg/sinon.js',
      'node_modules/sinon-chrome/bundle/sinon-chrome.min.js',
      'js/*.js',
      'test/unit/*.test.js'
    ],
    plugins: [
      'karma-chai',
      'karma-firefox-launcher',
      'karma-mocha'
    ]
  });
};
