  /* --------------------------------------------------------------------------
   * 20-primitives :: the contract-backed motion vocabulary
   *
   * Each primitive does TWO things:
   *   (1) drives the single paused GSAP timeline (real browser render), and
   *   (2) registers a machine-checkable promise + a normalized "actor track"
   *       so the outcome can be verified pixel-by-pixel.
   *
   * The actor track (contract._scene) is what the hermetic CI reference
   * renderer replays. The production HyperFrames browser render ignores it and
   * animates the real DOM; the verifier then checks the REAL frames against
   * the same promises, so the check is adversarial in deployment.
   * ------------------------------------------------------------------------ */

  var _gsap = null; // set by timeline(); primitives tween through it.
  var _tl = null;   // the single paused timeline for the whole video.

  function ease2fn(name) { return name || "power2.out"; }

  // Linear-in-frames interpolation is what the reference renderer uses; the
  // promise only asserts the START and END states (+ optional midpoints), so
  // easing choice never breaks verify, it only shapes in-between motion.
  function track(handle, prop, fromV, toV, startFrame, endFrame, ease) {
    // Tracks live ON THE ACTOR so they survive contract serialization and can
    // be replayed by the reference renderer.
    var t = handle.actor._tracks;
    t[prop] = t[prop] || [];
    t[prop].push({ f0: startFrame, f1: endFrame, v0: fromV, v1: toV, ease: ease });
  }

  /* timeline() :: MUST be called first. Enforces the mandatory single-sentence
   * message and stamps meta. Refuses to proceed without a message. */
  function timeline(opts) {
    opts = opts || {};
    assert(opts.message && String(opts.message).trim().split(/\s+/).length >= 3,
      "timeline() requires a single-sentence `message` (what the viewer should " +
      "understand after watching). Refusing to build without it.");
    guardCopy(opts.message, "timeline.message");
    var c = nowContract();
    c.meta.message = String(opts.message).trim();
    c.meta.fps = opts.fps || 30;
    c.meta.width = opts.width || 1920;
    c.meta.height = opts.height || 1080;
    assert(opts.durationFrames || opts.durationSeconds,
      "timeline() needs durationFrames or durationSeconds");
    c.meta.durationFrames = opts.durationFrames ||
      Math.round(opts.durationSeconds * c.meta.fps);
    c.meta.payoffFrame = opts.payoffFrame != null ? opts.payoffFrame
      : c.meta.durationFrames - 1;
    c.meta.proofFrames = (opts.proofFrames || []).map(function (t) {
      return seconds2frames(t, c.meta.fps);
    });
    c.meta.background = opts.background || "#0b0b0f";
    c._scene = { actors: [], cuts: [] };

    _gsap = opts.gsap || (win().gsap);
    // In the browser we build ONE paused timeline. Under Node (extraction),
    // gsap may be a stub; paused:true keeps it inert either way.
    _tl = _gsap ? _gsap.timeline({ paused: true }) : null;
    return {
      _tl: _tl,
      duration: c.meta.durationFrames,
      fps: c.meta.fps,
    };
  }

  function f(t) { return seconds2frames(t, nowContract().meta.fps); }

  /* place() :: introduce a visual actor. Returns a handle other primitives
   * animate. `target` is the DOM selector for the real render; shape/color/
   * geometry drive the reference renderer AND become the promise's baseline. */
  function place(id, spec) {
    spec = spec || {};
    guardCopy(spec.text, "place(" + id + ").text");
    var c = nowContract();
    var actor = {
      id: id,
      target: spec.target || ("#" + id),
      shape: spec.shape || "rect",           // rect | ellipse | text
      color: spec.color || "#e6e6ef",
      text: spec.text != null ? spec.text : null,
      fontPx: spec.fontPx || 64,
      // geometry is normalized 0..1 of the frame (resolution independent).
      x: spec.x != null ? spec.x : 0.5,
      y: spec.y != null ? spec.y : 0.5,
      w: spec.w != null ? spec.w : 0.2,
      h: spec.h != null ? spec.h : 0.2,
      opacity: spec.opacity != null ? spec.opacity : 1,
      enterFrame: spec.enterFrame != null ? spec.enterFrame : 0,
      _tracks: {},
    };
    var handle = { id: id, actor: actor };
    c._scene.actors.push(actor);
    return handle;
  }

  /* moveTo() :: translate an actor between two states over a frame span.
   * Registers a POSITION promise: at endFrame the actor centroid is at (to). */
  function moveTo(handle, o) {
    o = o || {};
    var c = nowContract();
    var s = f(o.start != null ? o.start : 0);
    var e = f(o.end != null ? o.end : c.meta.durationFrames - 1);
    var fromX = o.fromX != null ? o.fromX : handle.actor.x;
    var fromY = o.fromY != null ? o.fromY : handle.actor.y;
    var toX = o.toX != null ? o.toX : handle.actor.x;
    var toY = o.toY != null ? o.toY : handle.actor.y;
    track(handle, "x", fromX, toX, s, e, o.ease);
    track(handle, "y", fromY, toY, s, e, o.ease);
    handle.actor.x = toX; handle.actor.y = toY;
    if (_tl && _gsap) {
      _tl.fromTo(handle.actor.target,
        { xPercent: 0 }, { duration: (e - s) / c.meta.fps, ease: ease2fn(o.ease) },
        s / c.meta.fps);
    }
    registerPromise({
      id: handle.id + ":pos@" + e,
      type: "centroid",
      target: handle.id,
      atFrame: e,
      expect: { x: toX, y: toY },
      tol: o.tol != null ? o.tol : 0.04, // fraction of frame diagonal
    });
    return handle;
  }

  /* fade() :: opacity ramp. Registers an OPACITY promise at the end state. */
  function fade(handle, o) {
    o = o || {};
    var c = nowContract();
    var s = f(o.start != null ? o.start : 0);
    var e = f(o.end != null ? o.end : s + c.meta.fps);
    var from = o.from != null ? o.from : handle.actor.opacity;
    var to = o.to != null ? o.to : 1;
    track(handle, "opacity", from, to, s, e, o.ease);
    handle.actor.opacity = to;
    if (s <= handle.actor.enterFrame) handle.actor.enterFrame = s;
    registerPromise({
      id: handle.id + ":opacity@" + e,
      type: "presence",
      target: handle.id,
      atFrame: e,
      expect: { present: to > 0.5 },
    });
    return handle;
  }

  /* revealText() :: set/animate an actor's text and assert the text region is
   * non-empty (ink present) at the reveal frame. Copy is dash-guarded. */
  function revealText(handle, o) {
    o = o || {};
    guardCopy(o.text, "revealText(" + handle.id + ")");
    var c = nowContract();
    var at = f(o.at != null ? o.at : 0);
    if (o.text != null) handle.actor.text = o.text;
    handle.actor.shape = "text";
    track(handle, "opacity", 0, 1, at, at + Math.round(c.meta.fps * (o.rise || 0.4)), o.ease);
    handle.actor.opacity = 1;
    registerPromise({
      id: handle.id + ":ink@" + (at + 1),
      type: "ink",           // rendered text region must contain ink (non-bg pixels)
      target: handle.id,
      atFrame: at + Math.round(c.meta.fps * (o.rise || 0.4)),
      expect: { nonEmpty: true },
    });
    return handle;
  }

  /* cut() :: a camera cut/move INSIDE the single timeline. Never a new MP4.
   * Records the cut boundary so the reviewer's proof/contact tooling can find
   * scene edges, and (optionally) asserts a first-content promise after it. */
  function cut(o) {
    o = o || {};
    var c = nowContract();
    var at = f(o.at != null ? o.at : 0);
    c._scene.cuts.push({ atFrame: at, label: guardCopy(o.label, "cut.label") || ("cut@" + at) });
    return at;
  }

  /* colorGuard() :: "what must NOT appear early." Asserts a forbidden color is
   * absent from a region before a frame (e.g. no payoff logo before the hook
   * lands). A pure emergent-property check: not derivable from any tween. */
  function colorGuard(o) {
    o = o || {};
    assert(o.forbidHex, "colorGuard needs forbidHex");
    var c = nowContract();
    registerPromise({
      id: "guard:" + o.forbidHex + "<" + (o.beforeFrame != null ? f(o.beforeFrame) : "?"),
      type: "absent-color",
      forbidHex: o.forbidHex,
      beforeFrame: f(o.beforeFrame),
      region: o.region || { x: 0, y: 0, w: 1, h: 1 }, // normalized
      tol: o.tol != null ? o.tol : 24,               // per-channel 0..255
    });
  }

  /* payoff() :: mark the payoff frame + assert it is not blank (ink present
   * somewhere). firstFrame is asserted non-blank too. */
  function payoff(o) {
    o = o || {};
    var c = nowContract();
    if (o.at != null) c.meta.payoffFrame = f(o.at);
    registerPromise({
      id: "payoff:nonblank@" + c.meta.payoffFrame,
      type: "nonblank",
      atFrame: c.meta.payoffFrame,
      expect: { nonBlank: true },
    });
    registerPromise({
      id: "first:nonblank@" + c.meta.firstFrame,
      type: "nonblank",
      atFrame: c.meta.firstFrame,
      expect: { nonBlank: true },
    });
  }
