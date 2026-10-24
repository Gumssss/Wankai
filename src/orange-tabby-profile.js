// Approved prepared-v02 measurements and v06 controller. Source contacts:
// assets/concepts/orange-tabby/prepared-v02/contact-fit.json; no retuning.
const freezeShape=s=>Object.freeze({...s,a:Object.freeze(s.a),b:Object.freeze(s.b)});
const originalColliders=Object.freeze([
 {"a":[-0.670304,0.950124,-1.433035],"b":[-0.670304,0.950124,-1.433035],"radius":0.439924,"side":"L"},
 {"a":[-1.230304,0.931419,-1.433035],"b":[-1.230304,0.931419,-1.433035],"radius":0.361309,"side":"L"},
 {"a":[-0.670304,0.942236,-1.993035],"b":[-0.670304,0.942236,-1.993035],"radius":0.312491,"side":"L"},
 {"a":[-0.670304,0.934242,-1.013035],"b":[-0.670304,0.934242,-1.013035],"radius":0.366508,"side":"L"},
 {"a":[-1.090304,0.920824,-1.853035],"b":[-1.090304,0.920824,-1.853035],"radius":0.326946,"side":"L"},
 {"a":[-1.090304,0.971069,-1.013035],"b":[-1.090304,0.971069,-1.013035],"radius":0.293144,"side":"L"},
 {"a":[-0.390304,0.955726,-1.573035],"b":[-0.390304,0.955726,-1.573035],"radius":0.354972,"side":"L"},
 {"a":[-1.370304,0.938,-1.433035],"b":[-1.370304,0.938,-1.433035],"radius":0.318065,"side":"L"},
 {"a":[-0.530304,0.951867,-1.153035],"b":[-0.530304,0.951867,-1.153035],"radius":0.379264,"side":"L"},
 {"a":[-1.230304,0.958506,-1.013035],"b":[-1.230304,0.958506,-1.013035],"radius":0.250841,"side":"L"},
 {"a":[-0.530304,0.918458,-1.853035],"b":[-0.530304,0.918458,-1.853035],"radius":0.333244,"side":"L"},
 {"a":[-1.230304,0.922996,-1.993035],"b":[-1.230304,0.922996,-1.993035],"radius":0.217739,"side":"L"},
 {"a":[-0.950304,0.915742,-1.153035],"b":[-0.950304,0.915742,-1.153035],"radius":0.385578,"side":"L"},
 {"a":[-1.090304,0.889895,-1.713035],"b":[-1.090304,0.889895,-1.713035],"radius":0.363838,"side":"L"},
 {"a":[-1.510304,0.925092,-1.433035],"b":[-1.510304,0.925092,-1.433035],"radius":0.244948,"side":"L"},
 {"a":[-0.530304,0.956977,-1.573035],"b":[-0.530304,0.956977,-1.573035],"radius":0.408537,"side":"L"},
 {"a":[-1.230304,0.917565,-1.853035],"b":[-1.230304,0.917565,-1.853035],"radius":0.265501,"side":"L"},
 {"a":[-0.810304,0.932872,-2.133035],"b":[-0.810304,0.932872,-2.133035],"radius":0.189579,"side":"L"},
 {"a":[-1.230304,0.92389,-1.293035],"b":[-1.230304,0.92389,-1.293035],"radius":0.335942,"side":"L"},
 {"a":[-0.390304,0.944191,-1.433035],"b":[-0.390304,0.944191,-1.433035],"radius":0.349906,"side":"L"},
 {"a":[-0.950304,0.885466,-1.713035],"b":[-0.950304,0.885466,-1.713035],"radius":0.374745,"side":"L"},
 {"a":[-0.390304,0.955437,-1.713035],"b":[-0.390304,0.955437,-1.713035],"radius":0.314174,"side":"L"},
 {"a":[-0.670304,0.964172,-2.133035],"b":[-0.670304,0.964172,-2.133035],"radius":0.212741,"side":"L"},
 {"a":[-1.510304,0.914629,-1.293035],"b":[-1.510304,0.914629,-1.293035],"radius":0.191953,"side":"L"},
 {"a":[-0.670525,0.950307,1.437887],"b":[-0.670525,0.950307,1.437887],"radius":0.436534,"side":"R"},
 {"a":[-1.230525,0.9302,1.437887],"b":[-1.230525,0.9302,1.437887],"radius":0.362837,"side":"R"},
 {"a":[-0.670525,0.961758,1.997887],"b":[-0.670525,0.961758,1.997887],"radius":0.308904,"side":"R"},
 {"a":[-0.670525,0.933689,1.017887],"b":[-0.670525,0.933689,1.017887],"radius":0.370622,"side":"R"},
 {"a":[-1.090525,0.958568,1.857888],"b":[-1.090525,0.958568,1.857888],"radius":0.302961,"side":"R"},
 {"a":[-1.090525,0.908026,1.157887],"b":[-1.090525,0.908026,1.157887],"radius":0.360533,"side":"R"},
 {"a":[-0.390525,0.956114,1.577888],"b":[-0.390525,0.956114,1.577888],"radius":0.354706,"side":"R"},
 {"a":[-1.510525,0.924212,1.437887],"b":[-1.510525,0.924212,1.437887],"radius":0.245235,"side":"R"},
 {"a":[-0.530525,0.95233,1.157887],"b":[-0.530525,0.95233,1.157887],"radius":0.379161,"side":"R"},
 {"a":[-1.230525,0.950664,1.997887],"b":[-1.230525,0.950664,1.997887],"radius":0.215829,"side":"R"},
 {"a":[-0.530525,0.91963,1.857888],"b":[-0.530525,0.91963,1.857888],"radius":0.330691,"side":"R"},
 {"a":[-1.090525,0.892988,1.717888],"b":[-1.090525,0.892988,1.717888],"radius":0.363542,"side":"R"},
 {"a":[-1.230525,0.924943,1.017887],"b":[-1.230525,0.924943,1.017887],"radius":0.245753,"side":"R"},
 {"a":[-0.950525,0.913546,1.157887],"b":[-0.950525,0.913546,1.157887],"radius":0.386924,"side":"R"},
 {"a":[-1.370525,0.937473,1.437887],"b":[-1.370525,0.937473,1.437887],"radius":0.318054,"side":"R"},
 {"a":[-1.090525,0.936882,1.017887],"b":[-1.090525,0.936882,1.017887],"radius":0.292296,"side":"R"},
 {"a":[-0.530525,0.957355,1.577888],"b":[-0.530525,0.957355,1.577888],"radius":0.407303,"side":"R"},
 {"a":[-0.950525,0.891429,1.717888],"b":[-0.950525,0.891429,1.717888],"radius":0.379091,"side":"R"},
 {"a":[-1.230525,0.952092,1.857888],"b":[-1.230525,0.952092,1.857888],"radius":0.26132,"side":"R"},
 {"a":[-0.810525,0.936101,2.137887],"b":[-0.810525,0.936101,2.137887],"radius":0.186348,"side":"R"},
 {"a":[-0.390525,0.946604,1.297887],"b":[-0.390525,0.946604,1.297887],"radius":0.327238,"side":"R"},
 {"a":[-1.510525,0.913931,1.297887],"b":[-1.510525,0.913931,1.297887],"radius":0.194047,"side":"R"},
 {"a":[-0.670525,0.982777,2.137887],"b":[-0.670525,0.982777,2.137887],"radius":0.21299,"side":"R"},
 {"a":[-0.670525,0.951562,1.297887],"b":[-0.670525,0.951562,1.297887],"radius":0.426945,"side":"R"},
].map(freezeShape));
// Measured neutral mesh bounds, before any runtime transform. Keep the body and
// virtual joint unchanged: each paw grows about its own center, then clears the
// floor by .02 and the side of the body by .08 at the existing .35 hover.
const pawMeasurements={
 L:{center:[.947603702545166,.8910090625286102,-1.5062631368637085],size:[.9307253360748291,1.7614100575447083,1.7464559078216553]},
 R:{center:[.9480390548706055,.8918709754943848,1.5055665969848633],size:[.9308137893676758,1.7626919746398926,1.7446417808532715]},
};
export const CAT_PAW_SCALE=1.3;
export const CAT_PAW_TRANSFORMS=Object.freeze(Object.fromEntries(Object.entries(pawMeasurements).map(([side,m])=>{
 const sign=side==='L'?-1:1,scale=CAT_PAW_SCALE;
 const lift=.02-(.35+m.center[1]-scale*m.size[1]/2);
 const outward=sign*(.5733+.08+scale*m.size[2]/2)-m.center[2];
 return [side,Object.freeze({scale,center:Object.freeze(m.center),size:Object.freeze(m.size),offset:Object.freeze([0,lift,outward])})];
})));
// Physical local frame is [-modelY,modelX,modelZ]. This is also used by trails.
export function transformCatPawPoint(point,side){
 const {center:c,offset:d,scale}=CAT_PAW_TRANSFORMS[side],q=[-c[1],c[0],c[2]],delta=[-d[1],d[0],d[2]];
 return point.map((v,i)=>q[i]+scale*(v-q[i])+delta[i]);
}
const colliders=Object.freeze(originalColliders.map(s=>freezeShape({...s,
 a:transformCatPawPoint(s.a,s.side),b:transformCatPawPoint(s.b,s.side),radius:s.radius*CAT_PAW_TRANSFORMS[s.side].scale})));
const hurtShapes=Object.freeze([{"a":[-0.12,-0.29,0],"b":[-0.12,-0.05,0],"radius":0.3},{"a":[0.02,0.36,-0.05],"b":[0.02,0.46,0.05],"radius":0.48}].map(freezeShape));
export const CAT=Object.freeze({
 model:'orange-tabby-prepared-v02.glb',bodyFloor:.59,bodyRadius:.58,
 bounds:Object.freeze({min:Object.freeze([-.6198,0,-.5733]),max:Object.freeze([.6196,1.4505,.5733])}),
 hurtShapes,colliders,restTheta:Math.PI/2,hoverHeight:.35,hoverGain:25,hoverDamping:9,
 normalTurnSpeed:1.15,steeringGain:.70,contactUndercoverage:.14*CAT_PAW_SCALE,
 pawAnchors:Object.freeze({L:Object.freeze([0,0,-1.5062631368637085]),R:Object.freeze([0,0,1.5055665969848633])}),
 weapon:Object.freeze({length:1.7,offset:0,radius:.44,inertia:4.1,yawAnchorInertia:.7,
  motorAcceleration:24,brakeAcceleration:30,maxAngularSpeed:4.25,initialTheta:Math.PI/2,
  attachment:'paws',colliders}),
});
