var Service = require('node-windows').Service;

const config = require("./config.json");

// Create a new service object
var svc = new Service({
  name: 'PoGo Raid Organizer',
  description: 'PoGo Raid Organizer web server.',
  script: config.path,
  nodeOptions: []
});

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall',function(){
  console.log('Uninstall complete.');
  console.log('The service exists: ',svc.exists);
});

// Uninstall the service.
svc.uninstall();