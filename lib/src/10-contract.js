  /* --------------------------------------------------------------------------
   * 10-contract :: window.__motionContract
   * The global, machine-checkable promise ledger. Primitives append promises
   * here at composition-build time (synchronously, no animation required), so
   * the contract can be extracted headlessly under Node with a GSAP stub.
   * ------------------------------------------------------------------------ */

  function win() {
    return typeof window !== "undefined" ? window : globalThis;
  }

  function doc() {
    var w = win();
    return w.document || null;
  }

  function nowContract() {
    var w = win();
    if (!w.__motionContract) {
      w.__motionContract = {
        version: 1,
        // meta is filled by timeline(); verifier reads fps/dims/duration/message.
        meta: {
          message: null,       // the single mandatory sentence (see timeline())
          fps: null,
          width: null,
          height: null,
          durationFrames: null,
          firstFrame: 0,
          payoffFrame: null,
          proofFrames: [],     // timestamps the reviewer must find "proof" at
        },
        promises: [],          // machine-checkable motion promises
        optOuts: [],           // documented verify opt-outs (catalog black boxes)
        _ids: {},              // id -> true (uniqueness guard)
      };
    }
    return w.__motionContract;
  }

  function assert(cond, msg) {
    if (!cond) throw new Error("[motion-kit] " + msg);
  }

  // Long-dash guard. No em/en dashes in on-screen copy, ever. (Invariant.)
  var LONG_DASH = /[‒–—―−]|--/;
  function guardCopy(text, where) {
    if (text == null) return text;
    assert(
      !LONG_DASH.test(String(text)),
      'long dash in copy at ' + (where || "?") +
      ': "' + text + '". Use a period, comma, colon, or "to".'
    );
    return text;
  }

  function seconds2frames(t, fps) {
    // Accepts frames (int) or "1.5s" / number-of-seconds via {s:...}. Default: frames.
    if (t == null) return null;
    if (typeof t === "object" && t.s != null) return Math.round(t.s * fps);
    return Math.round(t);
  }

  function registerPromise(p) {
    var c = nowContract();
    assert(p && p.id, "promise needs an id");
    assert(!c._ids[p.id], "duplicate promise id: " + p.id);
    c._ids[p.id] = true;
    assert(p.type, "promise " + p.id + " needs a type");
    c.promises.push(p);
    return p;
  }

  function registerOptOut(id, reason) {
    var c = nowContract();
    assert(reason && String(reason).trim().length > 3,
      "verify opt-out for " + id + " needs a one-line WHY at the call site");
    c.optOuts.push({ id: id, reason: String(reason).trim() });
  }
