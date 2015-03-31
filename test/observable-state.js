var Observable = require('./../src/observable-state.js');
var Promise = require('es6-promise').Promise;

exports['Create an Observable with any primitive or object, except function'] = function (test) {
  var primitive = Observable('foo');
  var object = Observable({foo: 'bar'});
  var array = Observable(['foo']);
  var date = Observable(new Date());
  test.equal(primitive.get(), 'foo');
  test.equal(object.get().foo, 'bar');
  test.equal(array.get()[0], 'foo');
  test.ok(date.get() instanceof Date);
  test.done();
};

exports['Listen to change on an observable'] = function (test) {
  var observable = Observable();
  observable.onChange(function (value) {
    test.equal(value, 'foo');
    test.done();
  });
  observable.set('foo');
};

exports['Listen to change that has an observable as value'] = function (test) {
  var observableA = Observable();
  var observableB = Observable(observableA);
  observableB.onChange(function (value) {
    test.equal(value, 'foo');
    test.done();
  });
  observableA.set('foo');
};

exports['MAP: Creates a new observable that maps current value and coming changes'] = function (test) {
  var observableA = Observable('foo');
  var observableB = observableA.map(function (value) {
    return value.split('').reverse().join('');
  });
  observableB.onChange(function (value) {
    test.equal(value, 'rab');
    test.done();
  });
  test.notEqual(observableA, observableB);
  test.equal(observableB.get(), 'oof');
  observableA.set('bar');
};

exports['REDUCE: Creates a new observable with current value and reduces coming changes'] = function (test) {
  var observableA = Observable(3);
  var observableB = observableA.reduce(function (currentValue, value) {
    return currentValue + value;
  });
  observableB.onChange(function (value) {
    test.equal(value, 9);
    test.done();
  });
  test.equal(observableB.get(), 3);
  observableA.set(6);
};

exports['FILTER: Creates a new observable that filters current value and filters coming changes'] = function (test) {
  var observableA = Observable('foo');
  var observableB = observableA.filter(function (value) {
    return value === 'foo';
  });
  observableB.onChange(function (value) {
    test.equal(value, 'foo');
    test.done();
  });
  observableA.set('bar');
  observableA.set('foo');
};

exports['DEBOUNCE: Creates a new observable that waits set milliseconds and passes latest event'] = function (test) {
  var observableA = Observable('foo');
  var observableB = observableA.debounce(0);
  observableB.onChange(function (value) {
    test.equal(value, 'bar');
    test.done();
  });
  test.equal(observableB.get(), 'foo');
  observableA.set('foo2');
  observableA.set('bar');
};

exports['MERGE: Creates a new observable observing multiple observables. The value is the first observable.'] = function (test) {
  var count = 0;
  var observableA = Observable('foo');
  var observableB = Observable('bar');
  var observableC = Observable.merge(observableA, observableB);
  test.equal(observableC.get(), 'foo');
  observableC.onChange(function (value) {
    count++;
    if (count === 1) {
      test.equal(value, 'foo2');
    } else if (count === 2) {
      test.equal(value, 'bar2');
      test.done();
    }
  });
  observableA.set('foo2');
  observableB.set('bar2');
};

exports['MERGE: Creates a new observable observing a map of observables'] = function (test) {
  var count = 0;
  var observableA = Observable('foo');
  var observableB = Observable('bar');
  var observableC = Observable.merge({
    c: observableA,
    d: observableB
  });
  test.equal(observableC.get().c, 'foo');
  observableC.onChange(function (value) {
    count++;
    if (count === 1) {
      test.equal(value.c, 'foo2');
    } else if (count === 2) {
      test.equal(value.d, 'bar2');
      test.done();
    }
  });
  observableA.set('foo2');
  observableB.set('bar2');
};

exports['MERGEVALUES: Creates a new observable observing multiple observables, merging their values into on object'] = function (test) {
  var count = 0;
  var observableA = Observable({
    'foo': 'bar'
  });
  var observableB = Observable({
    'bar': 'foo'
  });
  var observableC = Observable.mergeValues(observableA, observableB);
  test.deepEqual(observableC.get(), {
    foo: 'bar',
    bar: 'foo'
  });
  observableC.onChange(function (value) {
    test.deepEqual(value, {
      foo: 'bar',
      bar: 'foo2'
    });
    test.done();
  });
  observableB.set({
    bar: 'foo2'
  });
};

exports['KEY: Creates a new observable converting value to a key value pair'] = function (test) {
  var count = 0;
  var observableA = Observable('bar');
  var observableB = observableA.key('foo');

  observableB.onChange(function (value) {
    test.deepEqual(value, {
      foo: 'bar2',
    });
    test.done();
  });
  test.deepEqual(observableB.get(), {
    foo: 'bar'
  });
  observableA.set('bar2');
};

exports['PROMISE: Can map over promises'] = function (test) {
  var observableA = Observable('foo');
  var observableB = observableA.promise(function (value) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve(value);
      }, 0);
    });
  });
  observableB.onChange(function (value) {
    test.equal(value, 'bar');
    test.done();
  });
  test.equal(observableB.get(), 'foo');
  observableA.set('bar');
};

exports['CATCH: Can catch errors and current value and block further change propagation, but returns current value by default'] = function (test) {

  var observable = Observable('foo');
  var faultyObservable = observable.map(function (value) {
    return value.split('');
  })
  .catch(function (error) {
    test.equal(error.message, 'undefined is not a function');
    test.equal(error.value, true);
    test.done();
  });
  test.deepEqual(faultyObservable.get(), ['f', 'o', 'o']);
  observable.set(true);
};

exports['CATCH: Can catch promises'] = function (test) {

  var promise = function () {
    return new Promise(function (resolve, reject) {
      reject('error');
    });
  };
  var observable = Observable('foo');
  var faultyObservable = observable.promise(function (value) {
    return promise();
  })
  .catch(function (error) {
    test.equal(error.message, 'error');
    test.equal(error.value, true);
    test.done();
  });
  test.deepEqual(faultyObservable.get(), 'foo');
  observable.set(true);
};

exports['CATCH: Does not propagate when returning undefined'] = function (test) {

  var observable = Observable('foo');
  var count = 0;
  var faultyObservable = observable.map(function (value) {
    return value.split('');
  })
  .catch(function (error) {
    count++;
    setTimeout(function () {
      test.equal(error.message, 'undefined is not a function');
      test.equal(error.value, true);
      test.equal(count, 2);
      test.done();
    }, 0);
  })
  .map(function (value) {
    count++;
    return value.join('');
  });
  test.deepEqual(faultyObservable.get(), 'foo');
  observable.set(true);
};

exports['CATCH: Does propagate when returning a value'] = function (test) {

  var observable = Observable('foo');
  var count = 0;
  var faultyObservable = observable.map(function (value) {
    return value.split('');
  })
  .catch(function (error) {
    count++;
    setTimeout(function () {
      test.equal(error.message, 'undefined is not a function');
      test.equal(error.value, true);
      test.equal(count, 3);
      test.done();
    }, 0);
    return true;
  })
  .map(function (value) {
    count++;
    return value.join('');
  });
  test.deepEqual(faultyObservable.get(), 'foo');
  observable.set(true);
};
