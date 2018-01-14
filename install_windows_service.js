var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name: 'PoGo Raid Organizer',
  description: 'PoGo Raid Organizer web server.',
  script: 'D:\\Documents\\PoGo-Raid-Organizer-dev\\app.js',
  nodeOptions: []
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

svc.install();