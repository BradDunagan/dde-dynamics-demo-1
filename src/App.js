/*
		 1         2         3         4         5         6         7         8
12345678901234567890123456789012345678901234567890123456789012345678901234567890

	App.js

*/

import React 				from 'react';
import * as THREE 			from 'three';
import { GUI }				from 'dat.gui';
import { OrbitControls }	from './OrbitControls';

import dynamics				from './dynamics';
import Dexter				from './dexter';
import sim					from './sim';

import JointData			from './joint-data';
import Controls				from './controls';

import './App.css';


class ColorGUIHelper {
	constructor(object, prop) {
		this.object = object;
		this.prop = prop; 
	}
	get value() {
		return `#${this.object[this.prop].getHexString()}`;
	}
	set value(hexString) {
		this.object[this.prop].set(hexString);
	}
}	//	ColorGUIHelper

class App extends React.Component {
	constructor ( props ) {
		super ( props );
		this.state = { }

		this.renderer3D = null;

		this.fov	= 0;
		this.aspect	= 0;
		this.near	= 0;
		this.far	= 0;
		this.camera = null;

		this.canvas	= null;

		this.scene	= null;

		this.ground = null;
		this.blocks	= {};

		this.light	= null;

		this.clock	= null;

		this.createGround		= this.createGround.bind ( this );
		this.createBlocks		= this.createBlocks.bind ( this );
		this.createBlock		= this.createBlock.bind ( this );
		this.createCop			= this.createCop.bind ( this );

		this.draw_legs 			= this.draw_legs.bind ( this );
		this.draw_arm			= this.draw_arm.bind ( this );
		this.draw_coord_frame	= this.draw_coord_frame.bind ( this );

		this.runScript			= this.runScript.bind ( this );
		this.cycleBoundingBox	= this.cycleBoundingBox.bind ( this );
		this.resizeRendererToDisplaySize
							= this.resizeRendererToDisplaySize.bind ( this );

	//	this.kp =  100;			//	Spring
	//	this.kp = 6500;			//	Spring
		this.kp =  400;			//	Spring
	//	this.kd =   20;			//	Damping
	//	this.kd =  150;			//	Damping
		this.kd =   80;			//	Damping

		this.jt	= {};			//	Joint target values.

		this.updateGauges		= this.updateGauges.bind ( this );

		this.chainLink			= this.chainLink.bind (this );
		this.gatherBoundingBoxes	= this.gatherBoundingBoxes.bind ( this );
		this.createBoundingBox	= this.createBoundingBox.bind ( this );
		this.getLinks			= this.getLinks.bind ( this );

		this.render3D			= this.render3D.bind ( this );

		this.doAll				= this.doAll.bind ( this );

		this.h_count = 0;

		this.fncControls = null;
		this.fncJoint1Gauges = null;
		this.fncJoint2Gauges = null;
		this.fncJoint3Gauges = null;
		this.fncJoint4Gauges = null;
		this.fncJoint5Gauges = null;

		//	HiRes Dexter
		this.c0c0 = null;
	//	this.base = null;
	//	this.link1 = null;
	//	this.link2 = null;
	//	this.link3 = null;
	//	this.link4 = null;
	//	this.link5 = null;

		//	To debug collisions.
		//	Collision Object Positions
		this.cops	= {};
		
		//	Velocity Zero Callback. For running "scripts".
		this.v0CB		= null;
		//	Try to average the velocities across multiple frames.
		this.jvAbsMax	= [];

		this.HiResBBs 	= [];
		this.HiResBB	= null;
		this.iHiResBB	= 0;
		
		this.bHiResMoveEnabled	= true;

	}	//	constructor()

	createGround ( parent ) {
		let w = 2, l = 2, h = 1;
		dynamics.createGround ( w, l, h );
		const geo = new THREE.BoxGeometry ( w, h, l ); 
		const mat = new THREE.MeshPhongMaterial ( { color: '#8AC' } );
		let ground = new THREE.Mesh ( geo, mat );
			ground.castShadow = true;
			ground.position.y = -2.01;
			ground.visible = false;		//	For now. Use the checker board.
		parent.add ( ground );
		return ground;
	}	//	createGround()

	createBlocks ( parent ) {
		let self = this;
		let numBlocks = 24, iBlock = 0;
		let color = '833';
		function next() {
			if ( iBlock >= numBlocks ) {
				return; }
			//	Name 'block-a', 'block-b', 'block-c', ...
			let name = 'block-' 
				+ String.fromCharCode ( 'a'.charCodeAt ( 0 ) + iBlock );
			//	Cycle the colors red, green, blue, red, green, ...
			color = color.slice ( 1 ) + color.slice ( 0, 1 );
			let block = self.createBlock ( name, parent, 0.04, 0.04, 0.04, 
										   '#' + color );
			self.blocks[name] = block;
			iBlock += 1;
			window.setTimeout ( next, 500 ); }
		next();
	}	//	createBlocks()

	createBlock ( name, parent, w, l, h, color ) {
		dynamics.createBlock ( name, w, l, h );
		const geo = new THREE.BoxGeometry ( w, h, l );
	//	const mat = new THREE.MeshPhongMaterial ( { color: '#8AC' } );
		const mat = new THREE.MeshPhongMaterial ( 
			{ color: (typeof color === 'string') ? color: '#683' } );
		let block = new THREE.Mesh ( geo, mat );
			block.castShadow = true;
		parent.add ( block );
		this.blocks[name] = block;
		return block;
	}	//	createBlock()

	createCop ( parent, w, l, h, delta, color ) {
		w += (typeof delta === 'number') ? delta : 0.005;
		l += (typeof delta === 'number') ? delta : 0.005;
		h += (typeof delta === 'number') ? delta : 0.005;
		const geo		= new THREE.BoxGeometry ( w, h, l );
		const wireframe	= new THREE.WireframeGeometry ( geo );
		const lines		= new THREE.LineSegments ( wireframe );
		let mat	= lines.material;
		if ( color ) {
			mat.color = color; }
		else {
			mat.color		= new THREE.Color ( 1, 1, 1 );
			mat.depthTest	= true;
			mat.opacity		= 0.25;
			mat.transparent	= true; }
		if ( parent ) {
			parent.add ( lines ); }
		return lines;;
	}	//	createCop()
	
