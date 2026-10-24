// First coordinated balance trial. Keep resource/character/round rules in one
// place so controllers, HUD, training and contact slices cannot disagree.
export const STAMINA=Object.freeze({max:200,swingDrain:20,turnDrain:10,
  recoveryDelay:.6,recoveryRate:24,lowThreshold:60,minPower:.4});
export const staminaPower=stamina=>STAMINA.minPower+(1-STAMINA.minPower)*
  Math.max(0,Math.min(1,stamina/STAMINA.lowThreshold));
export const ROTOR_RESOURCE=Object.freeze({activationMinimum:40,drain:16});
export const HOVER_DRAG=Object.freeze({air:.15,supported:1.5,fadeHeight:.75});
export const CHARACTER_HEALTH=Object.freeze({'basic-fighter':100,'beagle':80,'yellow-blob':110,'orange-tabby':150});
export const HAMMER_HEAD_DAMAGE=1.45;
export const ROUND_RULES=Object.freeze({duration:120,pressureStart:45,contractionTime:60,
  finalRadiusFraction:.32,outsideGrace:2,outsideDamageFraction:.10});
