'use strict';

// Declare app level module which depends on views, and components
var lightDemoApp = angular.module('LightDemoApp', ['ngWebSocket', 'angular-rickshaw']);
var messages_per_second = 60;
// var messages_per_hour = 60*60*messages_per_second;
var messages_per_hour = 60*messages_per_second;

lightDemoApp.factory('MyData', function($websocket) {
      var API_KEY='v1.dXN8MzE3NA==.1495732090.093a5b3cd4d05aeb000dc54b9e3cad71babfdad4eb2340130137e367'
      // Open a WebSocket connection
      var dataStream = $websocket('wss://api.tinkermode.com/userSession/websocket?authToken='+API_KEY);

      var saved={collection : []};
      var minimum = 0;
      var maximum = 0;

      dataStream.onMessage(function(message) {
        var lightData = JSON.parse(message.data).eventData.light_data
        saved.collection = saved.collection.concat(lightData);
        if (saved.collection.length > messages_per_hour){
          saved.collection.slice(saved.collection.length - messages_per_hour, messages_per_hour);
        }
        minimum = saved.collection.reduce(function(prev, curr) {
            return prev.y < curr.y ? prev : curr;
        }).y;
        maximum = saved.collection.reduce(function(prev, curr) {
            return prev.y > curr.y ? prev : curr;
        }).y;
      });

      var methods = {
        collection: saved,
        get: function() {
          dataStream.send(JSON.stringify({ action: 'get' }));
        },
        get_data(){
          return collection;
        },
        get_min(){
          return minimum;
        },
        get_max(){
          return maximum;
        },
        get_current(){
          if (saved.collection.length < 1) return 0;
          return saved.collection[saved.collection.length-1].y;
        },
        get_rising_direction(){
          if (saved.collection.length < 2) return 0;
          if (saved.collection[saved.collection.length-1] > saved.collection[saved.collection.length-2]){
            return 1
          }
          else if (saved.collection[saved.collection.length-1] < saved.collection[saved.collection.length-2]){
            return -1
          }
          else{
            return 0;
          }
        }
      };

      return methods;
    });
lightDemoApp.controller('DemoController', function ($scope, MyData, $interval, $timeout) {
      $scope.MyData = MyData;
      $scope.options = {
          renderer: 'line'
      };
      $scope.features = {
        xAxis: {
        },
        yAxis: {
          tickFormat: 'formatKMBT'
        }
      };
      var d = []
      // for (var a = 0; a < messages_per_hour; a ++){
      //   d.push({x:a, y:0});
      // }
      $scope.series = [{
        name: "Light Adjustment",
        data: d,
        color: 'steelblue',
      }];
      var x = 0;
      $scope.count = 0;
      $scope.$watch('MyData.collection.collection', function (oldVal, newVal){
        $scope.count += 1;

        $timeout(function() {
            var series = $scope.series;
            for (var i = 0; i < series.length; i++) {
                var name = series[i].name;
                var color = series[i].color;
                var data = MyData.collection.collection;
                // for (var a = 0; a < messages_per_hour && a < MyData.collection.collection.length; a ++){
                //   data[a]=({x:: MyData.collection.collection[a].x, y: MyData.collection.collection[a].y});
                // }
                series[i] = {
                    name: name,
                    color: color,
                    data: data
                };
            }
            x++;
        }, 0);

      })
    });