	draw_legs ( parent, width, length ) {
		const legGeo = new THREE.BoxGeometry ( length, width, width );
	//	const legMat = new THREE.MeshPhongMaterial ( { color: '#8AC' } );
		const legMat = new THREE.MeshPhongMaterial ( { color: Dexter.COLOR } );
		var angle_between_legs_in_rad = (2 * Math.PI) / 6;
		for ( var i = 0; i < 6; i++ ) {
			var leg = new THREE.Mesh ( legGeo, legMat );
			leg.castShadow = true;
			leg.position.x = length / 2.0;
			var pivotleg = new THREE.Object3D();
			pivotleg.rotation.y = angle_between_legs_in_rad * i;
			pivotleg.add ( leg );
			parent.add ( pivotleg );
		}
	}	//	draw_legs()

	draw_arm ( parent, width, height ) {
		const armGeo = new THREE.BoxGeometry ( width, height, width );
	//	const armMat = new THREE.MeshPhongMaterial ( { color: '#8AC' } );
		const armMat = new THREE.MeshPhongMaterial ( { color: Dexter.COLOR } );

		var arm = new THREE.Mesh ( armGeo, armMat );
		arm.castShadow = true;
		arm.position.y = (height / 2.0) - (width / 2.0);
		parent.add ( arm );
		return arm;
	}

	draw_coord_frame ( parent, scale ) {

		let radCyl = 0.02;
		let lenCyl = 1.0;
		let radCon = radCyl * 2.0;
		let hgtCon = radCyl * 3.0;

		let mtxScale = new THREE.Matrix4();
		mtxScale.makeScale ( scale, scale, scale );

		function arrow ( color, mtxCyl, mtxCon ) {
			let geo = null, mat = null, cylinder = null, cone = null;
			geo = new THREE.CylinderGeometry ( radCyl,		//	radiusTop
											   radCyl,		//	radiusBottom
											   lenCyl );	//	height
		//	mat = new THREE.MeshBasicMaterial ( { color: color } );
			mat = new THREE.MeshPhongMaterial ( { color: color } );
			cylinder = new THREE.Mesh ( geo, mat );
			cylinder.applyMatrix ( mtxCyl.multiply ( mtxScale ) );
			parent.add ( cylinder );

			geo    = new THREE.ConeGeometry ( radCon,		//	base radius
											  hgtCon );		//	height
		//	mat    = new THREE.MeshBasicMaterial ( { color: color } );
			cone   = new THREE.Mesh ( geo, mat );
			cone.applyMatrix ( mtxCon.multiply ( mtxScale ) );
			parent.add ( cone ); }

		let vec = null, mtxCyl = null, mtxCon = null;

		mtxCyl = new THREE.Matrix4();
		mtxCyl.makeRotationZ ( -Math.PI / 2 );
		vec = new THREE.Vector3 ( lenCyl / 2, 0, 0 );
		mtxCyl.setPosition ( vec.multiplyScalar ( scale ) );
		mtxCon = new THREE.Matrix4();
		mtxCon.makeRotationZ ( -Math.PI / 2 );
		vec = new THREE.Vector3 ( lenCyl + (hgtCon / 2), 0, 0 );
		mtxCon.setPosition ( vec.multiplyScalar ( scale ) );
		arrow ( 0xFF0000, mtxCyl, mtxCon );
			
		mtxCyl = new THREE.Matrix4();
		vec = new THREE.Vector3 ( 0, lenCyl / 2, 0 );
		mtxCyl.setPosition ( vec.multiplyScalar ( scale ) );
		mtxCon = new THREE.Matrix4();
		vec = new THREE.Vector3 ( 0, lenCyl + (hgtCon / 2), 0 );
		mtxCon.setPosition ( vec.multiplyScalar ( scale ) );
		arrow ( 0x00FF00, mtxCyl, mtxCon );
		
		mtxCyl = new THREE.Matrix4();
		mtxCyl.makeRotationX ( Math.PI / 2 );
		vec = new THREE.Vector3 ( 0, 0, lenCyl / 2 );
		mtxCyl.setPosition ( vec.multiplyScalar ( scale ) );
		mtxCon = new THREE.Matrix4();
		mtxCon.makeRotationX ( Math.PI / 2 );
		vec = new THREE.Vector3 ( 0, 0, lenCyl + (hgtCon / 2) );
		mtxCon.setPosition ( vec.multiplyScalar ( scale ) );
		arrow ( 0x0000FF, mtxCyl, mtxCon );
	}	//	draw_coord_frame()

