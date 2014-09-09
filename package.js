Package.describe({
  summary: "User-level feature flippers",
  version: "1.0.0",
});

Package.on_use(function(api) {
  api.use(['underscore', 'accounts-base']);
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
