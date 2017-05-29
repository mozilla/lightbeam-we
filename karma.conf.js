/* eslint no-undef: "off" */

/*
* @todo resolve 'module' is undefined and turn 'on' the eslint rule
*/

module.exports = function(config) {
  config.set({
    singleRun: true,
    browsers: ['Firefox'],
    frameworks: ['mocha', 'chai'],
    files: [
      'test/unit/*.test.js'
    ],
    plugins: [
      'karma-chai',
      'karma-firefox-launcher',
      'karma-mocha'
    ]
  });
};