	runScript ( o ) {
		const sW = 'App runScript()';
		console.log ( sW );
		
		let j1 = this.jt['J1'].ctrl;
		let j2 = this.jt['J2'].ctrl;
		let j3 = this.jt['J3'].ctrl;
		let j4 = this.jt['J4'].ctrl;
		let j5 = this.jt['J5'].ctrl;

		let script = [
			{ j1:  40, 	j2:  74,	j3:  76,	j4:  48,  j5: -80,	v0: 0.2 },
			{ j1:  32,  											v0: 0.20 },
			{ j1:  30,  											v0: 0.08 },
			{ j1:  28,  											v0: 0.08 },
			{ j1:  26,  											v0: 0.08 },
			{ j1:  24,  											v0: 0.08 },
			{ j1:  22,  											v0: 0.08 },
			{ j1:  20,  											v0: 0.08 },
			{ j1:  18,  											v0: 0.08 },
			{ j1:  16,  											v0: 0.08 },
			{ j1:  14,  											v0: 0.08 },
			{ 			j2:  56, 	j3:  123,						v0: 0.2 },
			{ j1: -20, 							j4:  4,	  j5: 143,	v0: 0.08 },
			{ 			j2:  80, 	j3:  90,						v0: 0.08 },
			{ 			j2:  82,	j3:  84,	j4:  8,   j5: 130,	v0: 0.08 },
			{ 						j3:  76,						v0: 0.08 },
			{ 			j2:  56, 	j3:  123,						v0: 0.08 },
			{ j1:   0,  											v0: 0.20 } ];

		let self = this;
		let is = 0;

		function next() {
			if ( is >= script.length ) {
				self.v0CB = null;
				return; }
			let s = script[is];
			if ( s.j1 ) {
				j1.setValue ( s.j1 ); }
			if ( s.j2 ) {
				j2.setValue ( s.j2 ); }
			if ( s.j3 ) {
				j3.setValue ( s.j3 ); }
			if ( s.j4 ) {
				j4.setValue ( s.j4 ); }
			if ( s.j5 ) {
				j5.setValue ( s.j5 ); }
			self.v0CB = { is: is, v0: s.v0, cb: next } 
			self.jvAbsMax = [];
			is += 1;
		}

		next();
	}	//	runScript()

	cycleBoundingBox ( o ) {
		const sW = 'App cycleBoundingBox()';
		console.log ( sW );
		if ( (o.iLink < 0) || (o.iLink >= this.HiResBBs.length) ) {
			return; }
		let bbs = this.HiResBBs[o.iLink];
		if ( this.HiResBB ) {
			this.scene.remove ( this.HiResBB.helper );
			this.HiResBB.helper = this.HiResBB = null; 
			this.iHiResBB += 1;
			if ( this.iHiResBB >= bbs.length ) {
				this.iHiResBB = 0; } }
		let i = this.iHiResBB;
		if ( i >= bbs.length ) {
			i = this.iHiResBB = 0; }
		let bb = bbs[i];
		if ( bb ) {
			if ( bb.obj ) {
				console.log ( sW + ': i ' + i 
								 + '  obj  name: ' + bb.obj.name ); }
			if ( bb.mesh ) {
				console.log ( sW + ': i ' + i 
								 + '  mesh name: ' + bb.mesh.name ); }


		//	bb.helper = new THREE.BoxHelper ( bb.obj, 0xFFFFFF );
		//	bb.helper.update();
		//	this.scene.add ( bb.helper );

			let bbox = null;
			if ( bb.obj ) {
				bbox  = new THREE.Box3();
				bbox.setFromObject ( bb.obj ); }
			if ( bb.mesh ) {
				bb.mesh.geometry.computeBoundingBox();
				bbox = bb.mesh.geometry.boundingBox; }
				
			bb.helper = new THREE.Box3Helper ( bbox, 0xFFFFFF );
			bb.helper.updateMatrixWorld ( true );
			this.scene.add ( bb.helper );
			
			//	To set the helper's matrix, rotation. ?
			this.renderer3D.render ( this.scene, this.camera ); 

			let lp = Dexter.HiRes.link2.getWorldPosition();
			let bbSize = new THREE.Vector3();
			bbox.getSize ( bbSize );
			console.log ( sW + ': bbSize ' + bbSize.x
							 + '  ' + bbSize.y
							 + '  ' + bbSize.z );
			console.log ( sW + ': lp ' + lp.x + '  ' + lp.y + '  ' + lp.z );
			let p = bb.helper.position;
			console.log ( sW + ':  p ' + p.x + '  ' + p.y + '  ' + p.z );
			let q = bb.helper.quaternion;
			console.log ( sW + ':  q ' + q.x + '  ' + q.y + '  ' + q.z );
			this.HiResBB = bb; }

	}	//	cycleBoundingBox()


	resizeRendererToDisplaySize() {
		let h = this.canvas.parentElement.clientHeight;
		this.canvas.style.height = h + 'px';

		const pixelRatio = window.devicePixelRatio;
	//	const pixelRatio = 1;

		const width  = this.canvas.clientWidth  * pixelRatio | 0;
		const height = this.canvas.clientHeight * pixelRatio | 0;
		
		const needResize =    this.canvas.width  !== width 
						   || this.canvas.height !== height;

		this.h_count += 1;
		if ( this.h_count % 100 === 0 ) {
			console.log ( 'height: ' + height ); }
		
		if ( needResize ) {
			this.renderer3D.setSize ( width, height, false );
		}
		return needResize;
	}

	updateGauges ( fncGauges, pos, vel, trq ) {
		if ( typeof fncGauges !== 'function' ) {
			return; }
		let deg = pos * 180 / Math.PI;
		deg = Math.round ( deg * 10 ) / 10;

		vel = Math.round ( vel * 10 ) / 10;

		let sign = trq < 0 ? -1 : 1;
		let trqAbs = Math.abs ( trq );
		let trqLg  = null;
		trqLg = Math.log10 ( trqAbs + 1 ) * sign;
		trq   = Math.round ( trq * 10 ) / 10;
		
		fncGauges ( { do: 		'set-gauges',
					  position:	deg,
					  velocity:	vel,
					  torque:	trq,
					  torqueLg:	trqLg } ); 
	}	//	updateGauges()

	chainLink ( i ) {
		//	The  previous link (base if i is 0).
		let linkPrv = this.c0c0.children[i-1];
		let Lprv = new THREE.Matrix4();
		Lprv.copy ( linkPrv.matrix );

		let nLprv = new THREE.Matrix4();
		nLprv.getInverse ( Lprv );

		//	The link's position WRT base.
		let link = this.c0c0.children[i];
		let B = new THREE.Matrix4();
		B.copy ( link.matrix );

		//	The link's position WRT the previous link.
		let L = nLprv.multiply ( B );

		//	Remove the link from the current object tree.
		this.c0c0.children.splice ( i, 1 );

		//	Add it as a child to the previous link.
		link.matrix.identity();
		linkPrv.add ( link );

		//	Set it's position.
		let p = new THREE.Vector3();
		let q = new THREE.Quaternion();
		let s = new THREE.Vector3();
		L.decompose ( p, q, s );
		link.position.set ( p.x, p.y, p.z );
		link.setRotationFromQuaternion ( q );
		return link;
	}	//	chainLink()

