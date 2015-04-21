Package.describe({
  summary: "User-level feature flippers",
  version: "1.1.2",
  git: "https://github.com/rgm/meteor-flipper"
});

Package.on_use(function(api) {
  api.use('underscore');
  api.use('accounts-base');
  api.use('templating');

  api.add_files('lib/flippers.html');
  api.add_files('lib/flippers.js');
  if (api.export) {
    api.export('Flipper');
  }
});

Package.on_test(function(api) {
  api.use('tinytest');
  api.use('flipper');
  api.add_files('test/flippers.js');
});
