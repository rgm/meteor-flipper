Flipper
=======

Flexible feature flippers for Meteor. Heavily influenced by the
production-tested [jnunemaker/flipper](https://github.com/jnunemaker/flipper).

background
----------

- http://martinfowler.com/bliki/FeatureToggle.html
- http://code.flickr.net/2009/12/02/flipping-out/
- http://blog.jayfields.com/2010/10/experience-report-feature-toggle-over.html

examples
--------

### in client-side or shared JavaScript, eg. Template helpers or models:

```JavaScript
var experimentalSearch = Flipper('experimentalSearch');
if (experimentalSearch.isEnabled()) {
  // submit to the new search method
} else {
  // submit to the old search method
}
```

### in client-side Spacebars:

```Handlebars
{{#flipper 'experimentalSearch'}}
  {{> dodgyNewSearchUI }}
{{else}}
  {{> searchUI }}
{{/flipper}}
```

### in server-side JavaScript, eg. Meteor methods, etc.

```JavaScript
var experimentalSearch = Flipper('experimentalSearch');
var user = Users.find({_id: this.userId}) // in publications
var user = Meteor.user();                 // anywhere else

if (experimentalSearch.isEnabled(user)) {
  // do an experimental search with no change in client code
} else {
  // do an old-style search
}

// mutators will cause a correct update() on the backing Mongo document
experimentalSearch.enable();                // for all clients, unconditionally
experimentalSearch.disable();               
experimentalSearch.enable(Flipper.group('usersWithNamesStartingWithM'));
experimentalSearch.enable(Flipper.group('firstTenUsers'));
experimentalSearch.enable(Meteor.user());
experimentalSearch.disable(Meteor.user());
experimentalSearch.enable(Flipper.proportion(10, Meteor.users));
```

persistence
-----------

Stores features in Mongo collection, one document per feature.

Does multiple types of check as to whether or not a given feature should be
enabled, in descending order of precedence:

1. **boolean**: On or off for everyone.
2. **groups**: For some users (or whatever object gets passed into
   `isEnabled()`), but based on a predicate registered with this group name,
   supplied during the server's `Meteor.startup()`.
3. **users**: Straight-up match on the `_id` of an object supplied to
   `isEnabled()`.
4. **proportion**: A deterministic subset of the type of item passed in to
   `isEnabled()`. For slow ramp-up of a new feature. ∈[0,1]. Meant to allow
   gradual increase towards 1.0 (functionally equivalent to `boolean: true`)
   without necessarily restarting the server.

Example Mongo document:

```JSON
{
  "_id":         "experimentalSearch",
  "boolean":     false,
  "groups":      ["usersFromCompanyA", "usersWithNamesStartingWithM", "firstTenUsers"],
  "users":       ["id3", "id2", "id1"],
  "proportion":  0.2
}
```

groups
------

For arbitrary groupings based on a (server-side) predicate. Could be as simple
as checking a property on the object supplied to the registered predicate, or
some calculation on the broader state of the application. 

```JavaScript
if (Meteor.isServer) {
  Meteor.startup(function() {

    Flipper.registerGroup("usersForCompanyA", function(user) {
      return (user.company === "Company A" || user.isCustomerOf("Company A"));
    });

    Flipper.registerGroup("usersWithNamesStartingWithM", function(user) {
      return _.startsWith(user.name, "M");
    });

    var firstTen = [];

    Flipper.registerGroup("firstTenUsers", function (user) {
      // first ten users to subscribe
      var result = false;
      if (_.contains(firstTen, user._id)) {
        result = true;
      } else {
        if (firstTen.length < 10) {
          firstTen.push(user._id);
          result = true;
        }
      }
      return result;
    });

  });
}
```

how does the client know?
-------------------------
The client maintains a subscription of `Flipper` documents. To enable the system:

```JavaScript
Meteor.subscribe('flippers');
```

Without this, all `isEnabled()` feature checks safely default to `false`.

The client-side documents gets filtered down to simply `[ {_id: 'featureName1'}, {_id: 'featureName2'}, ... ]` in the publication.

Client-side `isEnabled()` checks end up being a thin function wrapper around a
straightforward collection `findOne({_id: 'experimentalSearch'})`, and all
user, group and proportion decisions about features get made entirely by the
server via the `flippers` publication.