	gatherBoundingBoxes ( iLink, link ) {
		const sW = 'App gatherBoundingBoxes()';
		let a = this.HiResBBs[iLink] = [];
		function cBB ( obj, mesh ) {
			a.push ( { obj:		obj,
					   mesh:	mesh,
					   helper:	null } );
			if ( obj ) {
				obj.children.forEach ( c => {
					if ( c.constructor.name === 'Object3D' ) {
						cBB ( c, null ); }
					if ( c.constructor.name === 'Mesh' ) {
						cBB ( null, c ); } } ); }

			if ( mesh ) {
				mesh.children.forEach ( c => {
					if ( c.constructor.name === 'Object3D' ) {
						cBB ( c, null ); }
					if ( c.constructor.name === 'Mesh' ) {
						cBB ( null, c ); } } ); }
		}
		cBB ( link, null );
		console.log ( 'a.length ' + a.length );
	}	//	gatherBoundingBoxes()

	createBoundingBox ( iLink, link, bbObjName ) {
		const sW = 'App createBoundingBox()';
		let a = this.HiResBBs[iLink];
		if ( ! Array.isArray ( a ) ) {
			return; }
		let o = a.find ( o => o.obj && o.obj.name === bbObjName );
		if ( ! o ) {
			return; }
		let linkObjForBB = o.obj;
		let bbox  = new THREE.Box3().setFromObject ( linkObjForBB );
		let helper = new THREE.Box3Helper ( bbox, 0 );
			helper.updateMatrixWorld ( true );
		let L2w = link.matrixWorld;
		let BBw = helper.matrixWorld;

		let nL2w = new THREE.Matrix4();
			nL2w.getInverse ( L2w );

		let BBl2 = nL2w.multiply ( BBw );

		//	Create a wireframe to represent the bounding box.
		let bbSize = new THREE.Vector3();
		bbox.getSize ( bbSize );
		console.log ( sW + ': bbSize ' + bbSize.x
						 + '  ' + bbSize.y
						 + '  ' + bbSize.z );
		let w = bbSize.x, l = bbSize.z, h = bbSize.y;
		let color = new THREE.Color ( 1, 1, 1 );
		let wf = this.createCop ( null, w, l, h, null, color );

		//	Add it as a child to the link.
		wf.matrix.identity();
		wf.scale.set ( 10, 10, 10 );		//	Note scale.
		link.add ( wf );

		//	Set it's position.
		let p = new THREE.Vector3();
		let q = new THREE.Quaternion();
		let s = new THREE.Vector3();
		BBl2.decompose ( p, q, s );
		wf.position.set ( p.x, p.y, p.z );
		wf.setRotationFromQuaternion ( q );
	}	//	createBoundingBox()

	getLinks ( grp ) {
		const sW = 'App getLinks()';
		let c0    = grp.children[0];
		this.c0c0  = c0.children[0];
		
		Dexter.HiRes.base = this.c0c0.children[0];

		Dexter.HiRes.link7 = this.chainLink ( 7 );
		Dexter.HiRes.link6 = this.chainLink ( 6 );
		Dexter.HiRes.link5 = this.chainLink ( 5 );
		Dexter.HiRes.link4 = this.chainLink ( 4 );
		Dexter.HiRes.link3 = this.chainLink ( 3 );
		Dexter.HiRes.link2 = this.chainLink ( 2 );
		Dexter.HiRes.link1 = this.chainLink ( 1 );

		//	Link 7 position.x will open/close the gripper (move the finger).
		//	x = -0.5		appears to be fully open
		//	x =  0.02		fully closed
		let l7 = Dexter.HiRes.link7;
		
		//	Likewise finger positon.x. However the sign is changed and the
		//	values are slightly different. Since 0 here is fully closed this
		//	finger object is used in this app.
		//	x = 0.5		appears to be fully open
		//	x = 0.0		fully closed
		Dexter.HiRes.finger = l7.children[0].children[0].children[0];


		//	Bounding boxes.
		//	All bounding boxes from the link and its children.
		this.gatherBoundingBoxes ( 0, Dexter.HiRes.base );
		//	Default bounding box for the link.
		this.createBoundingBox ( 0, Dexter.HiRes.base, 
								 'DexterHDI_Link1_KinematicAssembly_v1' );

		this.gatherBoundingBoxes ( 1, Dexter.HiRes.link1 );
		this.createBoundingBox ( 1, Dexter.HiRes.link1, 
								 'HDI-210-001_MainPivot_v461' );

		this.gatherBoundingBoxes ( 2, Dexter.HiRes.link2 );
		this.createBoundingBox ( 2, Dexter.HiRes.link2, 
								 'DexterHDI_Link2_KinematicAssembly_v5' );

		this.gatherBoundingBoxes ( 3, Dexter.HiRes.link3 );
		this.createBoundingBox ( 3, Dexter.HiRes.link3, 
								 'HDI_L3Skins_v541' );

		this.gatherBoundingBoxes ( 4, Dexter.HiRes.link4 );
		this.createBoundingBox ( 4, Dexter.HiRes.link4, 
								 'HDI_DiffSkins_v371' );

		this.gatherBoundingBoxes ( 5, Dexter.HiRes.link5 );
		this.createBoundingBox ( 5, Dexter.HiRes.link5, 
								 'HDI-950-000_GripperCover_v91' );

		this.gatherBoundingBoxes ( 6, Dexter.HiRes.link6 );
		this.createBoundingBox ( 6, Dexter.HiRes.link6, 
								 '' );	//	none, for now

		//	Fingers?
		//	For now.
		this.gatherBoundingBoxes ( 7, Dexter.HiRes.link7 );
		this.createBoundingBox ( 7, Dexter.HiRes.link7, 
								 'DexterHDI_Link7_KinematicAssembly_v21' );

	//	this.gatherBoundingBoxes ( Dexter.HiRes.link7,
	//							'' );

	}	//	getLinks()

