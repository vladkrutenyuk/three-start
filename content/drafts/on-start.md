 start() ->
 
 Bootstrap the world in a strict order:

   Phase 0 (modules):     ctx bind → onAwake(all) → onStart(all) → subscribe(all)
   Phase 1 (components):  onAwake(all)
   Phase 2 (components):  activate+start+subscribe(all enabled)

 During Phase 0 `ctx._isBootstrapping` is `true`, which makes
 `Object3DExtension.addComponent` defer activation. This means any
 components created inside a module's `onAwake`/`onStart` (including
 transitively via spawn helpers) are kept dormant until Phase 1/2 runs —
 guaranteeing modules subscribe to ctx events BEFORE any component does.

 Ordering guarantees provided:
   - `module.onAwake`/`onStart` always fire before any `component.onAwake`/`onStart`.
   - `module.onUpdate`/`onBeforeRender`/`onAfterRender` always fire before
     the corresponding method on any component (same tick).
   - A module's per-frame methods can never fire before its own `onStart`,
     even if user code manually emits events during initialization, because
     subscription is the last step of module bootstrap.