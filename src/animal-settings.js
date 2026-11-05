// Restored character-specific rotor rules; current common-weapon tuning is unchanged.
export const ROTOR_RESOURCE=Object.freeze({activationMinimum:40,drain:16});
export const staminaPower=s=>.4+.6*Math.max(0,Math.min(1,s/60));