	render3D ( time ) {
		const sW = 'App render3D()';

		if ( this.resizeRendererToDisplaySize() ) {
			this.camera.aspect =   this.canvas.clientWidth 
								 / this.canvas.clientHeight;
			this.camera.updateProjectionMatrix(); }

		let deltaTime = this.clock.getDelta() / 1000;

		let qd = [];		//	Joint target values.
		qd.push ( this.jt['J1'].value );
		qd.push ( this.jt['J2'].value );
		qd.push ( this.jt['J3'].value );
		qd.push ( this.jt['J4'].value );
		qd.push ( this.jt['J5'].value );
		let bInverseDynamics = true;
	//	let bInverseDynamics = false;
		let jc = [];		//	Joint current values.
		let jv = [];		//	Joint velocities.
		let jt = [];		//	Joint applied torques.
		let ground = {};
		let blocks = [];
		dynamics.stepSimulation ( deltaTime, qd, bInverseDynamics, jc,
								  this.kp, this.kd, jv, jt, ground, blocks );
		
		let jvAbsMax = 0;

		if ( jc.length > 0 ) {
			let axis = this.jt['J1'].axis;
			sim.J1.rotation[axis] = jc[0]; 
			if ( Dexter.HiRes.link1 && this.bHiResMoveEnabled ) {
				Dexter.HiRes.link1.rotation[axis] = jc[0]; }
			let a = Math.abs ( jv[0] );
			if ( a > jvAbsMax ) {
				jvAbsMax = a; }
			this.updateGauges ( this.fncJoint1Gauges, jc[0], jv[0], jt[0] ); }
		if ( jc.length > 1 ) {
			let axis = this.jt['J2'].axis;
			sim.J2.rotation[axis] = jc[1]; 
			if ( Dexter.HiRes.link2 && this.bHiResMoveEnabled ) {
				Dexter.HiRes.link2.rotation[axis] = jc[1]; }
			let a = Math.abs ( jv[1] );
			if ( a > jvAbsMax ) {
				jvAbsMax = a; }
			this.updateGauges ( this.fncJoint2Gauges, jc[1], jv[1], jt[1] ); }
		if ( jc.length > 2 ) {
			let axis = this.jt['J3'].axis;
			sim.J3.rotation[axis] = jc[2]; 
			if ( Dexter.HiRes.link3 && this.bHiResMoveEnabled ) {
				Dexter.HiRes.link3.rotation[axis] = jc[2]; }
			let a = Math.abs ( jv[2] );
			if ( a > jvAbsMax ) {
				jvAbsMax = a; }
			this.updateGauges ( this.fncJoint3Gauges, jc[2], jv[2], jt[2] ); }
		if ( jc.length > 3 ) {
			let axis = this.jt['J4'].axis;
			sim.J4.rotation[axis] = jc[3]; 
			if ( Dexter.HiRes.link4 && this.bHiResMoveEnabled ) {
				Dexter.HiRes.link4.rotation[axis] = jc[3]; }
			let a = Math.abs ( jv[3] );
			if ( a > jvAbsMax ) {
				jvAbsMax = a; }
			this.updateGauges ( this.fncJoint4Gauges, jc[3], jv[3], jt[3] ); }
		if ( jc.length > 4 ) {
			let axis = this.jt['J5'].axis;
			sim.J5.rotation[axis] = jc[4]; 
			if ( Dexter.HiRes.link5 && this.bHiResMoveEnabled ) {
				Dexter.HiRes.link5.rotation[axis] = jc[4]; }
			let a = Math.abs ( jv[4] );
			if ( a > jvAbsMax ) {
				jvAbsMax = a; }
			this.updateGauges ( this.fncJoint5Gauges, jc[4], jv[4], jt[4] ); }

		let self = this;
		if ( self.ground && ground.ammoQ && ground.ammoP ) {
			let q = new THREE.Quaternion();
			let a = ground.ammoQ.getAxis();
			let v = new THREE.Vector3 ( a.x(), a.y(), a.z() );
			q.setFromAxisAngle ( v, ground.ammoQ.getAngle() ); 
			let p = new THREE.Vector3 ( ground.ammoP.x(), 
										ground.ammoP.y(), 
										ground.ammoP.z() );
			self.ground.position.set ( p.x, p.y, p.z );
			self.ground.setRotationFromQuaternion ( q ); }
		blocks.forEach ( b => {
			let q = new THREE.Quaternion();
			let a = b.ammoQ.getAxis();
			let v = new THREE.Vector3 ( a.x(), a.y(), a.z() );
			q.setFromAxisAngle ( v, b.ammoQ.getAngle() ); 
			let p = new THREE.Vector3 ( b.ammoP.x(), b.ammoP.y(), b.ammoP.z() );
			let block = self.blocks[b.name];
			if ( block ) {
				block.position.set ( p.x, p.y, p.z );
				block.setRotationFromQuaternion ( q ); } } );
		
		dynamics.getCollisionObjectPositions().forEach ( cop => {
			let obj = self.cops[cop.name];
			if ( ! obj ) {
				obj = self.createCop ( self.scene, cop.w, cop.l, cop.h );
				self.cops[cop.name] = obj; }
			let q = new THREE.Quaternion();
			let v = new THREE.Vector3 ( cop.qx, cop.qy, cop.qz );
			q.setFromAxisAngle ( v, cop.qa );
			obj.position.set ( cop.px, cop.py, cop.pz );
			obj.setRotationFromQuaternion ( q ); 
			if ( cop.name.startsWith ( 'block-' ) ) {
				let block = self.blocks[cop.name];
				if ( block ) {
					block.position.set ( cop.px, cop.py, cop.pz );
					block.setRotationFromQuaternion ( q ); } }
		} );

		if ( jc.length > 0 ) {
			this.renderer3D.render ( this.scene, this.camera ); }
		
		//	To slow things down, lesson the log, for debugging set this 
		//	timeout delay to non-0.
		window.setTimeout ( () => {
			window.requestAnimationFrame ( this.render3D );
		}, 0 );

		if (  this.jvAbsMax.length < 10 ) {
			this.jvAbsMax.push ( jvAbsMax ); }
		else {
			this.jvAbsMax.shift();
			this.jvAbsMax.push ( jvAbsMax ); 
			if ( this.v0CB ) {
			//	let avg = 0;
			//	this.jvAbsMax.forEach ( v => avg += v );
			//	avg /= this.jvAbsMax.length;
			//	if ( avg <= this.v0CB.v0 ) {
				let max = 0;
				this.jvAbsMax.forEach ( v => { 
					if ( v > max ) {
						max = v; } } );
				console.log ( sW + ': is ' + this.v0CB.is
								 + '  max ' + max 
								 + '  v0 ' + this.v0CB.v0 );
				if ( max <= this.v0CB.v0 ) {
					this.v0CB.cb(); } } }
	}	//	render3D()

