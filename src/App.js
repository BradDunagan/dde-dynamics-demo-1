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

		this.cube	= null;

		this.light	= null;

		this.clock	= null;

		this.draw_legs 			= this.draw_legs.bind ( this );
		this.draw_arm			= this.draw_arm.bind ( this );
		this.draw_coord_frame	= this.draw_coord_frame.bind ( this );
		this.resizeRendererToDisplaySize
							= this.resizeRendererToDisplaySize.bind ( this );

	//	this.kp =  100;			//	Spring
		this.kp = 6500;			//	Spring
	//	this.kd =   20;			//	Damping
		this.kd =  150;			//	Damping

		this.jt	= {};			//	Joint target values.

		this.render3D = this.render3D.bind ( this );

	}	//	constructor()

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

	resizeRendererToDisplaySize() {
		const pixelRatio = window.devicePixelRatio;
		const width  = this.canvas.clientWidth  * pixelRatio | 0;
		const height = this.canvas.clientHeight * pixelRatio | 0;
		const needResize =    this.canvas.width !== width 
						   || this.canvas.height !== height;
		if ( needResize ) {
			this.renderer3D.setSize ( width, height, false );
		}
		return needResize;
	}

	doAll ( o ) {
		const sW = 'App doAll() do: ' + o.do;
	//	console.log ( sW ); 
		console.error ( sW + ' - unrecognized' );
	}	//	doAll()

	render3D ( time ) {
	//	time *= 0.001;
	//	this.cube.rotation.x = time;
	//	this.cube.rotation.y = time;

	//	this.renderer3D.render ( this.scene, this.camera );

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
	//	if ( qd[0] !== 0 ) {
	//		console.log ( 'break' ); }
		let bInverseDynamics = true;
		let jc = [];		//	Joint current values.
		dynamics.stepSimulation ( deltaTime, qd, bInverseDynamics, jc,
								  this.kp, this.kd );
		
		if ( jc.length > 0 ) {
			let axis = this.jt['J1'].axis;
			sim.J1.rotation[axis] = jc[0]; }
		if ( jc.length > 1 ) {
			let axis = this.jt['J2'].axis;
			sim.J2.rotation[axis] = jc[1]; }
		if ( jc.length > 2 ) {
			let axis = this.jt['J3'].axis;
			sim.J3.rotation[axis] = jc[2]; }
		if ( jc.length > 3 ) {
			let axis = this.jt['J4'].axis;
			sim.J4.rotation[axis] = jc[3]; }
		if ( jc.length > 4 ) {
			let axis = this.jt['J5'].axis;
			sim.J5.rotation[axis] = jc[4]; }
	
		if ( jc.length > 0 ) {
			this.renderer3D.render ( this.scene, this.camera ); }
		
		requestAnimationFrame ( this.render3D );
	}	//	render3D()

	render() {
		return (
			<div style = { { margin: 	'0px',
							 height:	'100%' } } >
				<canvas id = 'd1-canvas'
						style = { { display:	'block',
									width:		'100%',
									height:		'100%' } } />
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
		dynamics.init().then ( status => {
			console.log ( sW + ': dynamics status: ' + status );

			dynamics.createEmptyDynamicsWorld();

		//	let Ammo = window.Ammo;
		//	let u = new Ammo.vecx ( 8 );
		//	u.set ( 2, 9.4 );
		//	let a = u.get ( 2 );
		//	console.log ( sW + ': a ' + a );

			dynamics.createMultiBody();

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
		this.controls.target.set ( 0, 0.5, 0 );
		this.controls.update();

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color ( 'black' );
	
		const gui = new GUI();

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
		folder.add ( kpkdGUIHelper, 'k', 0, 8000, 80 ).name ( 'Kp' );
		kpkdGUIHelper = new KPKDGUIHelper ( this, 'kd' );
		folder.add ( kpkdGUIHelper, 'k', 0, 1000, 10 ).name ( 'Kd' );


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

		sim.J1 = new THREE.Object3D();
		sim.J1.position.y  = 0.1;
		sim.J0.add ( sim.J1 );
		sim.LINK1_height  = Dexter.LINK1;
		sim.LINK1_width   = Dexter.LINK1_AVERAGE_DIAMETER;
		sim.LINK1         = this.draw_arm ( sim.J1, sim.LINK1_width, 
													sim.LINK1_height );
		this.draw_coord_frame ( sim.J1, 0.25 );
		this.jt['J1'] = { axis:	'y', value: 0 };
		jointGUIHelper = new JointGUIHelper ( this, 'J1' );
		folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J1' );

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
		folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J2' );

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
		folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J3' );

		//	Joint 4
		//
		sim.J4            = new THREE.Object3D();
		sim.J4.position.y = sim.LINK3_height / 2.0;
		sim.LINK3.add ( sim.J4 );
		sim.LINK4_height  = Dexter.LINK4;
		sim.LINK4_width   = Dexter.LINK4_AVERAGE_DIAMETER;
		sim.LINK4         = this.draw_arm ( sim.J4, sim.LINK4_width, 
													sim.LINK4_height );
		this.draw_coord_frame ( sim.J4, 0.25 );
		this.jt['J4'] = { axis:	'z', value: 0 };
		jointGUIHelper = new JointGUIHelper ( this, 'J4' );
		folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J4' );

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
		this.draw_coord_frame ( sim.J5, 0.25 );
		this.jt['J5'] = { axis:	'y', value: 0 };
		jointGUIHelper = new JointGUIHelper ( this, 'J5' );
		folder.add ( jointGUIHelper, 'j', -180, 180, 1 ).name ( 'J5' );

		this.clock = new THREE.Clock();

 		requestAnimationFrame ( this.render3D );

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