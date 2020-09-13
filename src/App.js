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
import dynamics2			from './dynamics2';
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

class FingerGUIHelper {
	constructor ( app, finger ) {
		this.app	= app;
		this.finger	= finger;
	}
	get f() {
		let v = this.app.ee[this.finger].value;
		return v;
	}
	set f(v) {
		this.app.ee[this.finger].value = v;
	}
}	//	FingerGUIHelper()

class FingerPadMakerGUIHelper {
	constructor ( app, param ) {
		this.app   = app;
		this.param = param;
	}
	get p() {
		let v = this.app.fpm[this.param].value;
		return v;
	}
	set p(v) {
		this.app.fpm[this.param].value = v;
	}
}	//	FingerPadMakerGUIHelper()


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

		this.lookAtX = null;
		this.lookAtY = null;
		this.lookAtZ = null;
		this.lookFmX = null;
		this.lookFmY = null;
		this.lookFmZ = null;

		this.canvas	= null;

		this.scene	= null;

		this.gui	= null;

		this.ground = null;
		this.blocks	= {};

		this.light	= null;

		this.clock	= null;

		this.makeXYZGUI			= this.makeXYZGUI.bind ( this );
		this.create3dScene		= this.create3dScene.bind ( this );
		this.showCoordFrames	= this.showCoordFrames.bind ( this );
		this.showCOPs	= this.showCOPs.bind ( this );
		this.createFloor		= this.createFloor.bind ( this );
		this.createCamera		= this.createCamera.bind ( this );
		this.createAmbientLight	= this.createAmbientLight.bind ( this );
		this.createDirectionalLight	
								= this.createDirectionalLight.bind ( this );
		this.createKpKdControls	= this.createKpKdControls.bind ( this );
		this.createJointControls
								= this.createJointControls.bind ( this );
		this.createEndEffectorControls
								= this.createEndEffectorControls.bind ( this );
		this.createFingerPadControls
								= this.createFingerPadControls.bind ( this );
		this.createLoResDexter	= this.createLoResDexter.bind ( this );
		this.createGround		= this.createGround.bind ( this );
		this.createBlocks		= this.createBlocks.bind ( this );
		this.createBlock		= this.createBlock.bind ( this );
		this.createWireframe	= this.createWireframe.bind ( this );
		this.createCOP			= this.createCOP.bind ( this );

		this.draw_legs 			= this.draw_legs.bind ( this );
		this.draw_arm			= this.draw_arm.bind ( this );
		this.createCoordFrame	= this.createCoordFrame.bind ( this );

		this.moveCamera			= this.moveCamera.bind ( this );
		this.graspBlock			= this.graspBlock.bind ( this );
		this.releaseBlock		= this.releaseBlock.bind ( this );
		this.scriptStatement	= this.scriptStatement.bind ( this );
		this.stepScript			= this.stepScript.bind ( this );
		this.runScript			= this.runScript.bind ( this );
		this.cycleBoundingBox	= this.cycleBoundingBox.bind ( this );
		this.resizeRendererToDisplaySize
							= this.resizeRendererToDisplaySize.bind ( this );

	//	this.kp =  100;			//	Spring
	//	this.kp = 6500;			//	Spring
	//	this.kp =  400;			//	Spring
	//	this.kp =  880;			//	Spring
		this.kp =   70;			//	Spring

	//	this.kd =   20;			//	Damping
	//	this.kd =  150;			//	Damping
	//	this.kd =   80;			//	Damping
	//	this.kd =   60;			//	Damping
		this.kd = 1000;			//	Damping

		this.jt	= {};			//	Joint Target values.
		this.ee = {};			//	End Effector values.

		this.updateGauges		= this.updateGauges.bind ( this );

		this.chainLink			= this.chainLink.bind (this );
		this.gatherBoundingBoxes	= this.gatherBoundingBoxes.bind ( this );
		this.defineBoundingBox	= this.defineBoundingBox.bind ( this );
	//	this.createBoundingBox	= this.createBoundingBox.bind ( this );
		this.createFingerPad	= this.createFingerPad.bind ( this );
		this.attachFingerPad	= this.attachFingerPad.bind ( this );
		this.setTransparent		= this.setTransparent.bind ( this );
		this.castShadow			= this.castShadow.bind ( this );
		this.getLinks			= this.getLinks.bind ( this );

		this.render3D			= this.render3D.bind ( this );

		this.doAll				= this.doAll.bind ( this );

		this.fncControls = null;
		this.fncJoint1Gauges = null;
		this.fncJoint2Gauges = null;
		this.fncJoint3Gauges = null;
		this.fncJoint4Gauges = null;
		this.fncJoint5Gauges = null;
		this.fncJoint6Gauges = null;

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
		
		this.bLoResDynamicsEnabled	= false;
		this.bLoResStepSim			= false;;
		this.bCreateLoResDexter		= false;
		this.bLoResMoveEnabled		= false;

		this.bCreateStationaryFingerPad	= false;
		this.bGotStationaryFingerPad	= true;
		this.bCreateMovingFingerPad		= false;
		this.bGotMovingFingerPad		= true;
		this.mfpf						= 0.022;	//	Mvg Fgr Pad Fudge

		this.bHiResDynamicsEnabled	= true;
		this.bHiResStepSim			= true;
		this.bCreateHiResDexter		= true;
		this.bHiResMoveEnabled		= true;;

		this.bTransparentDexter		= false;

		this.bShowingCoordFrames	= false;
		this.coordFrames			= [];

		this.bShowingCOPs	= false;
		this.COPs 			= [];		//	Collision Object Position

		//	Finger Pad Maker
		this.fpm			= { wf: null };		//	WireFrame

		this.dropBlocksFrom = { x:	-0.5, 
								y:	 0.5, 
								z:	-0.5 };
		
		this.lastOlosLength = 0;
		
		//	Script statements.
		this.script = [
			{ j1:  46, j2: -76, j3: -28, j4:  20,  j5:  -4,	j6:  72, v0: 0.2 },
			{ camera: { atX: 0.49, atY: 0.03, atZ: -0.34,
						fmX: 1.12, fmY: 0.62, fmZ:  0.78 } },
			{ j1:  46, j2: -83, j3: -28, j4:  20,  j5:  -4,	j6:  72, v0: 0.2 },
			{ j1:  44, j2: -76, j3: -38, j4:  32,  j5:  -4,	j6:  72, v0: 0.2 },
			{ j1:  40, j2: -80, j3: -34, j4:  32,  j5:  -4,	j6:  72, v0: 0.2 },
			{ j1:  40, j2: -80, j3: -33, j4:  32,  j5:  -4,	j6:  69, v0: 0.2 },
			{ j1:  40, j2: -77, j3: -39, j4:  36,  j5:  -4,	j6:  69, v0: 0.2 },
			{ f: 0.50, v0: 0.2 },
			{ j1:  40, j2: -80, j3: -33, j4:  36,  j5:  -4,	j6:  69, v0: 0.2 },
			{ j1:  38, j2: -80, j3: -33, j4:  36,  j5:  -4,	j6:  69, v0: 0.2 },
			{ pause:	500 },
			{ f: 0.43, v0: 0.2 },
			{ pause:	500 },
			{ f: 0.38, v0: 0.2 },
			{ pause:	500 },
			{ f: 0.34, v0: 0.2 },
			{ pause:	500 },
			{ f: 0.30, v0: 0.2 },
		//	Should be contact on both pads. 
		//	Disable collision contact on pads, or/and block.
		//	Attach block to link 6.
		//	...
			{ grab: { blk: 'block-x', numContacts: 1, nAttempts: 10 } },

			//	Move up.
			{ j1:  38, j2: -77, j3: -33, j4:  36,  j5:  -4,	j6:  69, v0: 0.2 },
			{ camera: { atX: 0.11, atY: 0.22, atZ: -0.08,
						fmX: 3.75, fmY: 1.41, fmZ:  1.52 } },
			{ j1:  38, j2: -45, j3:  -90, j4: 45,  j5:  -4,	j6:  69, v0: 0.2 },
			{ j1:  38, j2: -25, j3: -125, j4: 60,  j5:  -4,	j6:  69, v0: 0.2 },
			{ camera: { atX:  0.15, atY: 0.20, atZ: -0.35,
						fmX: -3.13, fmY: 0.67, fmZ: -2.85 } },
			{ j1: 143, j2: -25, j3: -125, j4: 60,  j5:  -4,	j6:  69, v0: 0.2 },
			{ camera: { atX:  0.06, atY: 0.33, atZ: -0.36,
						fmX:  2.52, fmY: 1.67, fmZ: -4.94 } },
			{ j1: 135, j2: -63, j3: -39, j4:  60,  j5:  -4,	j6:  69, v0: 0.2 },
			{ f: 0.43, v0: 0.2 },
			{ release: { } },
		];
		this.iScript	= 0;		//	Script statement index

		this.grasping	= null;		//	Set to name of block when is block
									//	is grasped.
	}	//	constructor()

	makeXYZGUI ( parent, vector3, name, onChangeFn ) {
		const folder = parent.addFolder ( name );
		folder.add ( vector3, 'x', -10, 10 )
			.onChange ( onChangeFn );
		folder.add ( vector3, 'y', 0, 10 )
			.onChange ( onChangeFn );
		folder.add ( vector3, 'z', -10, 10 )
			.onChange ( onChangeFn );
	//	folder.open();
	}	//	makeXYZGUI()

	create3dScene() {
		this.canvas = document.getElementById ( 'd1-canvas' );
		console.log ( this.canvas );

		let self = this;
		function updateGui() {
			let oc = self.orbitControls;
			if ( ! oc ) {
				return; }
			if ( self.lookAtXCtrl ) { 
				self.lookAtXCtrl.setValue ( oc.target.x ); }
			if ( self.lookAtYCtrl ) { 
				self.lookAtYCtrl.setValue ( oc.target.y ); }
			if ( self.lookAtZCtrl ) { 
				self.lookAtZCtrl.setValue ( oc.target.getComponent ( 2 ) ); }
			let p = self.camera.position;
			if ( self.lookFmXCtrl ) {
				self.lookFmXCtrl.setValue ( p.x ) ; }
			if ( self.lookFmYCtrl ) {
				self.lookFmYCtrl.setValue ( p.y ) ; }
			if ( self.lookFmZCtrl ) {
				self.lookFmZCtrl.setValue ( p.z ) ; }
		}

		this.renderer3D = new THREE.WebGLRenderer ( { canvas: 	 this.canvas,
													  antialias: true} );
		this.renderer3D.setSize ( this.canvas.clientWidth,
								  this.canvas.clientHeight, false );
		this.renderer3D.shadowMap.enabled = true;	

		this.createCamera();

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color ( 'darkgreen' );
		this.scene.onBeforeRender = updateGui;
	}	//	create3dScene()

	showCoordFrames ( o ) {
		this.bShowingCoordFrames = o.bShow;
		this.coordFrames.forEach ( cf => cf.visible = o.bShow );
		//	The world origin is always visible. For now.
		this.coordFrames[0].visible = true;
	}	//	showCoordFrames()

	showCOPs ( o ) {
		this.bShowingCOPs = o.bShow;
		this.COPs.forEach ( cop => cop.visible = o.bShow );
	}	//	showCOPs()

	createFloor() {
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
	}	//	createFloor()

	createCamera() {
		this.fov	= 10;
		this.aspect	= 2;  // the canvas default
		this.near	= 0.01;
		this.far	= 100;
		this.camera = new THREE.PerspectiveCamera ( this.fov,  
													this.aspect,  
													this.near,  
													this.far);
	//	this.camera.position.set ( 2, 2.5, 7 );
	//	this.camera.position.set ( 2.11, 0.77, -0.46 );
	//	this.camera.position.set ( 2.13, 0.63, -0.89 );
	//	this.camera.position.set ( 2.38, 0.25,  0.00 );
	//	this.camera.position.set ( 1.41, 0.90,  0.00 );
	//	this.camera.position.set ( 2.10, 0.05,  0.00 );
		this.camera.position.set ( 2.68, 3.29,  5.18 );

		this.orbitControls = new OrbitControls ( this.camera, this.canvas );

	//	this.orbitControls.target.set ( -0.3, 0.3, 0 );
	//	this.orbitControls.target.set ( -0.07, 0.07, 0.12 );
	//	this.orbitControls.target.set (  0.02, 0.17, 0.06 );
	//	this.orbitControls.target.set (  0.00, 0.17, 0.00 );
	//	this.orbitControls.target.set (  0.00, 0.90, 0.00 );
	//	this.orbitControls.target.set (  0.00, 0.16, 0.00 );
		this.orbitControls.target.set ( -0.05, 0.36, -0.04 ); 

		this.orbitControls.update();

		const folder = this.gui.addFolder ( 'Camera' );
	//	folder.open();
		let target   = this.orbitControls.target;
		let position = this.camera.position;
		this.lookAtX = target.getComponent ( 0 );
		this.lookAtXCtrl = folder.add ( this, 'lookAtX', -5, 5, 0.01 )
			.name ( 'Look At X' ); 
		this.lookAtY = target.getComponent ( 1 );
		this.lookAtYCtrl = folder.add ( this, 'lookAtY', -5, 5, 0.01 )
			.name ( 'Look At Y' ); 
		this.lookAtZ = target.getComponent ( 2 );
		this.lookAtZCtrl = folder.add ( this, 'lookAtZ', -5, 5, 0.01 )
			.name ( 'Look At Z' ); 
		this.lookFmX = position.x;
		this.lookFmXCtrl = folder.add ( this, 'lookFmX', -10, 10, 0.01 )
			.name ( 'Look From X' ); 
		this.lookFmY = position.y;
		this.lookFmYCtrl = folder.add ( this, 'lookFmY', -10, 10, 0.01 )
			.name ( 'Look From Y' ); 
		this.lookFmZ = position.z;
		this.lookFmZCtrl = folder.add ( this, 'lookFmZ', -10, 10, 0.01 )
			.name ( 'Look From Z' ); 
	}	//	createCamera()

	createAmbientLight() {	
		const color = 0xFFFFFF;
		const intensity = 0.75;
	//	const intensity = 0.35;		//	To see the helpers easier.
	//	const intensity = 0.60;		//	To see the helpers easier.
		const light = new THREE.AmbientLight ( color, intensity );
		this.scene.add ( light ); 

		const folder = this.gui.addFolder ( 'Ambient Light' );
	//	folder.open();
		folder.addColor ( new ColorGUIHelper ( light, 'color' ), 'value' )
			.name ( 'color' );
		folder.add ( light, 'intensity', 0, 2, 0.01 ); 
	}	//	createAmbientLight()

	createDirectionalLight() {
	 	const color = 0xFFFFFF;
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

		const folder = this.gui.addFolder ( 'Dirctional Light' );
	//	folder.open();
		folder.addColor ( new ColorGUIHelper ( light, 'color' ), 'value' )
			.name ( 'color' );
		folder.add ( light, 'intensity', 0, 2, 0.01 ); 

		this.makeXYZGUI ( folder, 
						 light.position, 'position', updateCamera );
		this.makeXYZGUI ( folder, 
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
	}	//	createDirectionalLight()

	createKpKdControls() {
		//	kp, kd
		let kpkdGUIHelper = null;
		let folder = this.gui.addFolder ( 'Kp, Kd' );
		folder.open();
		kpkdGUIHelper = new KPKDGUIHelper ( this, 'kp' );
	//	folder.add ( kpkdGUIHelper, 'k', 0, 1000, 700 ).name ( 'Kp' );
		folder.add ( kpkdGUIHelper, 'k', 0, 1000, 1 ).name ( 'Kp' );
		kpkdGUIHelper = new KPKDGUIHelper ( this, 'kd' );
	//	folder.add ( kpkdGUIHelper, 'k', 0,  100,  80 ).name ( 'Kd' );
	//	folder.add ( kpkdGUIHelper, 'k', 0,  100,  1 ).name ( 'Kd' );
		folder.add ( kpkdGUIHelper, 'k', 0, 2000,  1 ).name ( 'Kd' );
	}	//	createKpKdControls()

	createJointControls() {
		let folder = this.gui.addFolder ( 'Joint Targets' );
		folder.open();
		let jointGUIHelper = null;
		let ctrl = null;

		this.jt['J1'] = { axis:	'y', value: 0, ctrl: null };
		jointGUIHelper = new JointGUIHelper ( this, 'J1' );
		ctrl = folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J1' );
		this.jt['J1'].ctrl = ctrl;

		this.jt['J2'] = { axis:	'z', value: 0 };
		jointGUIHelper = new JointGUIHelper ( this, 'J2' );
		ctrl = folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J2' );
		this.jt['J2'].ctrl = ctrl;

		this.jt['J3'] = { axis:	'z', value: 0 };
		jointGUIHelper = new JointGUIHelper ( this, 'J3' );
		ctrl = folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J3' );
		this.jt['J3'].ctrl = ctrl;

		this.jt['J4'] = { axis:	'z', value: 0 };
		jointGUIHelper = new JointGUIHelper ( this, 'J4' );
		ctrl = folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J4' );
		this.jt['J4'].ctrl = ctrl;

		this.jt['J5'] = { axis:	'y', value: 0 };
		jointGUIHelper = new JointGUIHelper ( this, 'J5' );
		ctrl = folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J5' );
		this.jt['J5'].ctrl = ctrl;

		this.jt['J6'] = { axis:	'z', value: 0 };
		jointGUIHelper = new JointGUIHelper ( this, 'J6' );
		ctrl = folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J6' );
		this.jt['J6'].ctrl = ctrl;
	}	//	createJointControls()
	
	createEndEffectorControls() {
		let folder = this.gui.addFolder ( 'End Effector' );
		folder.open();
		let fingerGUIHelper = null;
		let ctrl = null;

		this.ee['Finger'] = { axis:	'x', value: 0.24, ctrl: null };
		fingerGUIHelper = new FingerGUIHelper ( this, 'Finger' );
		ctrl = folder.add ( fingerGUIHelper, 'f', 0, 0.5, 0.01 )
					 .name ( 'Finger' );
		this.ee['Finger'].ctrl = ctrl;
	}	//	createEndEffectorControls()

	createFingerPadControls() {
		let folder = this.gui.addFolder ( 'Create Finger Pad' );
		folder.close();
		let fpmGUIHelper = null;
		let ctrl = null;
		let self = this;

		function change ( v ) {
			let o = this.object;
			console.log ( 'FPM ' + o.param + ' ' + v );
			let fpm = o.app.fpm;
			if ( ! fpm.wf ) {
				return; }
			if ( o.param === 'x' || o.param === 'y' || o.param === 'z' ) {
				fpm.wf.position[o.param] = v; }
			if ( o.param === 'w' || o.param === 'h' || o.param === 'l' ) {
				let parent = fpm.wf.parent;
				parent.remove ( fpm.wf );
				fpm.wf = null;
				let def = { x: fpm.x.value, y: fpm.y.value, z: fpm.z.value,
							w: fpm.w.value, h: fpm.h.value, l: fpm.l.value };
				self.createFingerPad ( parent, def );
			} 
		}	//	change()

		this.fpm['x'] = { param:	'x', value: 0, ctrl: null };
		fpmGUIHelper = new FingerPadMakerGUIHelper ( this, 'x' );
		ctrl = folder.add ( fpmGUIHelper, 'p', -1, 1, 0.01 ).name ( 'X' );
		this.fpm['x'].ctrl = ctrl;
		ctrl.onChange ( change );

		this.fpm['y'] = { param:	'y', value: 0 };
		fpmGUIHelper = new FingerPadMakerGUIHelper ( this, 'y' );
		ctrl = folder.add ( fpmGUIHelper, 'p', -1, 1, 0.01 ).name ( 'Y' );
		this.fpm['y'].ctrl = ctrl;
		ctrl.onChange ( change );

		this.fpm['z'] = { param:	'z', value: 0 };
		fpmGUIHelper = new FingerPadMakerGUIHelper ( this, 'z' );
		ctrl = folder.add ( fpmGUIHelper, 'p', -1, 1, 0.01 ).name ( 'Z' );
		this.fpm['z'].ctrl = ctrl;
		ctrl.onChange ( change );

		this.fpm['w'] = { param:	'w', value: 0.01 };
		fpmGUIHelper = new FingerPadMakerGUIHelper ( this, 'w' );
		ctrl = folder.add ( fpmGUIHelper, 'p', 0, 0.02, 0.001 )
					 .name ( 'Width' );
		this.fpm['w'].ctrl = ctrl;
		ctrl.onChange ( change );

		this.fpm['h'] = { param:	'h', value: 0.03 };
		fpmGUIHelper = new FingerPadMakerGUIHelper ( this, 'h' );
		ctrl = folder.add ( fpmGUIHelper, 'p', 0, 0.04, 0.001 )
					 .name ( 'Height' );
		this.fpm['h'].ctrl = ctrl;
		ctrl.onChange ( change );

		this.fpm['l'] = { param:	'l', value: 0.08 };
		fpmGUIHelper = new FingerPadMakerGUIHelper ( this, 'l' );
		ctrl = folder.add ( fpmGUIHelper, 'p', 0, 0.10, 0.001 )
					 .name ( 'Length' );
		this.fpm['l'].ctrl = ctrl;
		ctrl.onChange ( change );
	}	//	createFingerPadControls()

	createLoResDexter() {
		//	The base/legs.
		sim.J0 = new THREE.Object3D();
		sim.J0.position.y  = 0.06
		this.scene.add ( sim.J0 )

		this.createCoordFrame ( sim.J0, 0.5 );

		let leg_length = Dexter.LEG_LENGTH;
		let leg_width  = leg_length / 6;
		this.draw_legs ( sim.J0, leg_width, leg_length );

		//	Joint 1
		//
		sim.J1 = new THREE.Object3D();
		sim.J1.position.y  = 0.1;
		sim.J0.add ( sim.J1 );
		sim.LINK1_height  = Dexter.LINK1;
		sim.LINK1_width   = Dexter.LINK1_AVERAGE_DIAMETER;
		sim.LINK1         = this.draw_arm ( sim.J1, sim.LINK1_width, 
													sim.LINK1_height );
		this.createCoordFrame ( sim.J1, 0.25 );

		//	Joint 2
		//
		sim.J2            = new THREE.Object3D()
		sim.J2.position.y = sim.LINK1_height / 2.0
		sim.LINK1.add ( sim.J2 )
		sim.LINK2_height  = Dexter.LINK2;
		sim.LINK2_width   = Dexter.LINK2_AVERAGE_DIAMETER;
		sim.LINK2         = this.draw_arm ( sim.J2, sim.LINK2_width, 
													sim.LINK2_height )
		this.createCoordFrame ( sim.J2, 0.25 );

		//	Joint 3
		//
		sim.J3            = new THREE.Object3D();
		sim.J3.position.y = sim.LINK2_height / 2.0;
		sim.LINK2.add ( sim.J3 )
		sim.LINK3_height  = Dexter.LINK3;
		sim.LINK3_width   = Dexter.LINK3_AVERAGE_DIAMETER;
		sim.LINK3         = this.draw_arm ( sim.J3, sim.LINK3_width, 
													sim.LINK3_height );
		this.createCoordFrame ( sim.J3, 0.25 );

		//	Joint 4
		//
		sim.J4            = new THREE.Object3D();
		sim.J4.position.y = sim.LINK3_height / 2.0;
		sim.LINK3.add ( sim.J4 );
		sim.LINK4_height  = Dexter.LINK4;
		sim.LINK4_width   = Dexter.LINK4_AVERAGE_DIAMETER;
		sim.LINK4         = this.draw_arm ( sim.J4, sim.LINK4_width, 
													sim.LINK4_height );
		this.createCoordFrame ( sim.J4, 0.20 );

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
		this.createCoordFrame ( sim.J5, 0.15 );
	}	//	createLoResDexter()

	createGround ( parent ) {
		let w = 2, l = 2, h = 1;
		let dyn = null;
	//	if ( this.bLoResDynamicsEnabled ) {
	//		dyn = dynamics; }
		if ( this.bHiResDynamicsEnabled ) {
			dyn = dynamics2; }
		if ( dyn ) {
			dyn.createGround ( w, l, h ); }
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
		let numBlocks = 23, iBlock = 0;
		let color = '833';
		function ernk ( dropFrom ) {
			//	Name 'block-a', 'block-b', 'block-c', ...
			let name = 'block-' 
				+ String.fromCharCode ( 'a'.charCodeAt ( 0 ) + iBlock );
			//	Cycle the colors red, green, blue, red, green, ...
			color = color.slice ( 1 ) + color.slice ( 0, 1 );
		//	let block = self.createBlock ( name, parent, 0.04, 0.04, 0.04, 
			let block = self.createBlock ( name, parent, 0.03, 0.03, 0.03, 
										   '#' + color, 
										   dropFrom );
			self.blocks[name] = block;
		}
		function next() {
			if ( iBlock >= numBlocks ) {
				ernk ( { x: 0.5, y: 0.1, z: -0.4 } );	//	one more
				return; }
			ernk ( self.dropBlocksFrom );
			iBlock += 1;
			window.setTimeout ( next, 100 ); }
		next();
	}	//	createBlocks()

	createBlock ( name, parent, w, l, h, color, dropFrom ) {
		let dyn = null;
	//	if ( this.bLoResDynamicsEnabled ) {
	//		dyn = dynamics; }
		if ( this.bHiResDynamicsEnabled ) {
			dyn = dynamics2; }
		if ( dyn ) {
			let p = dropFrom ? dropFrom : this.dropBlocksFrom;
			dyn.createBlock ( name, p.x, p.y, p.z, w, l, h ); }
		const geo = new THREE.BoxGeometry ( w, h, l );
		const mat = new THREE.MeshPhongMaterial ( 
			{ color: (typeof color === 'string') ? color: '#683' } );
		let block = new THREE.Mesh ( geo, mat );
			block.castShadow = true;
		parent.add ( block );
		this.blocks[name] = block;
		return block;
	}	//	createBlock()

	createWireframe ( geo ) {
		const wireframe	= new THREE.WireframeGeometry ( geo );
		const lines		= new THREE.LineSegments ( wireframe );
		return lines;
	}	//	createWireframe()

	createCOP ( parent, w, l, h, margin, color, bCF ) {
		w += (typeof margin === 'number') ? margin : 0.005;
		l += (typeof margin === 'number') ? margin : 0.005;
		h += (typeof margin === 'number') ? margin : 0.005;
		const geo	= new THREE.BoxGeometry ( w, h, l );
		const lines	= this.createWireframe ( geo );
		let mat	= lines.material;
		if ( color ) {
			mat.color = color; }
		else {
			mat.color		= new THREE.Color ( 1, 1, 1 ); 
			mat.depthTest	= true;
			mat.opacity		= 0.45;
			mat.transparent	= true; }
		if ( parent ) {
			parent.add ( lines ); }
		if ( (typeof bCF === 'boolean') && bCF ) {
			this.createCoordFrame ( lines, 0.03, 0.15, true ); }
		lines.visible = this.bShowingCOPs;
		this.COPs.push ( lines );
		return lines;;
	}	//	createCOP()
	
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

	createCoordFrame ( parent, scale, opacity, bWireframe, depthTest ) {
		let obj = new THREE.Object3D();
		let self = this;
		let radCyl = 0.02;
		let lenCyl = 1.0;
		let radCon = radCyl * 2.0;
		let hgtCon = radCyl * 3.0;
		let mtxScale = new THREE.Matrix4();
		mtxScale.makeScale ( scale, scale, scale );

		opacity		= (typeof opacity    === 'number')   ? opacity 
													     : 0;
		bWireframe	= (typeof bWireframe === 'boolean') && bWireframe;

		depthTest	= (typeof depthTest  === 'boolean') && depthTest;

		function arrow ( name, color, mtxCyl, mtxCon ) {
			let geo = null, mat = null, cylinder = null, cone = null;
			geo = new THREE.CylinderGeometry ( radCyl,		//	radiusTop
											   radCyl,		//	radiusBottom
											   lenCyl,		//	height
									bWireframe ? 4 : 8 );	//	radialSegments
			if ( bWireframe ) {
				const lines	= self.createWireframe ( geo );
				let mat = lines.material;
				mat.color = new THREE.Color ( color );
				if ( opacity ) {
					mat.depthTest	= depthTest;
					mat.opacity		= opacity;
					mat.transparent	= true; }
				lines.applyMatrix ( mtxCyl.multiply ( mtxScale ) );
				lines.name = 'Coord_Frame_' + name + '_Cylinder';
			//	parent.add ( lines ); }
				obj.add ( lines ); }
			else {
				mat = new THREE.MeshPhongMaterial ( { color: color } );
				if ( opacity ) {
					mat.depthTest	= depthTest;
					mat.opacity		= opacity;
					mat.transparent	= true; }
				cylinder = new THREE.Mesh ( geo, mat );
				cylinder.name = 'Coord_Frame_' + name + '_Cylinder';
				cylinder.applyMatrix ( mtxCyl.multiply ( mtxScale ) );
			//	parent.add ( cylinder ); }
				obj.add ( cylinder ); }

			geo    = new THREE.ConeGeometry ( radCon,		//	base radius
											  hgtCon,		//	height
									bWireframe ? 4 : 8 );	//	radialSegments
			if ( bWireframe ) {
				const lines	= self.createWireframe ( geo );
				let mat = lines.material;
				mat.color = new THREE.Color ( color );
				if ( opacity ) {
					mat.depthTest	= depthTest;
					mat.opacity		= opacity;
					mat.transparent	= true; }
				lines.applyMatrix ( mtxCon.multiply ( mtxScale ) );
				lines.applyMatrix ( mtxCon.multiply ( mtxScale ) );
			//	parent.add ( lines ); }
				obj.add ( lines ); }
			else {
				cone   = new THREE.Mesh ( geo, mat );
				cylinder.name = 'Coord_Frame_' + name + '_Cone';
				cone.applyMatrix ( mtxCon.multiply ( mtxScale ) );
			//	parent.add ( cone ); } }
				obj.add ( cone ); } }

		let vec = null, mtxCyl = null, mtxCon = null;

		mtxCyl = new THREE.Matrix4();
		mtxCyl.makeRotationZ ( -Math.PI / 2 );
		vec = new THREE.Vector3 ( lenCyl / 2, 0, 0 );
		mtxCyl.setPosition ( vec.multiplyScalar ( scale ) );
		mtxCon = new THREE.Matrix4();
		mtxCon.makeRotationZ ( -Math.PI / 2 );
		vec = new THREE.Vector3 ( lenCyl + (hgtCon / 2), 0, 0 );
		mtxCon.setPosition ( vec.multiplyScalar ( scale ) );
		arrow ( 'X', 0xFF0000, mtxCyl, mtxCon );
			
		mtxCyl = new THREE.Matrix4();
		vec = new THREE.Vector3 ( 0, lenCyl / 2, 0 );
		mtxCyl.setPosition ( vec.multiplyScalar ( scale ) );
		mtxCon = new THREE.Matrix4();
		vec = new THREE.Vector3 ( 0, lenCyl + (hgtCon / 2), 0 );
		mtxCon.setPosition ( vec.multiplyScalar ( scale ) );
		arrow ( 'Y', 0x00FF00, mtxCyl, mtxCon );
		
		mtxCyl = new THREE.Matrix4();
		mtxCyl.makeRotationX ( Math.PI / 2 );
		vec = new THREE.Vector3 ( 0, 0, lenCyl / 2 );
		mtxCyl.setPosition ( vec.multiplyScalar ( scale ) );
		mtxCon = new THREE.Matrix4();
		mtxCon.makeRotationX ( Math.PI / 2 );
		vec = new THREE.Vector3 ( 0, 0, lenCyl + (hgtCon / 2) );
		mtxCon.setPosition ( vec.multiplyScalar ( scale ) );
		arrow ( 'Z', 0x0000FF, mtxCyl, mtxCon );

		obj.visible = this.bShowingCoordFrames;
		parent.add ( obj );
		this.coordFrames.push ( obj );
		return obj;
	}	//	createCoordFrame()

	moveCamera ( to, cb ) {
		let atX = this.lookAtX;
		let atY = this.lookAtY;
		let atZ = this.lookAtZ;
		let fmX = this.lookFmX;
		let fmY = this.lookFmY;
		let fmZ = this.lookFmZ;

		let dAtx = to.atX - atX;
		let dAty = to.atY - atY;
		let dAtz = to.atZ - atZ;
		let dFmx = to.fmX - fmX;
		let dFmy = to.fmY - fmY;
		let dFmz = to.fmZ - fmZ
		let self = this;
		let nSteps = 80, i = 0;
		function next() {
			if ( i >= nSteps ) {
				if ( cb ) {
					cb(); }
				return; }
			atX += dAtx / nSteps;
			atY += dAty / nSteps;
			atZ += dAtz / nSteps;
			fmX += dFmx / nSteps;
			fmY += dFmy / nSteps;
			fmZ += dFmz / nSteps;
			self.orbitControls.target.set ( atX, atY, atZ ); 
			self.camera.position.set ( fmX, fmY, fmZ );
			self.orbitControls.update();
			i += 1;
			window.setTimeout ( next, 40 ); }
		next();
	}	//	moveCamera()

	graspBlock ( blkName ) {
		const sW = 'App graspBlock()';
		let block = this.blocks[blkName];
		if ( ! block ) {
			console.error ( sW + ': block not found' ); 
			return; }

		dynamics2.disableContactResponse ( 'link-6' );
		dynamics2.disableContactResponse ( 'finger' );
		dynamics2.disableContactResponse ( blkName );
		
		let L6w = Dexter.HiRes.link6.matrixWorld;	//	link6 wrt world
		let Bw  = block.matrixWorld;				//	block wrt world
		let nL6w = new THREE.Matrix4();
			nL6w.getInverse ( L6w );
		let B6 = nL6w.multiply ( Bw );		//	block wrt link6
	
		block.parent.remove ( block );

		let p = new THREE.Vector3();
		let q = new THREE.Quaternion();
		let s = new THREE.Vector3();
		B6.decompose ( p, q, s );
		block.position.set ( p.x, p.y, p.z );
		block.setRotationFromQuaternion ( q );
		block.scale.set ( 10, 10, 10 );
		
		Dexter.HiRes.link6.add ( block );

		this.grasping = blkName;
	}	//	graspBlock()

	releaseBlock ( blkName ) {
		const sW = 'App releaseBlock()';
		let block = this.blocks[blkName];
		if ( ! block ) {
			console.error ( sW + ': block not found' ); 
			return; }

		let p = new THREE.Vector3();
		let q = new THREE.Quaternion();
		let s = new THREE.Vector3();
		block.matrixWorld.decompose ( p, q, s );

		block.parent.remove();
		block.scale.set ( 1, 1, 1 );
	
		dynamics2.positionBlock ( blkName, p, q );

		dynamics2.enableContactResponse ( 'link-6' );
		dynamics2.enableContactResponse ( 'finger' );
		dynamics2.enableContactResponse ( blkName );

		this.scene.add ( block );
	
		this.grasping = null;
	}	//	releaseBlock()
	
	scriptStatement ( next ) {
		const sW = 'App scriptStatement()';
		let j1 = this.jt['J1'].ctrl;
		let j2 = this.jt['J2'].ctrl;
		let j3 = this.jt['J3'].ctrl;
		let j4 = this.jt['J4'].ctrl;
		let j5 = this.jt['J5'].ctrl;
		let j6 = this.jt['J6'].ctrl;
		let f  = this.ee['Finger'].ctrl;

		this.grab = null;

		if ( this.iScript >= this.script.length ) {
			this.v0CB = null;
			return; }
		let s = this.script[this.iScript];
		console.log ( JSON.stringify ( s ) );
		if ( s.camera ) {
			this.moveCamera ( s.camera, next );
			this.v0CB = null;
			this.jvAbsMax = [];
			this.iScript += 1;
			return; }
		if ( s.pause ) {
			if ( next ) {
				window.setTimeout ( next, s.pause ); }
			this.v0CB = null;
			this.jvAbsMax = [];
			this.iScript += 1;
			return; }
		if ( s.grab ) {
			this.grab = s.grab;
			this.grab.cb = next;
			this.iScript += 1;
			return; }
		if ( s.release ) {
			if ( ! this.grasping ) {
				console.error ( sW + ': not grasping' ); }
			else {
				this.releaseBlock ( this.grasping ); }
			this.iScript += 1;
			return; }
		if ( s.f ) {
			f.setValue ( s.f ); }
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
		if ( s.j6 ) {
			j6.setValue ( s.j6 ); }
		this.v0CB = { is: this.iScript, v0: s.v0, cb: next } 
		this.jvAbsMax = [];
		this.iScript += 1;
	}	//	scriptStatement()

	stepScript ( o ) {
		const sW = 'App stepScript()';
		console.log ( sW );
		this.scriptStatement ( () => {
			this.grab = null;
			this.v0CB = null } );	
	}	//	stepScript()

	runScript ( o ) {
		const sW = 'App runScript()';
		console.log ( sW );
		let self = this;
		function next() {
			self.scriptStatement ( next ); }
		next();
	}	//	runScript()

	cycleBoundingBox ( o ) {
		const sW = 'App cycleBoundingBox()';
		console.log ( sW );
		if ( (o.iLink < 0) || (o.iLink >= this.HiResBBs.length) ) {
			return; }
		let bbs = this.HiResBBs[o.iLink].bbs;
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
		if ( ! bb ) {
			return; }

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

		let link = this.HiResBBs[o.iLink].link;
		let lp   = link.getWorldPosition();
		let bbSize = new THREE.Vector3();
		bbox.getSize ( bbSize );
		console.log ( sW + ': bbSize ' + bbSize.x
						 + '  ' + bbSize.y
						 + '  ' + bbSize.z );
		console.log ( sW + ': link pos wrt world ' + lp.x 
											+ '  ' + lp.y 
											+ '  ' + lp.z );
		let p = bb.helper.position;
		console.log ( sW + ': bb   pos wrt world ' + p.x 
											+ '  ' + p.y 
											+ '  ' + p.z );
		let q = bb.helper.quaternion;
		console.log ( sW + ':  q ' + q.x + '  ' + q.y + '  ' + q.z );

		//	bb wrt to link
		let Lw = link.matrixWorld;			//	link wrt world
		let BBw = bb.helper.matrixWorld;	//	box wrt world
		let nLw = new THREE.Matrix4();
			nLw.getInverse ( Lw );
		let BBl = nLw.multiply ( BBw );		//	box wrt link
		p = BBl.getPosition();
		console.log ( sW + ': bb   pos wrt link  ' + p.x 
											+ '  ' + p.y 
											+ '  ' + p.z );
		this.HiResBB = bb; 
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

		if ( needResize ) {
			this.renderer3D.setSize ( width, height, false ); }
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
		this.HiResBBs[iLink] = { link: 	link,
								 bbs:	[] };
		let a = this.HiResBBs[iLink].bbs;
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

	defineBoundingBox ( iLink, link, bbObjName ) {
		const sW = 'App defineBoundingBox()';
		let a = this.HiResBBs[iLink].bbs;
		if ( ! Array.isArray ( a ) ) {
			return; }
		let o = a.find ( o => o.obj && o.obj.name === bbObjName );
		if ( ! o ) {
			return; }
		let linkObjForBB = o.obj;
		let bbox  = new THREE.Box3().setFromObject ( linkObjForBB );
		let helper = new THREE.Box3Helper ( bbox, 0 );
			helper.updateMatrixWorld ( true );
		let Lw = link.matrixWorld;			//	link wrt world
		let BBw = helper.matrixWorld;		//	box wrt world

		let nLw = new THREE.Matrix4();
			nLw.getInverse ( Lw );

		let BBl = nLw.multiply ( BBw );		//	box wrt link

		//	Create a wireframe to represent the bounding box.
		let bbSize = new THREE.Vector3();
		bbox.getSize ( bbSize );
		console.log ( sW + ': bbSize ' + bbSize.x
						 + '  ' + bbSize.y
						 + '  ' + bbSize.z );

		//	Instead of scaling when the wireframe is created multiply the
		//	dimensions by the scale here. Do this because the dynamics
		//	code needs the proper dimensions.
		return { posWrtLink:	BBl,
		//		 w:				bbSize.x * 10,
		//		 h:				bbSize.y * 10,
		//		 l:				bbSize.z * 10 };
				 w:				bbSize.x,
				 h:				bbSize.y,
				 l:				bbSize.z};
	}	//	defineBoundingBox()
	
	createBoundingBox ( link, def ) {
		let color = new THREE.Color ( 1, 1, 1 );
		let wf = this.createCOP ( null, def.w, def.l, def.h, null, color, 
								  false );	//	no coord frame

		//	Add it as a child to the link.
		wf.matrix.identity();
		wf.scale.set ( 10, 10, 10 );		//	Note scale.
		link.add ( wf );

		//	Set it's position.
		let p = new THREE.Vector3();
		let q = new THREE.Quaternion();
		let s = new THREE.Vector3();
		def.posWrtLink.decompose ( p, q, s );
		wf.position.set ( p.x, p.y, p.z );
		wf.setRotationFromQuaternion ( q );
	}	//	createBoundingBox()

	createFingerPad ( finger, def ) {
		const sW = 'App createFingerPad()';
		console.log ( sW + ': x ' + def.x
						 + '  y ' + def.y
						 + '  z ' + def.z
						 + '  w ' + def.w
						 + '  l ' + def.l
						 + '  h ' + def.h );
		let color = new THREE.Color ( 1, 1, 1 );
		let wf = this.createCOP ( null, def.w, def.l, def.h, 0, color, 
								  true );	//	with coord frame

		//	Add it as a child to the finger.
		wf.matrix.identity();
		wf.scale.set ( 10, 10, 10 );		//	Note scale.
		finger.add ( wf );

		//	Set it's position.
		wf.position.set ( def.x, def.y, def.z );

		this.fpm.wf = wf;
	}	//	createFingerPad()
	
	attachFingerPad ( finger, padName, def ) {
		let obj = new THREE.Object3D();
		obj.name = padName;
		const color	= new THREE.Color ( 0.2, 0.2, 0.9 );	//	blue?
		const geo	= new THREE.BoxGeometry ( def.w, def.h, def.l );
		const mat	= new THREE.MeshPhongMaterial ( { color: color } );
		mat.opacity		= 0.6;
		mat.transparent	= true;
		let pad = new THREE.Mesh ( geo, mat );
		pad.name = padName;
		pad.scale.set ( 10, 10, 10 );		//	Note scale.

	//	finger.add ( pad );
		obj.add ( pad );			//	Bounding box works better on Object3D.
		finger.add ( obj );

	//	pad.position.set ( def.x, def.y, def.z );
	//	return pad;
		obj.position.set ( def.x, def.y, def.z );
		return obj;
	}	//	attachFingerPad()
	
	setTransparent ( obj, opacity ) {
		if ( ! obj ) {
			return; }
		if ( obj.constructor.name === 'Mesh' ) {
			let mat = obj.material;
		//	mat.depthTest	= true;
			mat.opacity		= opacity;
			mat.transparent	= opacity > 0.99 ? false : true; }
		if ( ! Array.isArray ( obj.children ) ) {
			return; }
		let self = this;
		obj.children.forEach ( c => self.setTransparent ( c, opacity ) );
	}	//	setTransparent()

	castShadow ( obj ) {
		if ( ! obj ) {
			return; }
		if ( obj.constructor.name === 'Mesh' ) {
			obj.castShadow = true; }
		if ( ! Array.isArray ( obj.children ) ) {
			return; }
		let self = this;
		obj.children.forEach ( c => self.castShadow ( c ) );
	}	//	castShadow()

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

		if ( (! this.bHiResDynamicsEnabled) || (! this.bCreateHiResDexter) ) {
			return; }

		//	Dexter configuration, bounding box definition.
		let config = {}, bbDef = null, def = null;
		
		//	Bounding boxes.
		//	All bounding boxes from the link and its children.
		if ( this.bTransparentDexter ) {
			this.setTransparent ( Dexter.HiRes.base, 0.35 ); }
		
		this.castShadow ( Dexter.HiRes.base );
	
		this.createCoordFrame ( Dexter.HiRes.base, 0.50, 0.8, false );
		this.gatherBoundingBoxes ( 0, Dexter.HiRes.base );
		//	Default bounding box for the link.
	//	this.createBoundingBox ( 0, Dexter.HiRes.base, 
	//							 'DexterHDI_Link1_KinematicAssembly_v1' );
		bbDef = this.defineBoundingBox ( 0, Dexter.HiRes.base, 
								 'DexterHDI_Link1_KinematicAssembly_v1' );
	//	this.createBoundingBox ( Dexter.HiRes.base, bbDef );
		config.base = { obj:	Dexter.HiRes.base,
						bbDef:	bbDef };

		this.createCoordFrame ( Dexter.HiRes.link1, 0.50, 0.8, false );
		this.gatherBoundingBoxes ( 1, Dexter.HiRes.link1 );
	//	this.createBoundingBox ( 1, Dexter.HiRes.link1, 
	//							 'HDI-210-001_MainPivot_v461' );
		bbDef = this.defineBoundingBox ( 1, Dexter.HiRes.link1, 
								 'HDI-210-001_MainPivot_v461' );
		config.link1 = { obj:	Dexter.HiRes.link1,
						 bbDef:	bbDef };

		this.createCoordFrame ( Dexter.HiRes.link2, 0.50, 0.8, false );
		this.gatherBoundingBoxes ( 2, Dexter.HiRes.link2 );
	//	this.createBoundingBox ( 2, Dexter.HiRes.link2, 
	//							 'DexterHDI_Link2_KinematicAssembly_v5' );
		bbDef = this.defineBoundingBox ( 2, Dexter.HiRes.link2, 
								 'DexterHDI_Link2_KinematicAssembly_v5' );
		config.link2 = { obj:	Dexter.HiRes.link2,
						 bbDef:	bbDef };

		this.createCoordFrame ( Dexter.HiRes.link3, 0.50, 0.8, false );
		this.gatherBoundingBoxes ( 3, Dexter.HiRes.link3 );
	//	this.createBoundingBox ( 3, Dexter.HiRes.link3, 
	//							 'HDI_L3Skins_v541' );
		bbDef = this.defineBoundingBox ( 3, Dexter.HiRes.link3, 
								 'HDI_L3Skins_v541' );
		config.link3 = { obj:	Dexter.HiRes.link3,
						 bbDef:	bbDef };

		this.createCoordFrame ( Dexter.HiRes.link4, 0.50, 0.8, false );
		this.gatherBoundingBoxes ( 4, Dexter.HiRes.link4 );
	//	this.createBoundingBox ( 4, Dexter.HiRes.link4, 
	//							 'HDI_DiffSkins_v371' );
		bbDef = this.defineBoundingBox ( 4, Dexter.HiRes.link4, 
								 'HDI_DiffSkins_v371' );
		config.link4 = { obj:	Dexter.HiRes.link4,
						 bbDef:	bbDef };

		this.createCoordFrame ( Dexter.HiRes.link5, 0.50, 0.8, false );
		this.gatherBoundingBoxes ( 5, Dexter.HiRes.link5 );
	//	this.createBoundingBox ( 5, Dexter.HiRes.link5, 
	//							 'HDI-950-000_GripperCover_v91' );
		bbDef = this.defineBoundingBox ( 5, Dexter.HiRes.link5, 
							//	 'HDI-950-000_GripperCover_v91' );
								 'DexterHDI_Link5_KinematicAssembly_v2' );
		config.link5 = { obj:	Dexter.HiRes.link5,
						 bbDef:	bbDef };

		//	Link 6
		//
		if ( this.bGotStationaryFingerPad ) {
			//	Attach finger pads.
			//	These numbers were determined previously with the Finger Pad 
			//	controls and the createFingerPad() calls below.
			//	The stationary finger -
			def = { x:	 0.01,
					y:	 0.00,
					z:	-0.65,
					w:	 0.005,
					h:	 0.026,
					l:	 0.060 };
			this.attachFingerPad ( Dexter.HiRes.link6, 
								   'Stationary_Finger_Pad', def ); }
		this.gatherBoundingBoxes ( 6, Dexter.HiRes.link6 );
		this.createCoordFrame ( Dexter.HiRes.link6, 0.50, 0.8, false );
		if ( this.bCreateStationaryFingerPad ) {
			//	Finger pad for stationary finger.
			def = { x: this.fpm.x.value,
					y: this.fpm.y.value,
					z: this.fpm.z.value,
					w: this.fpm.w.value, 
					h: this.fpm.h.value,
					l: this.fpm.l.value };
			this.createFingerPad ( Dexter.HiRes.link6, def ); }
		if ( this.bGotStationaryFingerPad ) {
			bbDef = this.defineBoundingBox ( 6, Dexter.HiRes.link6, 
								 	 'Stationary_Finger_Pad' ); }
		else {
			bbDef = this.defineBoundingBox ( 6, Dexter.HiRes.link6, 
									 'CenterGripper_v11' ); }
		config.link6 = { obj:	Dexter.HiRes.link6,
						 bbDef:	bbDef,
					finger: { x: (this.ee.Finger.value + this.mfpf) / 10 } };

		//	Moving Finger
		//
		if ( this.bGotMovingFingerPad ) {
			def = { x:	-0.17, 
					y:	-0.03,
					z:	 0.36,
					w:	 0.005,
					h:	 0.026,
					l:	 0.060 };
			this.attachFingerPad ( Dexter.HiRes.finger, 
								   'Moving_Finger_Pad', def ); }
		//	Try this. Note that Dexter.HiRes.finger is set above.
		this.gatherBoundingBoxes ( 7, Dexter.HiRes.finger );
		this.createCoordFrame ( Dexter.HiRes.finger, 0.40, 0.8, false );
		if ( this.bCreateMovingFingerPad ) {
			def = { x: this.fpm.x.value,
					y: this.fpm.y.value,
					z: this.fpm.z.value,
					w: this.fpm.w.value, 
					h: this.fpm.h.value,
					l: this.fpm.l.value };
			this.createFingerPad ( Dexter.HiRes.finger, def ); }
		if ( this.bGotMovingFingerPad ) {
			bbDef = this.defineBoundingBox ( 7, Dexter.HiRes.finger, 
							'Moving_Finger_Pad' ); }
		else {
			bbDef = this.defineBoundingBox ( 7, Dexter.HiRes.finger, 
							'TI1-420-002_ParallelGripperDynamicFinger_v2' ); }
		Dexter.HiRes.finger.position.x = this.ee.Finger.value;
		//	The finger is not a direct child of link6. So ...
		let L6w = Dexter.HiRes.link6.matrixWorld;	//	link6 wrt world
		let Fw = Dexter.HiRes.finger.matrixWorld;	//	finger wrt world
		let nL6w = new THREE.Matrix4();
			nL6w.getInverse ( L6w );
		let Fl6 = nL6w.multiply ( Fw );		//	finger wrt link6
		config.finger = { obj:		Dexter.HiRes.finger,
						  posWrtParent:	Fl6.getPosition(),
						  bbDef:	bbDef };


	
		dynamics2.createMultiBody ( config ); 

		dynamics2.createJointMotors();

	}	//	getLinks()

	render3D ( time ) {
		const sW = 'App render3D()';

		if ( this.resizeRendererToDisplaySize() ) {
			this.camera.aspect =   this.canvas.clientWidth 
								 / this.canvas.clientHeight;
			this.camera.updateProjectionMatrix(); }

		let deltaTime = this.clock.getDelta();

		let qd = [];		//	Joint target values.
		qd.push ( this.jt['J1'].value );
		qd.push ( this.jt['J2'].value );
		qd.push ( this.jt['J3'].value );
		qd.push ( this.jt['J4'].value );
		qd.push ( this.jt['J5'].value );
		qd.push ( this.jt['J6'].value );

		//	Need to specify the moving finger position. Just push it on
		//	qd[].
	//	qd.push ( (this.ee['Finger'].value + this.mfpf) / 10 );
		//	Moving finger as a fixed link.
	//	qd.push (  this.ee['Finger'].value                   );
		qd.push ( (this.ee['Finger'].value + (2 * this.mfpf)) / 10 );

		let bInverseDynamics = true;
	//	let bInverseDynamics = false;
		let jc = [];		//	Joint current values.
		let jv = [];		//	Joint velocities.
		let jt = [];		//	Joint applied torques.
		let ground = {};
		let blocks = [];

		if ( this.bLoResDynamicsEnabled && this.bLoResStepSim ) {
			dynamics.stepSimulation ( deltaTime, qd, bInverseDynamics, jc,
									  this.kp, this.kd, jv, jt, ground, 
																blocks ); }
		if ( this.bHiResDynamicsEnabled && this.bHiResStepSim ) { 
		//	dynamics2.stepSimulation ( deltaTime, qd, bInverseDynamics, jc,
		//							   this.kp, this.kd, jv, jt, ground, 
		//														 blocks ); }
			dynamics2.stepSimulation2 ( deltaTime, qd, jc,
									    this.kp / 1000, 
										this.kd / 1000, 
										jv, jt, ground, blocks ); }

		if ( jc.length === 0 ) {
			jc.splice ( 0, 0, 0, 0, 0, 0, 0, 0, 0 );
			jv.splice ( 0, 0, 0, 0, 0, 0, 0, 0, 0 );
			jt.splice ( 0, 0, 0, 0, 0, 0, 0, 0, 0 ); } 

		let jvAbsMax = 0;

		if ( jc.length > 0 ) {
			let axis = this.jt['J1'].axis;
			if ( this.bLoResMoveEnabled ) {
				sim.J1.rotation[axis] = jc[0]; }
			if ( Dexter.HiRes.link1 && this.bHiResMoveEnabled ) {
				Dexter.HiRes.link1.rotation[axis] = jc[0]; }
			let a = Math.abs ( jv[0] );
			if ( a > jvAbsMax ) {
				jvAbsMax = a; }
			this.updateGauges ( this.fncJoint1Gauges, jc[0], jv[0], jt[0] ); }
		if ( jc.length > 1 ) {
			let axis = this.jt['J2'].axis;
			if ( this.bLoResMoveEnabled ) {
				sim.J2.rotation[axis] = jc[1]; }
			if ( Dexter.HiRes.link2 && this.bHiResMoveEnabled ) {
				Dexter.HiRes.link2.rotation[axis] = jc[1]; }
			let a = Math.abs ( jv[1] );
			if ( a > jvAbsMax ) {
				jvAbsMax = a; }
			this.updateGauges ( this.fncJoint2Gauges, jc[1], jv[1], jt[1] ); }
		if ( jc.length > 2 ) {
			let axis = this.jt['J3'].axis;
			if ( this.bLoResMoveEnabled ) {
				sim.J3.rotation[axis] = jc[2]; }
			if ( Dexter.HiRes.link3 && this.bHiResMoveEnabled ) {
				Dexter.HiRes.link3.rotation[axis] = jc[2]; }
			let a = Math.abs ( jv[2] );
			if ( a > jvAbsMax ) {
				jvAbsMax = a; }
			this.updateGauges ( this.fncJoint3Gauges, jc[2], jv[2], jt[2] ); }
		if ( jc.length > 3 ) {
			let axis = this.jt['J4'].axis;
			if ( this.bLoResMoveEnabled ) {
				sim.J4.rotation[axis] = jc[3]; }
			if ( Dexter.HiRes.link4 && this.bHiResMoveEnabled ) {
				Dexter.HiRes.link4.rotation[axis] = jc[3]; }
			let a = Math.abs ( jv[3] );
			if ( a > jvAbsMax ) {
				jvAbsMax = a; }
			this.updateGauges ( this.fncJoint4Gauges, jc[3], jv[3], jt[3] ); }
		if ( jc.length > 4 ) {
			let axis = this.jt['J5'].axis;
			if ( this.bLoResMoveEnabled ) {
				sim.J5.rotation[axis] = jc[4]; }
			if ( Dexter.HiRes.link5 && this.bHiResMoveEnabled ) {
				Dexter.HiRes.link5.rotation[axis] = jc[4]; }
			let a = Math.abs ( jv[4] );
			if ( a > jvAbsMax ) {
				jvAbsMax = a; }
			this.updateGauges ( this.fncJoint5Gauges, jc[4], jv[4], jt[4] ); }
		if ( jc.length > 5 ) {
			let axis = this.jt['J6'].axis;
			if ( Dexter.HiRes.link6 && this.bHiResMoveEnabled ) {
				Dexter.HiRes.link6.rotation[axis] = jc[5]; }
			let a = Math.abs ( jv[5] );
			if ( a > jvAbsMax ) {
				jvAbsMax = a; }
			this.updateGauges ( this.fncJoint6Gauges, jc[5], jv[5], jt[5] ); 

			axis = this.ee.Finger.axis;
			if ( Dexter.HiRes.finger && this.bHiResMoveEnabled ) {
				Dexter.HiRes.finger.position[axis] = this.ee.Finger.value; } }

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
			if ( b.name === self.grasping ) {
				return; }
			let q = new THREE.Quaternion();
			let a = b.ammoQ.getAxis();
			let v = new THREE.Vector3 ( a.x(), a.y(), a.z() );
			q.setFromAxisAngle ( v, b.ammoQ.getAngle() ); 
			let p = new THREE.Vector3 ( b.ammoP.x(), b.ammoP.y(), b.ammoP.z() );
			let block = self.blocks[b.name];
			if ( block ) {
				block.position.set ( p.x, p.y, p.z );
				block.setRotationFromQuaternion ( q ); } } );
		
		let dyn = null;
	//	if ( this.bLoResDynamicsEnabled ) {
	//		dyn = dynamics; }
		if ( this.bHiResDynamicsEnabled ) {
			dyn = dynamics2; }
		while ( dyn ) {
			let olos = [];
			dyn.getCollisionObjectPositions ( olos ).forEach ( cop => {
				let obj = self.cops[cop.name];
				if ( ! obj ) {
					obj = self.createCOP ( self.scene, cop.w, cop.l, cop.h,
										   null,		//	default margin
										   null,		//	default color
							cop.partOf === 'robot' );	//	with coord frame?
					self.cops[cop.name] = obj; }
				let q = new THREE.Quaternion();
				let v = new THREE.Vector3 ( cop.qx, cop.qy, cop.qz );
				q.setFromAxisAngle ( v, cop.qa );
				obj.position.set ( cop.px, cop.py, cop.pz );
				obj.setRotationFromQuaternion ( q ); 
			//	if ( cop.name.startsWith ( 'block-' ) ) {
			//		let block = self.blocks[cop.name];
			//		if ( block && (self.grasping !== cop.name) ) {
			//			block.position.set ( cop.px, cop.py, cop.pz );
			//			block.setRotationFromQuaternion ( q ); } }
			} ); 
			if ( olos.length !== this.lastOlosLength ) {
				this.lastOlosLength = olos.length;
				olos.forEach ( o => {
					if ( ! (   o.a.name.includes ( 'link-6' )
							|| o.b.name.includes ( 'link-6' )
							|| o.a.name.includes ( 'finger' )
							|| o.b.name.includes ( 'finger' )) ) {
						return; }
					console.log ( sW + ': olo ' + o.a.name  
										 + '  ' + o.b.name
										 + '  ' + o.numContacts );  } ); } 
		
			if ( this.grab ) {
				//	{ grab: { blk: 'block-x', numContacts: 1, cb; callback } }
				let g  = this.grab;
				if ( ! g.nAttempts ) {
					console.log ( 'out of grab attempts' );
					g.cb();
					break; }
				g.nAttempts -= 1;
				let l6 = null;
				let f  = null;
				for ( let i = 0; i < olos.length; i++ ) {
					let o = olos[i];
					if (   (! l6)
						&& (o.a.name === 'link-6')
						&& (o.b.name === g.blk)
						&& (o.numContacts >= g.numContacts ) ) {
						l6 = o; }
					if (   (! l6)
						&& (o.a.name === g.blk)
						&& (o.b.name === 'link-6')
						&& (o.numContacts >= g.numContacts ) ) {
						l6 = o; }
					if (   (! f)
						&& (o.a.name === 'finger')
						&& (o.b.name === g.blk)
						&& (o.numContacts >= g.numContacts ) ) {
						f = o; }
					if (   (! f)
						&& (o.a.name === g.blk)
						&& (o.b.name === 'finger')
						&& (o.numContacts >= g.numContacts ) ) {
						f = o; } 
					if ( l6 && f ) {
						this.graspBlock ( g.blk ); 
						g.cb();
						break; } } }
			break;
		}	//	while ( dyn )
		
		if ( jc.length > 0 ) {
			this.renderer3D.render ( this.scene, this.camera ); }
		
		//	To slow things down, lesson the log, for debugging set this 
		//	timeout delay to non-0.
		//	This is only for debugging.
	//	window.setTimeout ( () => {
	//		window.requestAnimationFrame ( this.render3D );
	//	}, 0 );
		window.requestAnimationFrame ( this.render3D );

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
				if ( this.v0CB.cb && (max <= this.v0CB.v0) ) {
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
					case 'Joint 6':
						this.fncJoint6Gauges = o.fnc;
						break;
					default:
						console.error ( sW + ': unrecognized o.what' );
				}
				break;

			case 'step-script':
				this.stepScript ( o );
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
				
			case 'is-transparent-dexter':
				return this.bTransparentDexter;
				break;

			case 'transparent-dexter':
				this.bTransparentDexter = o.bTransparent;
				this.setTransparent ( Dexter.HiRes.base, 
									  o.bTransparent ? 0.35 : 1.00 );
				break;
				
			case 'is-showing-coord-frames':
				return this.bShowingCoordinateFrames;
				break;
				
			case 'show-coord-frames':
				this.showCoordFrames ( o );
				break;
				
			case 'show-COPs':
				this.showCOPs ( o );
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
					 gridTemplateColumns:   '114px 152px 152px 152px 152px '
										  + '152px 152px' } } >
					<Controls title = 'Controls'
							  fncApp = { this.doAll }
						transparentDexter = { this.bTransparentDexter }
						showingCoordFrames = { this.bShowingCoordFrames } />
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
					<JointData title = 'Joint 6'
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

		let self = this;

		let dyn = null;
		let bCreateDexter = false;
	//	if ( this.bLoResDynamicsEnabled ) {
	//		dyn = dynamics; 
	//		bCreateDexter = this.bCreateLoResDexter; }
		if ( this.bHiResDynamicsEnabled ) {
			dyn = dynamics2; 
		//	bCreateDexter = this.bCreateHiResDexter; }
			bCreateDexter = false; }	//	after import
		if ( dyn ) {
			dyn.init().then ( status => {
				console.log ( sW + ': dynamics status: ' + status );
				dyn.createEmptyDynamicsWorld();
				if ( bCreateDexter ) {
					dyn.createMultiBody(); }
				//	Ground and blocks are involved in collisions.
				self.ground = self.createGround ( self.scene );
				self.createBlocks ( self.scene );
			} ); }

		this.gui = new GUI();
		this.gui.domElement.id = 'gui';

		this.create3dScene();

		//	World coordinate frame.
		let cf = this.createCoordFrame ( this.scene, 
										 0.30, 		//	scale
										 0.3, 		//	opacity
										 false,		//	not a wireframe
										 true );	//	do depth test
		cf.visible = true;		//	world coord frame always visible
	
		this.createFloor();

		this.createAmbientLight();

		this.createDirectionalLight();		//	Shadows

		this.createFingerPadControls();
		
		this.createKpKdControls();			//	Joint spring and damper

		this.createJointControls();
		
		this.createEndEffectorControls();
		
		if ( this.bCreateLoResDexter ) {
			this.createLoResDexter(); }

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