	doAll ( o ) {
		const sW = 'App doAll() do: ' + o.do;
		console.log ( sW ); 
		switch ( o.do ) {
			case 'set-call-down':
				switch ( o.what ) {
					case 'Controls':
						this.fncControls = o.fnc;
						break;
					case 'Joint 1':		//	JointData title.
						this.fncJoint1Gauges = o.fnc;
						break;
					case 'Joint 2':
						this.fncJoint2Gauges = o.fnc;
						break;
					case 'Joint 3':
						this.fncJoint3Gauges = o.fnc;
						break;
					case 'Joint 4':
						this.fncJoint4Gauges = o.fnc;
						break;
					case 'Joint 5':
						this.fncJoint5Gauges = o.fnc;
						break;
					default:
						console.error ( sW + ': unrecognized o.what' );
				}
				break;

			case 'run-script':
				this.runScript ( o );
				break;

			case 'cycle-bounding-box':
				this.cycleBoundingBox ( o );
				break;

			case 'add-to-scene':
				this.scene.add ( o.obj );
				this.renderer3D.render ( this.scene, this.camera ); 
				this.getLinks ( o.obj );
				break;

			case 'show-low-res':
				sim.J0.visible = o.bShow;
				break;
				
			default:
				console.error ( sW + ': unrecognized do' );
		}
		return null;
	}	//	doAll()

	render() {
		return (
			<div style = { { margin: 			'0px',
							 height:			'100%',
							 display:			'grid',
							 gridTemplateRows:	'300px 1fr' } } >
				<div style = { { display:				'grid',
					 gridTemplateColumns:   '114px 182px 182px 182px 182px '
										  + '182px' } } >
					<Controls title = 'Controls'
							  fncApp = { this.doAll } />
					<JointData title = 'Joint 1'
							   fncApp = { this.doAll } />
					<JointData title = 'Joint 2'
							   fncApp = { this.doAll } />
					<JointData title = 'Joint 3'
							   fncApp = { this.doAll } />
					<JointData title = 'Joint 4'
							   fncApp = { this.doAll } />
					<JointData title = 'Joint 5'
							   fncApp = { this.doAll } />
				</div>
				<div style = { { margin: 	'0px',
								 height:	'100%',
								 overflow:	'hidden' } } >
					<canvas id = 'd1-canvas'
							style = { { display:	'block',
										width:		'100%' } } />
				</div>
			</div>
		);
	}	//	render()

