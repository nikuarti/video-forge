  /* --------------------------------------------------------------------------
   * 30-catalog :: black-box wrappers
   *
   * The official HyperFrames catalog (queried LIVE via `npx hyperframes
   * catalog`, never vendored) is a BLACK BOX to the verifier. Any catalog
   * moment MUST be either:
   *   (a) wrapped in a hand-registered contract promise (wrapCatalog), or
   *   (b) an explicit, documented verify opt-out with a one-line WHY
   *       (optOut).
   * Silently using a catalog item with neither is a review finding.
   * ------------------------------------------------------------------------ */

  /* wrapCatalog() :: attach a hand-authored promise to a catalog moment so it
   * is still gated. `promise` is any promise object (nonblank/ink/absent-color
   * /centroid/presence) describing what MUST be true where the catalog item
   * renders. */
  function wrapCatalog(id, promise) {
    assert(promise && promise.type, "wrapCatalog(" + id + ") needs a typed promise");
    promise.id = promise.id || ("catalog:" + id + "@" + (promise.atFrame != null ? promise.atFrame : "?"));
    promise.catalog = id;
    return registerPromise(promise);
  }

  /* optOut() :: documented escape hatch. Recorded so review can list every
   * ungated moment and confirm each has a WHY. */
  function optOut(id, reason) {
    registerOptOut(id, reason);
  }
