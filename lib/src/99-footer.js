  /* --------------------------------------------------------------------------
   * 99-footer :: public surface
   * ------------------------------------------------------------------------ */
  return {
    // lifecycle
    timeline: timeline,
    place: place,
    // motion
    moveTo: moveTo,
    fade: fade,
    revealText: revealText,
    cut: cut,
    // gates
    colorGuard: colorGuard,
    payoff: payoff,
    // catalog black boxes
    wrapCatalog: wrapCatalog,
    optOut: optOut,
    // introspection / helpers
    contract: nowContract,
    frames: f,
    guardCopy: guardCopy,
    _internal: { LONG_DASH: LONG_DASH, seconds2frames: seconds2frames },
  };
});
