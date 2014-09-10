/* global Flipper: true */
/* jshint newcap: false */

Flipper = {};

(function() {
  "use strict";

  var _collection = new Meteor.Collection('flippers');

  var _feature = function(_id) {
    this._id = _id;
  };

  var _group = function(groupName) {
    this._actorType = "group";
    this._groupName = groupName;
  };

  var _proportion = function(amount, collection) {
    this._actorType  = "proportion";
    this._amount     = amount;
    this._collection = collection;
  };

  _feature.prototype.isEnabled = function(/* actor */) {
    // TODO implement server check against user, group
    var feature = _collection.findOne({_id: this._id});
    return (! _.isEmpty(feature));
  };

  _feature.prototype.enable = function() {
    // TODO implement group, proportion, single-user modes
    _collection.update({_id: this._id}, {$set: {boolean: true}}, {upsert: true});
  };

  _feature.prototype.disable = function() {
    // TODO implement group, proportion, single-user modes
    _collection.update({_id: this._id}, {$set: {boolean: false}}, {upsert: true});
  };

  _feature.prototype.remove = function() {
    // TODO implement group, proportion, single-user modes
    _collection.remove({_id: this._id});
  };

  Flipper = function(_id) {
    return new _feature(_id);
  };

  Flipper.group = function(groupName) {
    return new _group(groupName);
  };

  Flipper.proportion = function(proportion, actor) {
    return new _proportion(proportion, actor);
  };

  Flipper._groupPredicates = {};

  Flipper.registerGroup = function(groupName, predicate) {
    Flipper._groupPredicates[groupName] = predicate;
  };

  if (Meteor.isClient) {

    // TODO define Spacebars block helper

    Meteor.startup(function() {
      Meteor.subscribe('flippers');
    });

    // for {{#flipper}} {{/flipper}} custom block helper
    Handlebars.registerHelper('flipper', function(flipperName, options) {
      var feature = Flipper(flipperName);
      if (feature.isEnabled()) {
        // console.log('running helper', flipperName, feature.isEnabled(), options);
        // options is a ??
        // cargo-culting from the examples for {{#if}}, {{#unless}}, etc. from
        // meteor/packages/handlebars/evaluate-handlebars.js commit f49863f
        return options.fn(this);
      }
    });

  }

  if (Meteor.isServer) {

    _collection.allow({
      insert: function() { return false; },
      update: function() { return false; },
      remove: function() { return false; }
    });

    Meteor.publish('flippers', function() {
      var user = Meteor.users.findOne({_id: this.userId});
      var groups = _.chain(Flipper._groupPredicates)
        .reduce(function removeFalsePredicates(memo, predicate, predicateName) {
          if (predicate(user)) {
            memo[predicateName] = predicate;
          }
          return memo;
        }, {})
        .keys()
        .value();
      var selector = { $or: [
        { boolean: true },
        { groups: { $in: groups }},
        { users: user._id }
      ]};
      var modifier = { fields: {_id: 1} };
      return _collection.find(selector, modifier);
    });

  }

}());
