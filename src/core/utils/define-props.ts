export const defineProps = Object.defineProperties;

export const readOnly = (value: any): PropertyDescriptor => ({
	value,
	writable: false,
	configurable: false,
});
export const notEnumer = (value: any): PropertyDescriptor => ({
	value,
	enumerable: false,
	configurable: true,
});

/**
 * Returns a Proxy wrapping `target` that forwards reads but throws on any mutation
 * (set / delete / defineProperty / setPrototypeOf). Use to expose an internal
 * mutable object as a read-only view for third-party code.
 */
export function createReadonlyView<T extends object>(target: T, label: string): T {
	const deny = (): never => {
		throw new Error(`[three-start] ${label} is read-only.`);
	};
	return new Proxy(target, {
		set: deny,
		deleteProperty: deny,
		defineProperty: deny,
		setPrototypeOf: deny,
	});
}
