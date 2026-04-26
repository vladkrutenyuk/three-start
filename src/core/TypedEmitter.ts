import EventEmitter from "eventemitter3";

/**
 * Shape used to describe typed events: `{ eventName: [arg1, arg2, ...] }`.
 * Args are always a tuple — use `[]` for events with no payload.
 */
export type EventMap = Record<PropertyKey, any[]>;

/**
 * Minimal typed event emitter — exposes only `on`/`off`/`once` publicly,
 * keeps `emit` as `protected` so only the owning class can fire its own events.
 *
 * The inner `eventemitter3` instance is allocated lazily on the first `on`/`once`,
 * so classes that extend `TypedEmitter` but never get a subscriber cost only
 * one reference slot per instance.
 */
export class TypedEmitter<T extends EventMap = {}> {
	private _ee?: EventEmitter;

	on<K extends keyof T & (string | symbol)>(
		event: K,
		fn: (...args: T[K]) => void,
		context?: any,
	): this {
		(this._ee ??= new EventEmitter()).on(event as any, fn as any, context);
		return this;
	}

	once<K extends keyof T & (string | symbol)>(
		event: K,
		fn: (...args: T[K]) => void,
		context?: any,
	): this {
		(this._ee ??= new EventEmitter()).once(event as any, fn as any, context);
		return this;
	}

	off<K extends keyof T & (string | symbol)>(
		event: K,
		fn?: (...args: T[K]) => void,
		context?: any,
		once?: boolean,
	): this {
		this._ee?.off(event as any, fn as any, context, once);
		return this;
	}

	protected emit<K extends keyof T & (string | symbol)>(
		event: K,
		...args: T[K]
	): boolean {
		return this._ee?.emit(event as any, ...args) ?? false;
	}

	/** @internal */
	_removeAllListeners(): void {
		this._ee?.removeAllListeners();
	}
}
