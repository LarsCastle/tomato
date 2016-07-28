/**
 * Created by larsv on 27/06/2016.
 */
"use strict";

// constants
const cycleTimes = {
  single: {
    work: 25,
    rest: 5
  },
  double: {
    work: 50,
    rest: 10
  }
};

// pubsub
const events = (function() {
  var events = {};

  function on(eventName, fn) {
    events[eventName] = events[eventName] || [];
    events[eventName].push(fn);
  }

  function off(eventName, fn) {
    if (events[eventName]) {
      for (var i = 0; i < events[eventName].length; i++) {
        if (events[eventName][i] === fn) {
          events[eventName].splice(i, 1);
          break;
        }
      }
    }
  }

  function emit(eventName, data) {
    if (events[eventName]) {
      events[eventName].forEach(function (fn) {
        fn(data);
      });
    }
  }

  return {
    on: on,
    off: off,
    emit: emit
  };

})();

$(document).ready(function() {
  // get DOM elements
//  const $canvas = $("canvas");
  const $output = $("#output");
  const $workTimeElt = $("#workTimeElement");
  const $workDec = $workTimeElt.find("#w_minus");
  const $workInc = $workTimeElt.find("#w_plus");
  const $restTimeElt = $("#restTimeElement");
  const $restDec = $restTimeElt.find("#r_minus");
  const $restInc = $restTimeElt.find("#r_plus");
  const $singleCycle = $("#single");
  const $doubleCycle = $("#double");

  // create 2 new updaters
  const workUpdater = new Updater("workTime", $workTimeElt);
  const restUpdater = new Updater("restTime", $restTimeElt);

  // create 2 timers
  const workTimer = new Timer(true,cycleTimes.single.work,$output);
  const restTimer = new Timer(false,cycleTimes.single.rest,$output);

  // bind updaters to DOM events
  $workDec.on("click",workUpdater.dec.bind(workUpdater));
  $workInc.on("click",workUpdater.inc.bind(workUpdater));
  $restDec.on("click",restUpdater.dec.bind(restUpdater));
  $restInc.on("click",restUpdater.inc.bind(restUpdater));
  $singleCycle.on("click",function() {
    workUpdater.set(cycleTimes.single.work);
    restUpdater.set(cycleTimes.single.rest);
    // restUpdater.set(cycleTimes.single.rest);

  });
  $doubleCycle.on("click",function() {
    workUpdater.set(cycleTimes.double.work);
    restUpdater.set(cycleTimes.double.rest);
  });
  $output.on("click", handleOutputClick);

  // bind timers to changes in user-modifiable time settings
  events.on("workTimeChanged",workTimer.setTime.bind(workTimer));
  events.on("restTimeChanged",restTimer.setTime.bind(restTimer));

  // bind run of restTimer to end of workTimer
  events.on("workTimeEnded",function() {
    restTimer.run();
    workTimer.reset(workUpdater.currentValue);
  });
  events.on("restTimeEnded", function() {
    restTimer.reset(restUpdater.currentValue);
    $output.text("Start again!");
  });

  // handler for clicking on output
  function handleOutputClick() {
    console.log(`
        === workTimer ====
        isStarted: ${workTimer.isStarted}
        isRunning: ${workTimer.isRunning}

        === restTimer ====
        isStarted: ${restTimer.isStarted}
        isRunning: ${restTimer.isRunning}`);
    if (!workTimer.isStarted && !restTimer.isStarted) {
      console.log("Run workTimer");
      workTimer.run();
    } else if (workTimer.isStarted) {
      if (workTimer.isRunning) {
        console.log("Pause workTimer");
        workTimer.pause();
      } else {
        console.log("Resume workTimer");
        workTimer.resume();
      }
    }

  }

});



// Updater class for the - and + button functionality
class Updater {
  constructor(name, $element) {
    this.name = name;
    this.$showValueHere = $element.find("span");
    this.currentValue = parseInt(this.$showValueHere.html());
    console.log(this.name+" created with initial value "+this.currentValue);
  }

  render() {
    this.$showValueHere.html(this.currentValue);
    if (this.currentValue === 1) {
      this.$showValueHere.parent().find("button").first().attr("disabled","disabled");
    } else if (this.currentValue === 2) {
      this.$showValueHere.parent().find("button").first().removeAttr("disabled");
    }
  }

  inc() {
    ++this.currentValue;
    console.log(this.name + " incremented to " + this.currentValue);
    events.emit(this.name+"Changed",this.currentValue);
    this.render();
  }

  dec() {
    this.currentValue = Math.max(this.currentValue - 1, 1);
    console.log(this.name + " decremented to " + this.currentValue);
    events.emit(this.name+"Changed",this.currentValue);
    this.render();
  }
  set(value) {
    if (Number.isInteger(value)) {
      this.currentValue = value;
      events.emit(this.name+"Changed",this.currentValue);
      this.render();
    }
  }
}

// timer class
class Timer {
  constructor(work, time, $output) {
    // work: boolean. work == true: worker, work == false: rester
    this.totalTime = time * 60; // in seconds
    this.timeLeft = this.totalTime; // in seconds
    this.isWorkTimer = work;
    this.$output = $output;
    this.isStarted = false;
    this.isRunning = false;
    console.log((this.isWorkTimer ? "Work timer" : "Rest timer") + " created with total time of " + this.totalTime);
  }

  run() {
    this.isStarted = true;
    this.isRunning = true;
    this.$output.removeClass("output-work, output-rest, output-pause");
    this.$output.addClass(this.isWorkTimer ? "work-output" : "rest-output");
    this.startTime = Date.now();
    const that = this;
    const intervalKey = setInterval(function() {
      that.render();

      that.timeLeft = that.totalTime - Math.round((Date.now() - that.startTime) / 1000);
      console.log(`start time: ${Math.round(that.startTime / 1000)}. current time: ${Math.round(Date.now()/1000)}. Time left (s): ${that.timeLeft}`);
      if (!that.isRunning) {
        clearInterval(intervalKey);
        that.totalTime = that.timeLeft;
      }
      if (that.timeLeft < 0) {
        clearInterval(intervalKey);
        that.timeLeft = 0;
        that.isRunning = false;
        events.emit((that.isWorkTimer ? "work" : "rest") + "TimeEnded", null);
        console.log((that.isWorkTimer ? "work" : "rest") + "TimeEnded");
      }
    },100); // approx. 10x per second (bit less because setInterval sucks)
  }
  render() {
    const minutes = Math.floor(this.timeLeft / 60).toString();
    const seconds = Math.round(this.timeLeft % 60) === 0 ? "00" : Math.round(this.timeLeft % 60).toString();
    this.$output.text(minutes + " : " + seconds + " left");
  }
  setTime(time) {
    this.totalTime = time * 60;
    console.log((this.isWorkTimer ? "Work time" : "Rest time") + " changed to " + this.totalTime);
  }
  pause () {
    this.isRunning = false;
    // console.log(`Paused. start time: ${Math.round(this.startTime / 1000)}. current time: ${Math.round(Date.now()/1000)}. Time left (s): ${this.timeLeft}`);
  }
  resume() {
    this.isRunning = true;
    this.startTime = Date.now();
    this.run();
    // console.log(`Resumed. start time: ${Math.round(this.startTime / 1000)}. current time: ${Math.round(Date.now()/1000)}. Time left (s): ${this.timeLeft}`);
  }
  reset(time) {
    this.isRunning = false;
    this.isStarted = false;
    this.totalTime = time * 60; // in seconds
    this.timeLeft = this.totalTime; // in seconds
  }
}
