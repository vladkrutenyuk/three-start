export const assertDefined = <T>(value: T | null | undefined, name: string): T => {
	if (!value)
		throw new ReferenceError(`Attempted to access '${name}' before it was initialized.`);
	return value;
};
