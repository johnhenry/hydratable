import Hydratable from "./index.mjs";
let index = 0;
const output = async (object) => {
  console.log(index++);
  console.log("initial object", object);
  console.log("hydrated object", await object.hydrate()); // hydrate
  await object.hydrate();
  console.log("idempotency", object); // idempotent
  console.log("keys", Object.keys(object));
};
const HPrototype = Hydratable(function ({ finalizer }) {
  // here, hydration is defained as calculating and setting the speed property
  Object.defineProperty(this, "speed", {
    value: this.distance / this.time,
    writible: false,
    enumerable: true,
  });
  // also, we use the 'finalizer' optional argument to apply Object.freeze to the object AFTER setting the HYDRATED property
  finalizer(Object.freeze);
});
// create object with minimal constraints
const object = Object.setPrototypeOf(
  {
    time: 1000,
    distance: 100,
  },
  HPrototype
);
await output(object);
// create object with maximal constraints
const object1 = Object.create(HPrototype, {
  time: {
    value: 1000,
    writible: false,
    enumerable: true,
  },
  distance: {
    value: 100,
    writible: false,
    enumerable: true,
  },
});
await output(object1);
