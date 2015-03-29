# observable-state
Observables for creating reactive functional state in applications

### Concept
There is a storm of new practices in application development, especially handling the state of your application. Flux is one approach that has spread like wildfire. It uses a concept of stores and a dispatcher. OM cursors is a different approach. You have a single state tree where you can point to values and listen for updates. These approaches have their benefits and challenges.

**observable-state** has more in common with OM cursors than FLUX in regards of storing state, but opens up for a functional and reactive way to update and grab the state. This might not make any sense to you, it did not to me before I started this project, so please read [this article]() explaining why you would consider using functional reactive programming.

The API **observable-state** exposes is very accessible. You have other libraries like Rx, Bacon.js etc., but these are not very accessible in the sense of handling your application state.

### API

- [Observable](Observable)
  - [get](get)
  - [set](set)
  - [setSync](setSync)
  - [onChange](onChange)
  - [catch](catch)
  - [map](map)
  - [reduce](reduce)
  - [filter](filter)
  - [debounce](debounce)
  - [key](key)
  - [promise](promise)
- [Observable.merge](Observable.merge)
- [Observable.mergeValues](Observable.mergeValues)
- [Observable.fromEvents](fromEvents)

#### Observable
You can observe any primitive and object, except when passing a function.
```js
var value = Observable('foo');
```

##### get
```js
var value = Observable('foo');
value.get(); // "foo"
```

##### set
Setting new values are async, but the propagation of updating observers is synchronous. This keeps updates predictable. So each `set` will start on the next tick of the event loop, but the work they do will be done within the same tick.
```js
var value = Observable('foo');
value.set('bar');
value.get(); // "foo"
// Next tick
value.get(); // "bar"
```

You can also set an observable as a value. This effectively links observables.
```js
var valueA = Observable('foo');
var valueB = Observable(valueA);
valueB.get(); // "foo"
valueA.set('bar');
// Next tick
valueB.get(); // "bar"
```

##### setSync
You can override the default async behavior of set, but it may have performance impact in larger applications.
```js
var value = Observable('foo');
value.set('bar');
value.get(); // "bar"
```

##### onChange
Listen to changes on an observable. The value returned is a function that unsubscribes from getting the changes.
```js
var value = Observable('foo');
var unsubscribe = value.onChange(function (value) {
  value; // "bar"
  usubscribe(); // This function will not run on changes any more
});
value.set('bar');
```

##### catch
If any observable or observables it depends on other causes an error it can be catched by this method.
```js
var array = Observable(['foo', 'bar']);

// More on map soon
var reversed = array.map(function (value) {
  return value.reverse();
});
reversed.onError(function (error) {
  error; // TypeError: Undefined is not a function
});
array.set('foo');
```

##### map
Observe a value and based on that return a new value.
```js
var someValue = Observable('foo');
var splitValue = someValue.map(function (value) {
  return value.split('');
});
splitValue.get(); // ['f', 'o', 'o']
splitValue.onChange(function (value) {
  value; // ['b', 'a', 'r']
});
someValue.set('bar');
```

##### reduce
Accumulate existing value with new changes.
```js
var count = Observable(3);
var accCount = count.reduce(function (current, newCount) {
  return current + newCount;
});
accCount.get(); // 3
accCount.onChange(function (value) {
  value; // 9
});
count.set(6);
```

##### filter
Block changes that do not match filter.
```js
var observable = Observable('foo');
var valuesContainingFObservable = observable.filter(function (value) {
  return value.indexOf('f') >= 0;
}); 
valuesContainingFObservable.get(); // "foo"
valuesContainingFObservable.onChange(function (value) {
  value; // Runs once, logging "foobar"
});
observable.set('bar');
observable.set('foobar');
```

##### debounce
Passes latest change within set interval. 
```js
var observable = Observable('foo');
var debouncedObservable = observable.debounce(200);
debouncedObservable.get(); // "foo"
debouncedObservable.onChange(function (value) {
  value; // "bar3"
});
observable.set('bar');
setTimeout(function () {
  observable.set('bar2');
  setTimeout(function () {
    observable.set('bar3');
  }, 50);
}, 100);
```

##### key
Lets you easily convert a value to a key/value pair.
```js
var observable = Observable('bar');
var observableState = observable.key('foo');
observableState.get(); // { foo: 'bar' }
observableState.onChange(function (value) {
  value; // "foobar"
});
observable.set('foobar');
```

##### promise
Lets you define a function that returns a promise. The fullfilment of the promise will either trigger a change or be passed to a `catch` handler on rejection.
```js
var observable = Observable();
var getUserObservable = observable.promise(function (value) {
  return ajaxPromise.get('/users/' ´value);
});
getUserObservable.onChange(function (value) {
  value; // {id: 123, name: 'John Doe'}
});
observable.set(123);
```

#### Observable.merge
Lets you merge observables into one new observable. The first observable passed will be the initial value of the new observable
```js
var observableA = Observable('foo');
var observableB = Observable('bar');
var mergedObservable = Observable.merge(observableA, observableB);
mergedObservable.get(); // "foo"
mergedObservable.onChange(function (value) {
  value; // "foobar"
});
observableB.set('foobar');
```

You can also merge by using a map:
```js
var observableA = Observable('foo');
var observableB = Observable('bar');
var mergedObservable = Observable.merge({
  c: observableA,
  d: observableB
});
mergedObservable.get().c; // "foo"
mergedObservable.onChange(function (value) {
  value; // {c: 'foo', d: 'foobar'}
});
observableB.set('foobar');
```

#### Observable.mergeValues
Lets you merge observables where the value is an object to one observable where the objects have been merged:
```js
var observableA = Observable({
  foo: 'bar'
});
var observableB = Observable({
  foo2: 'bar2'
});
var mergedObservable = Observable.mergeValues(observableA, observableB);
mergedObservable.get().foo; // "bar"
mergedObservable.onChange(function (value) {
  value; // {foo: 'bar', foo2: 'foobar'}
});
observableB.set('foobar');
```
