module.exports = function(config) {
  config.set({
    singleRun: true,
    browsers: ['Firefox'],
    frameworks: ['mocha', 'chai'],
    files: [
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
