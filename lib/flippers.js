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

  if (Meteor.isClient) {

    Meteor.startup(function() {
      Meteor.subscribe('flippers');
    });

    // for {{#flipper name='featureName'}} {{else}} {{/flipper}} custom block helper
    Template.registerHelper('flipper', function() {
      var flipperName = this.name;
      var feature = Flipper(flipperName);
      if (feature.isEnabled()) {
        return Template._flipper_turned_on;
      } else {
        return Template._flipper_turned_off;
      }
    });

    var contextHelpers = {
      parentContext: function() { return Template.parentData(); }
    };

    Template._flipper_turned_on.helpers(contextHelpers);
    Template._flipper_turned_off.helpers(contextHelpers);

  }

  if (Meteor.isServer) {

    Flipper.registerGroup = function(groupName, predicate) {
      Flipper._groupPredicates[groupName] = predicate;
    };

    _collection.allow({
      insert: function() { return false; },
      update: function() { return false; },
      remove: function() { return false; }
    });

    Meteor.publish('flippers', function() {
      var currentUser = this.userId &&
                        Meteor.users.findOne( { _id: this.userId } );
      var $ors = [ { boolean: true } ];
      if (this.userId) {
        $ors.push( { users: this.userId } );
      }
      if (currentUser) {
        var groups = _.reduce(Flipper._groupPredicates,
                              function(memo, predicate, groupName) {
          if (predicate(currentUser)) { memo.push(groupName); }
          return memo;
        }, []);
        if (!_.isEmpty(groups)) {
          $ors.push( { groups: { $in: groups }} );
        }
      }
      var selector = { $or: $ors };
      var modifier = { fields: {_id: 1} };
      return _collection.find(selector, modifier);
    });

  }

}());
