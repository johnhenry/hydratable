const HYDRATED = Symbol("hydrated");
const Hydratable = (hydrate, name = "hydrate") => {
  const PRTOTOTYPE = {
    async [name]() {
      // should not be called directly on prototype object,
      // but rather from inherritor
      if (this.hasOwnProperty(name)) {
        throw new Error(`${name}(...) must not be called from prototype`);
      }
      // return object if alreay hydrated
      if (this[HYDRATED]) {
        return this;
      }
      // finalize may be set during hydration
      let finalize;
      // perform hydratoion
      await hydrate.call(this, {
        finalizer: (func) => {
          finalize = func;
        },
      });
      // set HYDRATED flag
      Object.defineProperty(this, HYDRATED, {
        configurable: false,
        value: true,
        writible: false,
      });
      // apply finalize after hydration
      if (typeof finalize === "function") {
        await finalize.call(this, this);
      }
      // return hydrated object
      return this;
    },
  };
  return PRTOTOTYPE;
};
export default Hydratable;
export { HYDRATED };
