/**
 * Sandcrawler Spawn
 * ==================
 *
 * Sandcrawler abstract wrapper around a custom phantom child process.
 */
var bothan = require('bothan'),
    uuid = require('uuid'),
    types = require('typology');

/**
 * Main Class
 */
function Spawn(params, anonym) {

  // Properties
  this.id = 'Spawn[' + uuid.v4() + ']';
  this.params = params;
  this.spy = null;
  this.closed = false;

  // Hidden properties
  this._runningScrapers = [];
}

/**
 * Prototype
 */

// Starting the child phantom
Spawn.prototype.start = function(callback) {
  var self = this;

  bothan.deploy(this.params, function(err, spy) {
    if (err)
      return callback(err);

    self.spy = spy;

    // Binding
    self.on = self.spy.on.bind(self);

    // DEBUG: remove this asap
    self.on('phantom:close', function() {
      console.log('phantom', arguments);
    });
    self.on('phantom:error', function() {
      console.log('phantom', arguments);
    });
    self.on('phantom:log', function() {
      console.log('phantom', arguments[0]);
    });

    callback();
  });
};

// Stopping the child phantom
Spawn.prototype.close = function() {
  if (this.closed)
    throw Error('sandcrawler.spawn.close: spawn already closed.');

  this.closed = true;

  // TODO: kill socket server only if last one using it
  this.spy.spynet.close();
  this.spy.kill();

  return this;
};

// Running the given scraper
Spawn.prototype.run = function(scraper, callback) {
  var self = this;

  if (!types.check(scraper, 'scraper'))
    throw Error('sandcrawler.spawn.run: given argument is not a valid scraper.');

  if (scraper.done)
    throw Error('sandcrawler.spawn.run: given scraper has already been fulfilled.');

  // Starting
  this._runningScrapers.push(scraper.id);
  scraper._run(this, function(err) {

    // Autoclosing the spawn?
    var idx = self._runningScrapers.indexOf(scraper.id);
    self._runningScrapers.splice(idx, 1);

    if (self.params.autoClose && !self._runningScrapers.length)
      self.close();

    if (err)
      return callback(err);

    callback(null);
  });
};

/**
 * Exporting
 */
module.exports = Spawn;