	componentDidMount() {
		const sW = 'App componentDidMount()';
		console.log ( sW );


//		let a = new Ammo().btVector3();
//		let Ammo = window.Ammo;
//		Ammo().then ( () => {
//			Ammo = window.Ammo;
//			let a = new Ammo.btVector3()
//		} );
		let self = this;
		dynamics.init().then ( status => {
			console.log ( sW + ': dynamics status: ' + status );

			dynamics.createEmptyDynamicsWorld();

		//	let Ammo = window.Ammo;
		//	let u = new Ammo.vecx ( 8 );
		//	u.set ( 2, 9.4 );
		//	let a = u.get ( 2 );
		//	console.log ( sW + ': a ' + a );

			dynamics.createMultiBody();

			self.ground = self.createGround ( self.scene );

			self.createBlocks ( self.scene );

		} );

		this.canvas = document.getElementById ( 'd1-canvas' );
		console.log ( this.canvas );

		this.renderer3D = new THREE.WebGLRenderer ( { canvas: 	 this.canvas,
													  antialias: true} );
		this.renderer3D.setSize ( this.canvas.clientWidth,
								  this.canvas.clientHeight, false );
		this.renderer3D.shadowMap.enabled = true;	

		this.fov	= 10;
		this.aspect	= 2;  // the canvas default
		this.near	= 0.01;
		this.far	= 100;
		this.camera = new THREE.PerspectiveCamera ( this.fov,  
													this.aspect,  
													this.near,  
													this.far);
		this.camera.position.set ( 2, 2.5, 7 );

		this.controls = new OrbitControls ( this.camera, this.canvas );
		this.controls.target.set ( -0.3, 0.3, 0 );
		this.controls.update();

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color ( 'darkgreen' );
	
	//	const gui = new GUI();
	//	const gui = new GUI ( { autoPlace: false } );
	//	this.canvas.parentElement.append  ( gui.domElement );
		const gui = new GUI();
		gui.domElement.id = 'gui';

		function makeXYZGUI ( gui, vector3, name, onChangeFn ) {
			const folder = gui.addFolder ( name );
			folder.add ( vector3, 'x', -10, 10 )
				.onChange ( onChangeFn );
			folder.add ( vector3, 'y', 0, 10 )
				.onChange ( onChangeFn );
			folder.add ( vector3, 'z', -10, 10 )
				.onChange ( onChangeFn );
		//	folder.open();
		}

		//	Floor (or Table, or Plane)
		//
		const loader = new THREE.TextureLoader();
		loader.load ( 'checker.png', texture => {
			const planeSize = 2;
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.magFilter = THREE.NearestFilter;
			const repeats = planeSize * 5;
			texture.repeat.set ( repeats, repeats );

			let a = planeSize;
			const planeGeo = new THREE.PlaneBufferGeometry ( a, a );
			const planeMat = new THREE.MeshPhongMaterial ( { 
											map:	texture,
											side:	THREE.DoubleSide } );
			const mesh = new THREE.Mesh ( planeGeo, planeMat );
			mesh.rotation.x = Math.PI * -.5;
			mesh.receiveShadow = true;
			this.scene.add ( mesh );
		} ); 

		//	Ambient Light
		//
		{	const color = 0xFFFFFF;
			const intensity = 0.75;
		//	const intensity = 0.35;		//	To see the helpers easier.
		//	const intensity = 0.60;		//	To see the helpers easier.
			const light = new THREE.AmbientLight ( color, intensity );
			this.scene.add ( light ); 

			const folder = gui.addFolder ( 'Ambient Light' );
		//	folder.open();
			folder.addColor ( new ColorGUIHelper ( light, 'color' ), 'value' )
				.name ( 'color' );
			folder.add ( light, 'intensity', 0, 2, 0.01 ); }

		//	Directional Light
		//
		{ 	const color = 0xFFFFFF;
			const intensity = 0.5;
		//	const intensity = 0.35;		//	To see the helpers easier.
			const light = new THREE.DirectionalLight ( color, intensity );
			light.position.set ( 4, 4, 2 );
			light.target.position.set ( 0, 0, 0 );
			light.castShadow = true;
			this.scene.add ( light );
			this.scene.add ( light.target );

			light.shadow.camera.left	= -1.5;
			light.shadow.camera.right	=  1.5;
			light.shadow.camera.top		=  1.5;
			light.shadow.camera.bottom	= -1.5;

			let cameraHelper = null, helper = null;
		//	cameraHelper = new THREE.CameraHelper ( light.shadow.camera );
		//	this.scene.add ( cameraHelper );

		//	helper = new THREE.DirectionalLightHelper ( light );
		//	this.scene.add ( helper );
	
			function updateCamera() {
				//	Update the light target's matrixWorld because it's needed 
				//	by the helper
				light.target.updateMatrixWorld();
				if ( helper ) {
					helper.update(); }
				//	Update the light's shadow camera's projection matrix.
				light.shadow.camera.updateProjectionMatrix();
				//	And now update the camera helper we're using to show the 
				//	light's shadow camera.
				if ( cameraHelper ) {
					cameraHelper.update(); }
			}
			updateCamera();

			class DimensionGUIHelper {
				constructor ( obj, minProp, maxProp ) {
					this.obj = obj;
					this.minProp = minProp;
					this.maxProp = maxProp;
				}
				get value() {
					return this.obj[this.maxProp] * 2;
				}
				set value(v) {
					this.obj[this.maxProp] = v /  2;
					this.obj[this.minProp] = v / -2;
				}
			}

			class MinMaxGUIHelper {
				constructor ( obj, minProp, maxProp, minDif ) {
					this.obj = obj;
					this.minProp = minProp;
					this.maxProp = maxProp;
					this.minDif = minDif;
				}
				get min() {
					return this.obj[this.minProp];
				}
				set min(v) {
					this.obj[this.minProp] = v;
					this.obj[this.maxProp] = Math.max ( this.obj[this.maxProp], 
														v + this.minDif );
				}
				get max() {
					return this.obj[this.maxProp];
				}
				set max(v) {
					this.obj[this.maxProp] = v;
					this.min = this.min;  // this will call the min setter
				}
			}

			const folder = gui.addFolder ( 'Dirctional Light' );
		//	folder.open();
			folder.addColor ( new ColorGUIHelper ( light, 'color' ), 'value' )
				.name ( 'color' );
			folder.add ( light, 'intensity', 0, 2, 0.01 ); 

			makeXYZGUI ( folder, 
						 light.position, 'position', updateCamera );
			makeXYZGUI ( folder, 
						 light.target.position, 'target', updateCamera );
		
			//	subfolder
			const sf = folder.addFolder ( 'Shadow Camera' );
		//	sf.open();
			sf.add ( new DimensionGUIHelper ( light.shadow.camera, 'left', 
																   'right'), 
					 'value', 0.5, 10 )
				.name ( 'width' )
				.onChange ( updateCamera );
			sf.add ( new DimensionGUIHelper ( light.shadow.camera, 'bottom', 
																   'top'), 
					 'value', 0.5, 10 )
				.name ( 'height' )
				.onChange ( updateCamera );
			const minMaxGUIHelper = new MinMaxGUIHelper ( light.shadow.camera, 
														  'near', 'far', 0.1 );
			sf.add ( minMaxGUIHelper, 'min', 0.1, 50, 0.1 )
				.name ( 'near')
				.onChange ( updateCamera );
			sf.add ( minMaxGUIHelper, 'max', 0.1, 50, 0.1 )
				.name ( 'far')
				.onChange ( updateCamera );
			sf.add ( light.shadow.camera, 'zoom', 0.01, 1.5, 0.01 )
				.onChange ( updateCamera );
		}	//	Directional Light


		class KPKDGUIHelper {
			constructor ( app, v ) {
				this.app = app;
				this.v   = v;
			}
			get k() {
				let v = this.app[this.v];
				return v;
			}
			set k ( v ) {
				this.app[this.v] = v;
			}
		}	//	KPKDGUIHelper()


		//	kp, kd
		//
		let kpkdGUIHelper = null;
		let folder = gui.addFolder ( 'Kp, Kd' );
		folder.open();
		kpkdGUIHelper = new KPKDGUIHelper ( this, 'kp' );
	//	folder.add ( kpkdGUIHelper, 'k', 0, 1000, 700 ).name ( 'Kp' );
		folder.add ( kpkdGUIHelper, 'k', 0, 1000, 1 ).name ( 'Kp' );
		kpkdGUIHelper = new KPKDGUIHelper ( this, 'kd' );
	//	folder.add ( kpkdGUIHelper, 'k', 0,  100,  80 ).name ( 'Kd' );
		folder.add ( kpkdGUIHelper, 'k', 0,  100,  1 ).name ( 'Kd' );


		class JointGUIHelper {
			constructor ( app, joint ) {
				this.app   = app;
				this.joint = joint;
			//	this.axis  = axis;
			}
			get j() {
				let v = this.app.jt[this.joint].value;
				return v * 180 / Math.PI;
			}
			set j(v) {
				v *= Math.PI / 180;
				this.app.jt[this.joint].value = v;
			}
		}	//	JointGUIHelper()


		//	The robot.
		//
		//	The base/legs.
		//
		sim.J0 = new THREE.Object3D();
		sim.J0.position.y  = 0.06
		this.scene.add ( sim.J0 )

		this.draw_coord_frame ( sim.J0, 0.5 );

		let leg_length = Dexter.LEG_LENGTH;
		let leg_width  = leg_length / 6;
		this.draw_legs ( sim.J0, leg_width, leg_length );

		//	Joint 1
		//
		folder = gui.addFolder ( 'Joint Targets' );
		folder.open();
		let jointGUIHelper = null;
		let ctrl = null;

		sim.J1 = new THREE.Object3D();
		sim.J1.position.y  = 0.1;
		sim.J0.add ( sim.J1 );
		sim.LINK1_height  = Dexter.LINK1;
		sim.LINK1_width   = Dexter.LINK1_AVERAGE_DIAMETER;
		sim.LINK1         = this.draw_arm ( sim.J1, sim.LINK1_width, 
													sim.LINK1_height );
		this.draw_coord_frame ( sim.J1, 0.25 );
		this.jt['J1'] = { axis:	'y', value: 0, ctrl: null };
		jointGUIHelper = new JointGUIHelper ( this, 'J1' );
		ctrl = folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J1' );
		this.jt['J1'].ctrl = ctrl;

		//	Joint 2
		//
		sim.J2            = new THREE.Object3D()
		sim.J2.position.y = sim.LINK1_height / 2.0
		sim.LINK1.add ( sim.J2 )
		sim.LINK2_height  = Dexter.LINK2;
		sim.LINK2_width   = Dexter.LINK2_AVERAGE_DIAMETER;
		sim.LINK2         = this.draw_arm ( sim.J2, sim.LINK2_width, 
													sim.LINK2_height )
		this.draw_coord_frame ( sim.J2, 0.25 );
		this.jt['J2'] = { axis:	'z', value: 0 };
		jointGUIHelper = new JointGUIHelper ( this, 'J2' );
		ctrl = folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J2' );
		this.jt['J2'].ctrl = ctrl;

		//	Joint 3
		//
		sim.J3            = new THREE.Object3D();
		sim.J3.position.y = sim.LINK2_height / 2.0;
		sim.LINK2.add ( sim.J3 )
		sim.LINK3_height  = Dexter.LINK3;
		sim.LINK3_width   = Dexter.LINK3_AVERAGE_DIAMETER;
		sim.LINK3         = this.draw_arm ( sim.J3, sim.LINK3_width, 
													sim.LINK3_height );
		this.draw_coord_frame ( sim.J3, 0.25 );
		this.jt['J3'] = { axis:	'z', value: 0 };
		jointGUIHelper = new JointGUIHelper ( this, 'J3' );
		ctrl = folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J3' );
		this.jt['J3'].ctrl = ctrl;

		//	Joint 4
		//
		sim.J4            = new THREE.Object3D();
		sim.J4.position.y = sim.LINK3_height / 2.0;
		sim.LINK3.add ( sim.J4 );
		sim.LINK4_height  = Dexter.LINK4;
		sim.LINK4_width   = Dexter.LINK4_AVERAGE_DIAMETER;
		sim.LINK4         = this.draw_arm ( sim.J4, sim.LINK4_width, 
													sim.LINK4_height );
		this.draw_coord_frame ( sim.J4, 0.20 );
		this.jt['J4'] = { axis:	'z', value: 0 };
		jointGUIHelper = new JointGUIHelper ( this, 'J4' );
		ctrl = folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J4' );
		this.jt['J4'].ctrl = ctrl;

		//	Joint 5
		//	
		sim.J5            = new THREE.Object3D();
		sim.J5.position.y = sim.LINK4_height / 2.0;
		sim.J5.rotation.z = Math.PI / 2;
		sim.LINK4.add ( sim.J5 );
		sim.LINK5_height  = Dexter.LINK5 ;
		sim.LINK5_width   = Dexter.LINK5_AVERAGE_DIAMETER;
		sim.LINK5         = this.draw_arm ( sim.J5, sim.LINK5_width, 
													sim.LINK5_height );
		this.draw_coord_frame ( sim.J5, 0.15 );
		this.jt['J5'] = { axis:	'y', value: 0 };
		jointGUIHelper = new JointGUIHelper ( this, 'J5' );
		ctrl = folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J5' );
		this.jt['J5'].ctrl = ctrl;

		this.clock = new THREE.Clock();

 		window.requestAnimationFrame ( this.render3D );

	}	//	componentDidMount()


	componentWillUnmount() {
		const sW = 'App componentWillUnmount()';
		console.log ( sW );

	}	//	componentWillUnmount()

	componentDidUpdate ( prevProps ) {
		let sW = 'App componentDidUpdate()';
		console.log ( sW );

	}	//	componentDidUpdate()

}	//	class App 


export { App as default };
