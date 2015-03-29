var BLOCK_RESULT = {};
var ERROR_RESULT = {};
var createLiftedFunction = function (cb, valueOperation) {

  return function () {
    var args = [].slice.call(arguments, 0);
    var liftedFunctionResult = function () {
      return cb.apply(null, args.map(function (value) {
        return ObservableProto.isPrototypeOf(value) ? value.get() : value;
      }));
    };
    var observable = Observable(
      valueOperation && valueOperation.apply ? liftedFunctionResult() :
      valueOperation && 'set' in valueOperation ? valueOperation.set :
      undefined
    );
    var setValue = function (value) {

      var result;
      if (value === ERROR_RESULT.error) {
        result = value;
      } else {
        try {
          result = liftedFunctionResult();
        } catch (err) {
          ERROR_RESULT.error = err;
          result = ERROR_RESULT;
        }
      }
      if (result.then && typeof result.then === 'function') {
        result.then(observable.setSync).catch(observable.triggerError);
      } else if (result !== BLOCK_RESULT) {
        observable.setSync(result);
      }
    };
    args.forEach(function (passedObservable) {
      if (ObservableProto.isPrototypeOf(passedObservable)) {
        observable.observe(passedObservable, setValue);
      }
    });
    return observable;
  };
};

var ObservableProto = {

  /*
    OBSERVING STUFF
    */
  onChange: function (callback) {
    this.observers.push(callback);
    return function () {
      this.observers.splice(this.observers.indexOf(callback), 1);
    }.bind(this);
  },
  trigger: function () {
    var value = ObservableProto.isPrototypeOf(this.value) ? this.value.get() : this.value;
    this.observers.forEach(function (observer) {
      observer(value);
    }, this);
  },
  triggerError: function (error) {
    console.log('Trigging error', this.errorObservers, this);
    this.errorObservers.forEach(function (observer) {
      observer(error);
    });
  },
  observe: function (value, cb) {
    var stopObserving = value.onChange(cb);
    this.observing.push(stopObserving);
    return function () {
      stopObserving();
      this.observing.splice(this.observing.indexOf(stopObserving), 1);
    }.bind(this);
  },
  silenceObserving: function () {
    this.observing.forEach(function (stopObserving) {
      stopObserving()
    });
  },
  silenceObservers: function () {
    this.observers = [];
  },
  silence: function () {
    this.silenceObserving();
    this.silenceObservers();
  },

  /*
    SET AND GET STUFF
    */
  setSync: function (value) {
    if (ObservableProto.isPrototypeOf(value)) {
      this.observe(value, this.trigger);
    }
    this.value = value;
    this.trigger();
    return this;
  },
  set: function (value) {

    setTimeout(function () {

      // If new value is Observable, observe it
      if (ObservableProto.isPrototypeOf(value)) {
        this.observe(value, this.trigger);
      }
      this.value = value;
      this.trigger();
    }.bind(this), 0);

    return this;
  },
  bindSet: function (value) {
    return this.set.bind.apply(this.set, [this, value]);
  },
  bindSetAsync: function (value) {
    return this.setAsync.bind.apply(this, [this, value]);
  },
  get: function () {
    return ObservableProto.isPrototypeOf(this.value) ? this.value.get() : this.value;
  },

  /*
    FUNCTIONAL STUFF
    */
  log: function (prefix) {
    return this.map(function (value) {
      console.log(prefix || '', value);
      return value;
    });
  },
  map: function (cb) {
    var liftedFunction = createLiftedFunction(cb, {
      apply: true
    });
    return liftedFunction(this);
  },
  reduce: function (cb) {
    var liftedFunction = createLiftedFunction(cb, {
      set: this.value
    });
    var observable = liftedFunction(this.value, this);
    return observable;
  },
  filter: function (cb) {
    var liftedFunction = createLiftedFunction(function (newValue) {
      if (cb(newValue)) {
        return newValue;
      } else {
        return BLOCK_RESULT;
      }
    }, {
      apply: true
    });
    return liftedFunction(this);
  },
  debounce: function (delay) {
    var observable = Observable(this.value);
    var lastValue = this.value;
    var timer = null;
    this.onChange(function (value) {
      timer = timer || setTimeout(function () {
        observable.set(lastValue);
        timer = null;
      }, delay);
      lastValue = value;
    });
    return observable;
  },
  key: function (key) {
    return this.map(function (value) {
      var state = {};
      state[key] = value;
      return state;
    });
  },
  promise: function (cb) {
    var liftedFunction = createLiftedFunction(cb, {
      set: this.value
    });
    return liftedFunction(this);
  },
  catch: function (cb) {
    var liftedFunction = createLiftedFunction(function (newValue) {
      if (newValue === ERROR_RESULT) {
        cb(ERROR_RESULT.error);
        return BLOCK_RESULT;
      } else {
        return newValue;
      }
    }, {
      set: this.value
    });
    return liftedFunction(this);
  },
  fromEventListener: function (event, element, options) {

  }
};

var Observable = function (value) {

  var observable = Object.create(ObservableProto);

  observable.observers = [];
  observable.errorObservers = [];
  observable.observing = [];
  observable.stopObserving = [];

  observable.value = value;

  observable.set = observable.set.bind(observable);
  observable.setSync = observable.setSync.bind(observable);
  observable.trigger = observable.trigger.bind(observable);

  if (ObservableProto.isPrototypeOf(value)) {
    value.onChange(observable.trigger);
  }

  return observable;
};

Observable.merge = function () {

  // A map of observables
  if (typeof arguments[0] === 'object' && !ObservableProto.isPrototypeOf(arguments[0])) {
    var mapping = arguments[0];
    var observables = Object.keys(mapping).map(function (key) {
      return mapping[key].key(key);
    });
    return Observable.mergeValues.apply(this, observables);

  // Passing multiple observables
  } else {
    var args = [].slice.call(arguments, 0);
    var observable = Observable(args[0].get());
    args.forEach(function (value) {
      observable.observe(value, observable.set);
    });
    return observable;
  }
};

Observable.mergeValues = function () {

  var mergedObservable;
  var args = [].slice.call(arguments, 0);

  var values = {};
  var addValue = function (value) {
    if (value) {
      Object.keys(value).forEach(function (key) {
        values[key] = value[key];
      });
    }
  };
  var addValueAndSet = function (value) {
    addValue(value);
    mergedObservable.set(values);
  };

  args.forEach(function (observable) {
    addValue(observable.get());
  });

  mergedObservable = Observable(values);
  args.forEach(function (observable) {
    mergedObservable.observe(observable, addValueAndSet);
  });

  return mergedObservable;
};

Observable.lifted = function (func) {
  return createLiftedFunction(func, {
    apply: true
  });
};

module.exports = Observable;
