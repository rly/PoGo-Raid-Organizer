var Service = require('node-windows').Service;

const config = require("./config.json");

// Create a new service object
var svc = new Service({
  name: config.name,
  description: 'PoGo Raid Organizer web server.',
  script: config.path,
  nodeOptions: [],
  wait: 60,
  maxRestarts: 20
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

svc.install();