export interface ThreeStartRegister {}

export type RegisterField<
	TKey extends string,
	TFallback = unknown,
> = TKey extends keyof ThreeStartRegister ? ThreeStartRegister[TKey] : TFallback;
