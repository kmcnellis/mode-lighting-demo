// var battery_voltage = 5.15;
// var max_voltage = 1.95;

// Libraries
var SerialPort = require("serialport");
var ModeDevice = require('mode-device');
var env = require('../env.js');
// Setup MODE Service
var device = new ModeDevice(env.DEVICE_ID, env.API_KEY);

// Setup serial port

var port = new SerialPort(env.DEVICE_NAME, {
  parser: SerialPort.parsers.readline('\r')
});

var port_open = true;

// TODO: choose serialport from list
// SerialPort.list(function (err, ports) {
//   ports.forEach(function(port) {
//     console.log(port.comName);
//     console.log(port.pnpId);
//     console.log(port.manufacturer);
//   });
// });

// Communication steps

var current_step = 0;

var steps = [
  {command: "info 0", response: "info 0 DATAQ", message: "Confirmed DATAQ"},
  {command: "asc" , response: "asc", message: "Set to programming mode"},
  {command: "slist 0 x0000", response: "slist 0 x0000", message: "Set to read analog input 1"},
  {command: "float" , response: "float", message: "Set datatype to float"},
  {command: "start", response: "start", message: "Start Read"},
]

// Listen to port hooks
port.on('open', function() {
  console.log("Port is open")
  start_communication();
});

port.on('error', function(err) {
  throw ('Port has error: ', err.message);
})

var data_count = 0;
var saved_data = [];
var current_point = 0;

port.on('data', function (data) {
  if (current_step < steps.length){
    if (data == steps[current_step].response){
      console.log(steps[current_step].message)
      current_step +=1;
    }
    else{
      throw ("Unexpected response. '"+data+"'. Expected '"+steps[current_step].response+"'. Terminating");
    }
  }
  else{
    //parse data
    if (!data.lastIndexOf('sc', 0) === 0){
      throw ("Unexpected response. '"+data+"'. Expected 'sc <volts>'. Terminating");
    }
    var number = parseFloat(data.slice(2).trim());
    // console.log('Data: ' + number);
    data_count += 1;
    if (data_count % 4 == 0){
      if (data_count >= 300){
        console.log("Send data", saved_data.length)
        send_data(saved_data);
        saved_data = [];
        data_count = 0;
      }
      saved_data.push({x: new Date(), y: current_point / 4});
      current_point = number;

    }
    else{
      current_point += number
    }
  }
});

port.on('disconnect', function (err) {
  console.log('Disconnected: ' + err.message);
});

// Helper functions
var send_command = function(command){
  var command_send = command+'\r';
  return function(){
    return new Promise(function (fulfill, reject){
      port.write(command_send, function(err) {
        if (err) {
          return console.log('Error on write '+command+': ', err.message);
          reject(err);
        }
        port.drain(function(err){
          if (err) {
            return console.log('Error on drain '+command+': ', err.message);
            reject(err);
          }
          console.log('message written', command);
          fulfill();
        });

      });
    });
  }
}

var start_communication = function(){
  var p = Promise.resolve()
  for (var a = 0; a < steps.length ; a++){
    p = p.then(send_command(steps[a].command));
  }
  p.then(function(){console.log("done sending")}).catch(cleanup);
}

var send_data = function(data){
  device.triggerEvent('upload_data', {'light_data': data});
}


// Cleanup
function cleanup(options, err){
  if (err) console.log("Error: "+err);
  if (port_open){
    port_open = false;
    Promise.resolve()
    .then(send_command("stop"))
    .then(function(){
      console.log("Closing ports")
      port.close(function(){
        console.log("Port closed")
      })
    })

  }
}

//
//app is closing
process.on('exit', cleanup.bind(null,{}));
//ctrl+c
process.on('SIGINT', cleanup.bind(null,{}));
//uncaught exceptions
process.on('uncaughtException', cleanup.bind(null,{}));
